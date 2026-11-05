import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function checkTasks() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  const { data: tasks } = await sb.from('tasks')
    .select('id, title, status, priority, assignee_id, employee:profiles!assignee_id(name)')
    .eq('organization_id', config.organizationId);

  console.log('Tasks:', JSON.stringify(tasks, null, 2));
}

checkTasks().catch(console.error);
