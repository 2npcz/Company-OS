import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function checkAll() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  const { data: allProfiles } = await sb.from('profiles')
    .select('id, employee_id, name, email, role, department, designation, team_id, avatar, status')
    .order('employee_id');
  
  console.log('Profiles:', JSON.stringify(allProfiles, null, 2));
}

checkAll().catch(console.error);
