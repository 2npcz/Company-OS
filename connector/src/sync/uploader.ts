import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { QueuedAttendanceEvent } from '../queue/localQueue.js';

export interface UploaderConfig {
  supabaseUrl: string;
  supabaseKey: string;
  organizationId: string;
}

export class SupabaseUploader {
  private client: SupabaseClient;
  private orgId: string;

  constructor(config: UploaderConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
    this.orgId = config.organizationId;
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
