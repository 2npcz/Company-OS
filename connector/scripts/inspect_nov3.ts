import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function inspect() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  // Query raw events for Nov 3
  const { data: nov3Raw } = await sb.from('attendance_raw_events')
    .select('id, device_user_id, employee_id, event_timestamp, employee:profiles!employee_id(name)')
    .gte('event_timestamp', '2026-11-03T00:00:00Z')
    .lte('event_timestamp', '2026-11-03T23:59:59Z')
    .order('event_timestamp', { ascending: true });

  console.log('Nov 3 Raw Events:', JSON.stringify(nov3Raw, null, 2));
}

inspect().catch(console.error);
