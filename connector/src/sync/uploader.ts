import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { QueuedAttendanceEvent } from '../queue/localQueue.js';

export interface UploaderConfig {
  supabaseUrl: string;
  supabaseKey: string;
  organizationId: string;
  email?: string;
  password?: string;
}

export class SupabaseUploader {
  private client: SupabaseClient;
  private orgId: string;
  private config: UploaderConfig;

  constructor(config: UploaderConfig) {
    this.config = config;
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
    this.orgId = config.organizationId;
  }

  async authenticate(): Promise<void> {
    if (this.config.email && this.config.password) {
      const { error } = await this.client.auth.signInWithPassword({
        email: this.config.email,
        password: this.config.password,
      });
      if (error) {
        console.warn('[Uploader] Supabase authentication warning:', error.message);
      } else {
        console.log(`[Uploader] Authenticated successfully with Supabase as ${this.config.email}`);
      }
    }
  }

  async updateDeviceIp(deviceId: string, newIp: string): Promise<void> {
    try {
      await this.client
        .from('attendance_devices')
        .update({
          ip_address: newIp,
          connection_status: 'ONLINE',
          last_heartbeat_at: new Date().toISOString(),
          updated: new Date().toISOString(),
        })
        .eq('id', deviceId)
        .eq('organization_id', this.orgId);
      console.log(`[Uploader] Updated device ${deviceId} IP in Supabase to ${newIp}`);
    } catch (e: any) {
      console.warn(`[Uploader] Failed to update device IP in database:`, e.message);
    }
  }

  async uploadEvents(
    events: QueuedAttendanceEvent[]
  ): Promise<{ uploadedIds: string[]; failedIds: string[]; error?: string }> {
    if (events.length === 0) return { uploadedIds: [], failedIds: [] };

    try {
      // 1. Fetch current mappings for this organization to match employee_id
      const { data: mappings } = await this.client
        .from('device_user_mappings')
        .select('device_id, device_user_id, employee_id')
        .eq('organization_id', this.orgId);

      const mappingMap = new Map<string, string>();
      (mappings || []).forEach((m) => {
        mappingMap.set(`${m.device_id}:${m.device_user_id}`, m.employee_id);
        mappingMap.set(`*:${m.device_user_id}`, m.employee_id);
      });

      // 2. Prepare raw event payload rows
      const rows = events.map((ev) => {
        const matchedEmpId =
          (ev.deviceId && mappingMap.get(`${ev.deviceId}:${ev.deviceUserId}`)) ||
          mappingMap.get(`*:${ev.deviceUserId}`) ||
          null;

        return {
          organization_id: this.orgId,
          device_id: ev.deviceId || null,
          device_user_id: ev.deviceUserId,
          employee_id: matchedEmpId,
          event_timestamp: ev.eventTimestamp,
          event_type: ev.eventType || 'CHECK_IN',
          verification_method: ev.verificationMethod || 'FINGERPRINT',
          source: 'LOCAL_CONNECTOR',
          external_event_id: ev.externalEventId,
          raw_payload: ev.rawPayload || {},
          processed: false,
        };
      });

      // 3. Upsert into attendance_raw_events
      const { error: insertErr } = await this.client
        .from('attendance_raw_events')
        .upsert(rows, { onConflict: 'organization_id,device_id,external_event_id', ignoreDuplicates: true });

      if (insertErr) {
        throw insertErr;
      }

      const allIds = events.map((e) => e.externalEventId);

      // 4. Auto-process raw events into daily attendance sessions
      await this.processSessions();

      return { uploadedIds: allIds, failedIds: [] };
    } catch (e: any) {
      console.error('[Uploader] Error uploading attendance batch:', e?.message || e);
      return {
        uploadedIds: [],
        failedIds: events.map((e) => e.externalEventId),
        error: e?.message || String(e),
      };
    }
  }

  async processSessions(): Promise<void> {
    try {
      // Loop in batches of 200 until all unprocessed events are ingested
      while (true) {
        const { data: rawEvents, error: fetchErr } = await this.client
          .from('attendance_raw_events')
          .select('id, device_user_id, employee_id, event_timestamp, verification_method, employee:profiles!employee_id(id, name)')
          .eq('organization_id', this.orgId)
          .eq('processed', false)
          .not('employee_id', 'is', null)
          .order('event_timestamp', { ascending: true })
          .limit(200);

        if (fetchErr) {
          console.warn('[Uploader] Fetch unprocessed raw events error:', fetchErr.message);
          break;
        }

        if (!rawEvents || rawEvents.length === 0) {
          break;
        }

        // Group events by employee_id + local Asia/Dhaka date (YYYY-MM-DD)
        const groups = new Map<string, typeof rawEvents>();
        for (const ev of rawEvents) {
          const d = new Date(ev.event_timestamp);
          const dateYMD = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
          const key = `${ev.employee_id}:${dateYMD}`;
          const list = groups.get(key) || [];
          list.push(ev);
          groups.set(key, list);
        }

        for (const [key, evList] of groups.entries()) {
          const [employeeId, dateYMD] = key.split(':');
          const employeeName = (evList[0] as any)?.employee?.name || null;
          const timestamps = evList.map((e) => new Date(e.event_timestamp).getTime()).sort((a, b) => a - b);
          const earliestISO = new Date(timestamps[0]).toISOString();
          const latestISO =
            timestamps.length > 1 && timestamps[timestamps.length - 1] > timestamps[0]
              ? new Date(timestamps[timestamps.length - 1]).toISOString()
              : null;

          const { data: existingSession } = await this.client
            .from('attendance')
            .select('id, check_in, check_out, employee_name')
            .eq('organization_id', this.orgId)
            .eq('employee_id', employeeId)
            .eq('date', dateYMD)
            .maybeSingle();

          let targetSessionId = existingSession?.id;

          if (existingSession) {
            // Merge all timestamps together (existing check_in/out + current batch timestamps)
            const allTimes: number[] = [timestamps[0]];
            if (timestamps.length > 1) allTimes.push(timestamps[timestamps.length - 1]);
            if (existingSession.check_in) allTimes.push(new Date(existingSession.check_in).getTime());
            if (existingSession.check_out) allTimes.push(new Date(existingSession.check_out).getTime());
            allTimes.sort((a, b) => a - b);

            const mergedCheckIn = new Date(allTimes[0]).toISOString();
            const mergedCheckOut =
              allTimes.length > 1 && allTimes[allTimes.length - 1] > allTimes[0]
                ? new Date(allTimes[allTimes.length - 1]).toISOString()
                : null;

            const updates: any = {};
            if (!existingSession.employee_name && employeeName) {
              updates.employee_name = employeeName;
            }
            if (existingSession.check_in !== mergedCheckIn) {
              updates.check_in = mergedCheckIn;
            }
            if (existingSession.check_out !== mergedCheckOut) {
              updates.check_out = mergedCheckOut;
            }

            if (Object.keys(updates).length > 0) {
              updates.updated = new Date().toISOString();
              await this.client.from('attendance').update(updates).eq('id', existingSession.id);
            }
          } else {
            const { data: ins } = await this.client
              .from('attendance')
              .insert({
                organization_id: this.orgId,
                employee_id: employeeId,
                employee_name: employeeName,
                date: dateYMD,
                check_in: earliestISO,
                check_out: latestISO,
                status: 'PRESENT',
                duty_type: 'OFFICE',
                location: 'Biometric MB460 Terminal',
                remarks: `Ingested from Terminal (${evList[0].verification_method || 'FINGERPRINT'})`,
              })
              .select('id')
              .single();

            if (ins) targetSessionId = ins.id;
          }

          const eventIds = evList.map((e) => e.id);
          await this.client
            .from('attendance_raw_events')
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              session_id: targetSessionId || null,
            })
            .in('id', eventIds);
        }

        if (rawEvents.length < 200) {
          break;
        }
      }
    } catch (e) {
      console.warn('[Uploader] Session processing notice:', e);
    }
  }

  async sendHeartbeat(deviceId: string, status: 'ONLINE' | 'OFFLINE' | 'WARNING'): Promise<void> {
    try {
      await this.client
        .from('attendance_devices')
        .update({
          connection_status: status,
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq('id', deviceId)
        .eq('organization_id', this.orgId);
    } catch (e) {
      console.warn(`[Uploader] Failed to send heartbeat for device ${deviceId}:`, e);
    }
  }

  async recordSyncLog(data: {
    deviceId?: string;
    syncType: 'HEARTBEAT' | 'PULL_EVENTS' | 'PUSH_USERS' | 'MANUAL' | 'CONNECTOR_STATUS';
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    eventsReceived: number;
    eventsIngested: number;
    eventsDuplicate: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.client.from('attendance_sync_logs').insert({
        organization_id: this.orgId,
        device_id: data.deviceId || null,
        sync_type: data.syncType,
        status: data.status,
        events_received: data.eventsReceived,
        events_ingested: data.eventsIngested,
        events_duplicate: data.eventsDuplicate,
        error_message: data.errorMessage || null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[Uploader] Failed to insert sync log:', e);
    }
  }
}
