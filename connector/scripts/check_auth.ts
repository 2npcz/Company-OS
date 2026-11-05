import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function checkAuthUsers() {
  // Since we only have anon key in config.json, we can test which emails can sign in or check profiles
  // Note: auth.admin requires service role key, but let's check if profiles.id matches auth.users
  const { data: emps } = await sb.from('profiles').select('id, name, email');
  console.log('Registered profile emails:', emps?.map(e => ({ name: e.name, email: e.email, id: e.id })));
}

checkAuthUsers().catch(console.error);
