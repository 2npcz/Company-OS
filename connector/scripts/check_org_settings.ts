import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function checkConfig() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  const { data } = await sb.from('organization_settings')
    .select('*')
    .eq('organization_id', config.organizationId);

  console.log('Settings:', JSON.stringify(data, null, 2));
}

checkConfig().catch(console.error);
