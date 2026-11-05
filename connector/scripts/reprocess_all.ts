import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function reprocessAll() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  console.log('[Reprocess] Fetching all raw events...');
  const { data: rawEvents, error: rawErr } = await sb
    .from('attendance_raw_events')
    .select('id, device_user_id, employee_id, event_timestamp, verification_method, employee:profiles!employee_id(id, name)')
    .eq('organization_id', config.organizationId)
    .not('employee_id', 'is', null)
    .order('event_timestamp', { ascending: true });

  if (rawErr || !rawEvents) {
    console.error('Error fetching raw events:', rawErr);
    return;
  }

  console.log(`[Reprocess] Found ${rawEvents.length} raw events with mapped employees.`);

  // Group by employee_id + date (YYYY-MM-DD in Asia/Dhaka or ISO)
  // Let's check the date format:
  // Note: For Asia/Dhaka (+06:00), we can extract local date or ISO date.
  // In Bangladesh, working day is from morning to evening.
  // An event at 2026-11-03T02:14:30Z is 08:14:30 Dhaka time -> 2026-11-03.
  // An event at 2026-11-03T13:50:48Z is 19:50:48 Dhaka time -> 2026-11-03.
  const groups = new Map<string, typeof rawEvents>();
  for (const ev of rawEvents) {
    const d = new Date(ev.event_timestamp);
    // Convert to Asia/Dhaka date
    const dhakaDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
    const key = `${ev.employee_id}:${dhakaDateStr}`;
    const list = groups.get(key) || [];
    list.push(ev);
    groups.set(key, list);
  }

  console.log(`[Reprocess] Aggregated into ${groups.size} employee-day sessions.`);

  let updatedCount = 0;
  let insertedCount = 0;

  for (const [key, evList] of groups.entries()) {
    const [employeeId, dateYMD] = key.split(':');
    const employeeName = (evList[0] as any)?.employee?.name || null;
    const timestamps = evList.map((e) => new Date(e.event_timestamp).getTime()).sort();
    const earliestISO = new Date(timestamps[0]).toISOString();
    const latestISO = timestamps.length > 1 && timestamps[timestamps.length - 1] > timestamps[0]
      ? new Date(timestamps[timestamps.length - 1]).toISOString()
      : null;

    // Check existing
    const { data: existing } = await sb
      .from('attendance')
      .select('id, check_in, check_out, employee_name')
      .eq('organization_id', config.organizationId)
      .eq('employee_id', employeeId)
      .eq('date', dateYMD)
      .maybeSingle();

    let sessionId = existing?.id;

    if (existing) {
      // Merge timestamps
      const allTimes = [timestamps[0]];
      if (timestamps.length > 1) allTimes.push(timestamps[timestamps.length - 1]);
      if (existing.check_in) allTimes.push(new Date(existing.check_in).getTime());
      if (existing.check_out) allTimes.push(new Date(existing.check_out).getTime());
      allTimes.sort();

      const mergedCheckIn = new Date(allTimes[0]).toISOString();
      const mergedCheckOut = allTimes.length > 1 && allTimes[allTimes.length - 1] > allTimes[0]
        ? new Date(allTimes[allTimes.length - 1]).toISOString()
        : null;

      const updates: any = {};
      if (existing.check_in !== mergedCheckIn) updates.check_in = mergedCheckIn;
      if (existing.check_out !== mergedCheckOut) updates.check_out = mergedCheckOut;
      if (!existing.employee_name && employeeName) updates.employee_name = employeeName;

      if (Object.keys(updates).length > 0) {
        updates.updated = new Date().toISOString();
        await sb.from('attendance').update(updates).eq('id', existing.id);
        updatedCount++;
      }
    } else {
      const { data: ins, error: insErr } = await sb
        .from('attendance')
        .insert({
          organization_id: config.organizationId,
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

      if (insErr) {
        console.warn(`Failed to insert attendance for ${employeeName} on ${dateYMD}:`, insErr.message);
      } else if (ins) {
        sessionId = ins.id;
        insertedCount++;
      }
    }

    // Mark raw events as processed
    const eventIds = evList.map((e) => e.id);
    await sb
      .from('attendance_raw_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        session_id: sessionId || null,
      })
      .in('id', eventIds);
  }

  console.log(`[Reprocess] Done! Updated: ${updatedCount}, Inserted: ${insertedCount}`);
}

reprocessAll().catch(console.error);
