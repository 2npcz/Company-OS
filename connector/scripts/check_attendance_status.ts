import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function check() {
  if (config.email && config.password) {
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
      email: config.email,
      password: config.password,
    });
    if (authErr) {
      console.error('Auth error:', authErr);
      return;
    }
    console.log('Signed in as:', authData.user?.email);
  }

  const { count: rawCount } = await sb.from('attendance_raw_events').select('*', { count: 'exact', head: true });
  const { count: attCount } = await sb.from('attendance').select('*', { count: 'exact', head: true });
  const { data: sampleAtt } = await sb.from('attendance')
    .select('id, employee_name, date, check_in, check_out, status')
    .order('date', { ascending: false })
    .limit(30);
  
  const { count: unprocCount } = await sb.from('attendance_raw_events')
    .select('*', { count: 'exact', head: true })
    .eq('processed', false);

  const { data: rawDates } = await sb.from('attendance_raw_events')
    .select('event_timestamp')
    .order('event_timestamp', { ascending: true })
    .limit(5);

  const { data: rawDatesLatest } = await sb.from('attendance_raw_events')
    .select('event_timestamp')
    .order('event_timestamp', { ascending: false })
    .limit(5);

  console.log(JSON.stringify({
    rawCount,
    attCount,
    unprocCount,
    earliestRaw: rawDates?.[0]?.event_timestamp,
    latestRaw: rawDatesLatest?.[0]?.event_timestamp,
    sampleAtt
  }, null, 2));
}

check().catch(console.error);
