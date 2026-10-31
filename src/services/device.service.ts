import { supabase, isSupabaseConfigured } from './supabase';
import { apiClient, resolveOrgId } from './api.client';
import {
  AttendanceDevice,
  DeviceUserMapping,
  AttendanceRawEvent,
  AttendanceSyncLog,
  DeviceConnectionStatus,
  AttendanceEventType,
  BiometricVerificationMethod,
} from '../types';

let cachedDevices: AttendanceDevice[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

export const deviceService = {
  clearCache() {
    cachedDevices = null;
    lastCacheTime = 0;
  },

  // =========================================================================
  // 1. ATTENDANCE DEVICES
  // =========================================================================

  async getDevices(): Promise<AttendanceDevice[]> {
    if (cachedDevices && Date.now() - lastCacheTime < CACHE_TTL) {
      return cachedDevices;
    }
    if (!isSupabaseConfigured()) return [];

    const orgId = await resolveOrgId();
    try {
      let query = supabase
        .from('attendance_devices')
        .select('*')
        .order('name', { ascending: true });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DeviceService] attendance_devices query error (may not be migrated yet):', error.message);
        return [];
      }

      const devices: AttendanceDevice[] = (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        deviceType: row.device_type || 'ZKTECO_MB460',
        model: row.model || 'MB460',
        serialNumber: row.serial_number || undefined,
        locationName: row.location_name || 'Head Office',
        ipAddress: row.ip_address,
        port: row.port || 4370,
        commKey: row.comm_key || '0',
        connectionStatus: (row.connection_status as DeviceConnectionStatus) || 'OFFLINE',
        lastSyncAt: row.last_sync_at || undefined,
        lastHeartbeatAt: row.last_heartbeat_at || undefined,
        isActive: row.is_active ?? true,
        timezone: row.timezone || 'UTC',
        metadata: row.metadata || {},
        created: row.created,
        updated: row.updated,
      }));

      cachedDevices = devices;
      lastCacheTime = Date.now();
      return devices;
    } catch (e: any) {
      console.warn('[DeviceService] Failed to fetch devices:', e?.message || e);
      return [];
    }
  },

  async createDevice(data: {
    name: string;
    deviceType?: string;
    model?: string;
    serialNumber?: string;
    locationName?: string;
    ipAddress: string;
    port?: number;
    commKey?: string;
    timezone?: string;
  }): Promise<AttendanceDevice | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No active organization found');

    const payload = {
      organization_id: orgId,
      name: data.name.trim(),
      device_type: data.deviceType?.trim() || 'ZKTECO_MB460',
      model: data.model?.trim() || 'MB460',
      serial_number: data.serialNumber?.trim() || null,
      location_name: data.locationName?.trim() || 'Head Office',
      ip_address: data.ipAddress.trim(),
      port: Number(data.port) || 4370,
      comm_key: data.commKey?.trim() || '0',
      connection_status: 'OFFLINE',
      timezone: data.timezone || 'UTC',
      is_active: true,
    };

    const { data: inserted, error } = await supabase
      .from('attendance_devices')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    deviceService.clearCache();
    apiClient.notify();
    return inserted as AttendanceDevice;
  },

  async updateDevice(
    id: string,
    updates: Partial<{
      name: string;
      deviceType: string;
      model: string;
      serialNumber: string | null;
      locationName: string;
      ipAddress: string;
      port: number;
      commKey: string;
      connectionStatus: DeviceConnectionStatus;
      isActive: boolean;
      timezone: string;
    }>
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.deviceType !== undefined) payload.device_type = updates.deviceType.trim();
    if (updates.model !== undefined) payload.model = updates.model.trim();
    if (updates.serialNumber !== undefined) payload.serial_number = updates.serialNumber?.trim() || null;
    if (updates.locationName !== undefined) payload.location_name = updates.locationName.trim();
    if (updates.ipAddress !== undefined) payload.ip_address = updates.ipAddress.trim();
    if (updates.port !== undefined) payload.port = Number(updates.port);
    if (updates.commKey !== undefined) payload.comm_key = updates.commKey.trim();
    if (updates.connectionStatus !== undefined) payload.connection_status = updates.connectionStatus;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.timezone !== undefined) payload.timezone = updates.timezone;

    const { error } = await supabase.from('attendance_devices').update(payload).eq('id', id);
    if (error) throw error;

    deviceService.clearCache();
    apiClient.notify();
  },

  async deleteDevice(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('attendance_devices').delete().eq('id', id);
    if (error) throw error;

    deviceService.clearCache();
    apiClient.notify();
  },

  async recordHeartbeat(id: string, status: DeviceConnectionStatus = 'ONLINE'): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const now = new Date().toISOString();
    await supabase
      .from('attendance_devices')
      .update({
        connection_status: status,
        last_heartbeat_at: now,
      })
      .eq('id', id);

    deviceService.clearCache();
  },

  // =========================================================================
  // 2. DEVICE USER MAPPINGS (PIN <-> Employee Profile)
  // =========================================================================

  async getMappings(deviceId?: string): Promise<DeviceUserMapping[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    try {
      let query = supabase
        .from('device_user_mappings')
        .select(`
          *,
          device:attendance_devices!device_id(id, name),
          employee:profiles!employee_id(id, name, designation, avatar)
        `)
        .order('device_user_id', { ascending: true });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DeviceService] device_user_mappings query error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        deviceId: row.device_id,
        deviceName: row.device?.name || undefined,
        deviceUserId: row.device_user_id,
        employeeId: row.employee_id,
        employeeName: row.employee?.name || undefined,
        employeeDesignation: row.employee?.designation || undefined,
        employeeAvatar: row.employee?.avatar || undefined,
        cardNumber: row.card_number || undefined,
        privilege: row.privilege || 'USER',
        isSynced: !!row.is_synced,
        created: row.created,
        updated: row.updated,
      }));
    } catch (e: any) {
      console.warn('[DeviceService] Failed to fetch device mappings:', e?.message || e);
      return [];
    }
  },

  async createMapping(data: {
    deviceId: string;
    deviceUserId: string;
    employeeId: string;
    cardNumber?: string;
    privilege?: 'USER' | 'ENROLLER' | 'ADMIN' | 'SUPER_ADMIN';
  }): Promise<DeviceUserMapping | null> {
    if (!isSupabaseConfigured()) return null;
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No active organization found');

    const payload = {
      organization_id: orgId,
      device_id: data.deviceId,
      device_user_id: data.deviceUserId.trim(),
      employee_id: data.employeeId,
      card_number: data.cardNumber?.trim() || null,
      privilege: data.privilege || 'USER',
      is_synced: true,
    };

    const { data: inserted, error } = await supabase
      .from('device_user_mappings')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    apiClient.notify();
    return inserted as DeviceUserMapping;
  },

  async deleteMapping(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('device_user_mappings').delete().eq('id', id);
    if (error) throw error;
    apiClient.notify();
  },

  // =========================================================================
  // 3. RAW ATTENDANCE EVENTS
  // =========================================================================

  async getRawEvents(options: {
    deviceId?: string;
    employeeId?: string;
    since?: string;
    until?: string;
    processed?: boolean;
    limit?: number;
  } = {}): Promise<AttendanceRawEvent[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    try {
      let query = supabase
        .from('attendance_raw_events')
        .select(`
          *,
          device:attendance_devices!device_id(id, name),
          employee:profiles!employee_id(id, name)
        `)
        .order('event_timestamp', { ascending: false })
        .limit(options.limit || 200);

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      if (options.deviceId) {
        query = query.eq('device_id', options.deviceId);
      }
      if (options.employeeId) {
        query = query.eq('employee_id', options.employeeId);
      }
      if (options.processed !== undefined) {
        query = query.eq('processed', options.processed);
      }
      if (options.since) {
        query = query.gte('event_timestamp', options.since);
      }
      if (options.until) {
        query = query.lte('event_timestamp', options.until);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DeviceService] attendance_raw_events query error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        deviceId: row.device_id || undefined,
        deviceName: row.device?.name || undefined,
        deviceUserId: row.device_user_id,
        employeeId: row.employee_id || undefined,
        employeeName: row.employee?.name || undefined,
        eventTimestamp: row.event_timestamp,
        eventType: (row.event_type as AttendanceEventType) || 'CHECK_IN',
        verificationMethod: (row.verification_method as BiometricVerificationMethod) || 'FINGERPRINT',
        source: row.source || 'DEVICE',
        receivedAt: row.received_at,
        externalEventId: row.external_event_id || undefined,
        rawPayload: row.raw_payload || {},
        processed: !!row.processed,
        processedAt: row.processed_at || undefined,
        sessionId: row.session_id || undefined,
        created: row.created,
      }));
    } catch (e: any) {
      console.warn('[DeviceService] Failed to fetch raw events:', e?.message || e);
      return [];
    }
  },

  async ingestRawEvents(
    events: Array<{
      deviceId?: string;
      deviceUserId: string;
      eventTimestamp: string;
      eventType?: AttendanceEventType;
      verificationMethod?: BiometricVerificationMethod;
      source?: 'DEVICE' | 'LOCAL_CONNECTOR' | 'WEB' | 'MOBILE' | 'MANUAL_IMPORT';
      externalEventId?: string;
      rawPayload?: Record<string, any>;
    }>
  ): Promise<{ ingestedCount: number; duplicateCount: number }> {
    if (!isSupabaseConfigured() || events.length === 0) {
      return { ingestedCount: 0, duplicateCount: 0 };
    }
    const orgId = await resolveOrgId();
    if (!orgId) throw new Error('No active organization found');

    // Pre-resolve mappings to attach employee_id if available
    const mappings = await deviceService.getMappings();
    const mapDict = new Map<string, string>(); // `${deviceId}:${deviceUserId}` -> employeeId
    mappings.forEach((m) => {
      mapDict.set(`${m.deviceId}:${m.deviceUserId}`, m.employeeId);
      // Fallback key: deviceUserId only
      mapDict.set(`*:${m.deviceUserId}`, m.employeeId);
    });

    const rows = events.map((ev) => {
      const matchedEmployeeId =
        (ev.deviceId && mapDict.get(`${ev.deviceId}:${ev.deviceUserId}`)) ||
        mapDict.get(`*:${ev.deviceUserId}`) ||
        null;

      const extId =
        ev.externalEventId ||
        `${ev.deviceId || 'nodev'}_${ev.deviceUserId}_${new Date(ev.eventTimestamp).getTime()}`;

      return {
        organization_id: orgId,
        device_id: ev.deviceId || null,
        device_user_id: ev.deviceUserId,
        employee_id: matchedEmployeeId,
        event_timestamp: new Date(ev.eventTimestamp).toISOString(),
        event_type: ev.eventType || 'CHECK_IN',
        verification_method: ev.verificationMethod || 'FINGERPRINT',
        source: ev.source || 'DEVICE',
        external_event_id: extId,
        raw_payload: ev.rawPayload || {},
        processed: false,
      };
    });

    let ingestedCount = 0;
    let duplicateCount = 0;

    // Insert with on conflict do nothing
    const { data: inserted, error } = await supabase
      .from('attendance_raw_events')
      .upsert(rows, { onConflict: 'organization_id,device_id,external_event_id', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.warn('[DeviceService] Raw events insert error:', error.message);
      throw error;
    }

    ingestedCount = inserted?.length || 0;
    duplicateCount = events.length - ingestedCount;

    // Update last sync on device if deviceId provided
    if (events[0]?.deviceId) {
      await supabase
        .from('attendance_devices')
        .update({
          last_sync_at: new Date().toISOString(),
          connection_status: 'ONLINE',
        })
        .eq('id', events[0].deviceId);
    }

    apiClient.notify();
    return { ingestedCount, duplicateCount };
  },

  // =========================================================================
  // 4. ATTENDANCE ENGINE: PROCESS RAW EVENTS INTO SESSIONS
  // =========================================================================

  async processRawEvents(): Promise<{ processedCount: number; sessionsCreated: number }> {
    if (!isSupabaseConfigured()) return { processedCount: 0, sessionsCreated: 0 };
    const orgId = await resolveOrgId();
    if (!orgId) return { processedCount: 0, sessionsCreated: 0 };

    // Fetch up to 200 unprocessed events that have an employee_id resolved
    const { data: rawEvents, error: fetchErr } = await supabase
      .from('attendance_raw_events')
      .select(`
        id,
        device_id,
        device_user_id,
        employee_id,
        event_timestamp,
        event_type,
        verification_method,
        employee:profiles!employee_id(id, name, shift_id)
      `)
      .eq('organization_id', orgId)
      .eq('processed', false)
      .not('employee_id', 'is', null)
      .order('event_timestamp', { ascending: true })
      .limit(200);

    if (fetchErr || !rawEvents || rawEvents.length === 0) {
      return { processedCount: 0, sessionsCreated: 0 };
    }

    let processedCount = 0;
    let sessionsCreated = 0;

    // Group events by employee and work date (YYYY-MM-DD)
    const groups = new Map<string, typeof rawEvents>();
    for (const ev of rawEvents) {
      const dateYMD = new Date(ev.event_timestamp).toISOString().split('T')[0];
      const key = `${ev.employee_id}:${dateYMD}`;
      const list = groups.get(key) || [];
      list.push(ev);
      groups.set(key, list);
    }

    for (const [key, evList] of groups.entries()) {
      const [employeeId, dateYMD] = key.split(':');
      const employeeName = (evList[0].employee as any)?.name || 'Employee';

      // Find earliest event for check-in and latest event for check-out
      const timestamps = evList.map((e) => new Date(e.event_timestamp).getTime()).sort();
      const earliestISO = new Date(timestamps[0]).toISOString();
      const latestISO = timestamps.length > 1 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null;

      // Check if session already exists for this employee on this date
      const { data: existingSession } = await supabase
        .from('attendance')
        .select('*')
        .eq('organization_id', orgId)
        .eq('employee_id', employeeId)
        .eq('date', dateYMD)
        .maybeSingle();

      let targetSessionId = existingSession?.id;

      if (existingSession) {
        // Update check-in (if earlier) and check-out (if later)
        const updates: any = {};
        if (!existingSession.check_in || new Date(earliestISO) < new Date(existingSession.check_in)) {
          updates.check_in = earliestISO;
        }
        if (latestISO && (!existingSession.check_out || new Date(latestISO) > new Date(existingSession.check_out))) {
          updates.check_out = latestISO;
        }
        if (Object.keys(updates).length > 0) {
          updates.updated = new Date().toISOString();
          await supabase.from('attendance').update(updates).eq('id', existingSession.id);
        }
      } else {
        // Create new attendance session row
        const newSession = {
          organization_id: orgId,
          employee_id: employeeId,
          employee_name: employeeName,
          date: dateYMD,
          check_in: earliestISO,
          check_out: latestISO,
          status: 'PRESENT',
          duty_type: 'OFFICE',
          location: 'Biometric MB460 Terminal',
          remarks: `Ingested from Terminal Event (${evList[0].verification_method})`,
        };

        const { data: ins, error: insErr } = await supabase
          .from('attendance')
          .insert(newSession)
          .select('id')
          .single();

        if (!insErr && ins) {
          targetSessionId = ins.id;
          sessionsCreated++;
        }
      }

      // Mark the raw events as processed
      const eventIds = evList.map((e) => e.id);
      await supabase
        .from('attendance_raw_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          session_id: targetSessionId || null,
        })
        .in('id', eventIds);

      processedCount += eventIds.length;
    }

    apiClient.notify();
    return { processedCount, sessionsCreated };
  },

  // =========================================================================
  // 5. ATTENDANCE SYNC LOGS
  // =========================================================================

  async getSyncLogs(deviceId?: string, limit = 50): Promise<AttendanceSyncLog[]> {
    if (!isSupabaseConfigured()) return [];
    const orgId = await resolveOrgId();
    try {
      let query = supabase
        .from('attendance_sync_logs')
        .select(`
          *,
          device:attendance_devices!device_id(id, name)
        `)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }
      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('[DeviceService] attendance_sync_logs error:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        deviceId: row.device_id || undefined,
        deviceName: row.device?.name || undefined,
        syncType: row.sync_type || 'PULL_EVENTS',
        status: row.status || 'SUCCESS',
        eventsReceived: row.events_received || 0,
        eventsIngested: row.events_ingested || 0,
        eventsDuplicate: row.events_duplicate || 0,
        errorMessage: row.error_message || undefined,
        startedAt: row.started_at,
        completedAt: row.completed_at || undefined,
      }));
    } catch (e: any) {
      console.warn('[DeviceService] Failed to fetch sync logs:', e?.message || e);
      return [];
    }
  },

  async logSync(data: {
    deviceId?: string;
    syncType: 'HEARTBEAT' | 'PULL_EVENTS' | 'PUSH_USERS' | 'MANUAL' | 'CONNECTOR_STATUS';
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    eventsReceived?: number;
    eventsIngested?: number;
    eventsDuplicate?: number;
    errorMessage?: string;
  }): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const orgId = await resolveOrgId();
    if (!orgId) return;

    await supabase.from('attendance_sync_logs').insert({
      organization_id: orgId,
      device_id: data.deviceId || null,
      sync_type: data.syncType,
      status: data.status,
      events_received: data.eventsReceived || 0,
      events_ingested: data.eventsIngested || 0,
      events_duplicate: data.eventsDuplicate || 0,
      error_message: data.errorMessage || null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  },
};
