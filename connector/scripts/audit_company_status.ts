import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const sb = createClient(config.supabaseUrl, config.supabaseKey);

async function audit() {
  await sb.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });

  // 1. Employees
  const { data: employees } = await sb.from('profiles')
    .select('id, employee_id, name, email, role, department, designation, team_id, avatar_url, is_active')
    .eq('organization_id', config.organizationId);

  // 2. Device mappings
  const { data: mappings } = await sb.from('device_user_mappings')
    .select('device_user_id, employee_id, employee:profiles!employee_id(name)')
    .eq('organization_id', config.organizationId);

  // 3. Raw events distinct PINs
  const { data: rawPins } = await sb.from('attendance_raw_events')
    .select('device_user_id')
    .eq('organization_id', config.organizationId);
  const distinctPinsInLogs = Array.from(new Set((rawPins || []).map(r => r.device_user_id)));

  // 4. Departments / Teams
  const { data: departments } = await sb.from('departments')
    .select('id, name')
    .eq('organization_id', config.organizationId);
  
  const { data: teams } = await sb.from('teams')
    .select('id, name, department_id')
    .eq('organization_id', config.organizationId);

  // 5. Shifts
  const { data: shifts } = await sb.from('shifts')
    .select('*')
    .eq('organization_id', config.organizationId);

  // 6. Organization config
  const { data: orgConfig } = await sb.from('organizations')
    .select('id, name, office_start_time, office_end_time, late_grace_period')
    .eq('id', config.organizationId);

  // 7. WIP Tasks count
  const { count: taskCount } = await sb.from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', config.organizationId);

  console.log(JSON.stringify({
    orgConfig,
    employeesCount: employees?.length,
    employees: employees?.map(e => ({
      name: e.name,
      email: e.email,
      role: e.role,
      dept: e.department,
      designation: e.designation,
      hasAvatar: !!e.avatar_url,
    })),
    mappingsCount: mappings?.length,
    mappings: mappings?.map(m => ({ pin: m.device_user_id, name: (m.employee as any)?.name })),
    distinctPinsInLogs,
    unmappedPinsInLogs: distinctPinsInLogs.filter(p => !mappings?.some(m => m.device_user_id === p)),
    departments: departments?.map(d => d.name),
    teams: teams?.map(t => t.name),
    shiftsCount: shifts?.length,
    shifts,
    taskCount
  }, null, 2));
}

audit().catch(console.error);
