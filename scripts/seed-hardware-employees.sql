-- ============================================================
-- EcoGlobal Trading BD — Seed All Hardware Employees & Auto-Map Punches
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vxxhziyepxddxiptfqab/sql
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Ensure Attendance table has unique index for upserts
create unique index if not exists uq_attendance_org_emp_date 
  on public.attendance(organization_id, employee_id, date);

do $$
declare
  v_org_id uuid;
  v_device_id uuid;
begin
  -- 1. Get Organization ID
  select id into v_org_id from public.organizations where name = 'EcoGlobal Trading BD' limit 1;
  if v_org_id is null then
    select id into v_org_id from public.organizations limit 1;
  end if;

  -- 2. Get Device ID
  select id into v_device_id from public.attendance_devices where ip_address = '192.168.68.103' limit 1;
  if v_device_id is null then
    insert into public.attendance_devices (
      organization_id, name, device_type, model, location_name, ip_address, port, comm_key, timezone, connection_status
    ) values (
      v_org_id, 'EcoGlobal MB460', 'ZKTECO_MB460', 'MB460', 'Head Office', '192.168.68.103', 4370, '0', 'Asia/Dhaka', 'ONLINE'
    ) returning id into v_device_id;
  end if;

  -- 3. Define Temporary Table for Employees from Hardware Terminal
  create temp table tmp_hw_employees (
    device_pin text primary key,
    emp_code text,
    full_name text,
    email text,
    designation text,
    department text,
    role text default 'EMPLOYEE'
  ) on commit drop;

  insert into tmp_hw_employees (device_pin, emp_code, full_name, email, designation, department, role) values
    ('1',  'EMP-001', 'Hashmat Zaman',        'admin@ecoglobalbd.com',        'Managing Director',     'Management', 'ADMIN'),
    ('2',  'EMP-002', 'Abdul Momen',          'abdul.momen@ecoglobalbd.com',   'Operations Executive',  'Operations', 'EMPLOYEE'),
    ('3',  'EMP-003', 'Easine Arafat',        'easine.arafat@ecoglobalbd.com', 'Operations Executive',  'Operations', 'EMPLOYEE'),
    ('4',  'EMP-004', 'Imtiaz Ahmed',         'imtiaz.ahmed@ecoglobalbd.com',  'Operations Executive',  'Operations', 'EMPLOYEE'),
    ('5',  'EMP-005', 'Sijan Hasan',          'sijan.hasan@ecoglobalbd.com',   'Operations Executive',  'Operations', 'EMPLOYEE'),
    ('6',  'EMP-006', 'Sakawat Hossain',      'sakawat.hossain@ecoglobalbd.com','Operations Executive',  'Operations', 'EMPLOYEE'),
    ('7',  'EMP-007', 'Mahima Zakir',         'mahima.zakir@ecoglobalbd.com',  'Marketing Executive',   'Marketing',  'EMPLOYEE'),
    ('8',  'EMP-008', 'Samiha Jakir',         'samiha.jakir@ecoglobalbd.com',  'Marketing Executive',   'Marketing',  'EMPLOYEE'),
    ('9',  'EMP-009', 'Jahedul Islam Lipon',  'jahedul.islam@ecoglobalbd.com', 'Accounts Executive',    'Accounts',   'EMPLOYEE'),
    ('10', 'EMP-010', 'Talha Jalal',          'talha.jalal@ecoglobalbd.com',   'Operations Executive',  'Operations', 'EMPLOYEE'),
    ('11', 'EMP-011', 'Md Mintu',             'md.mintu@ecoglobalbd.com',      'Staff Support',         'Logistics',  'EMPLOYEE'),
    ('12', 'EMP-012', 'Shapon Molla',         'shapon.molla@ecoglobalbd.com',  'Staff Support',         'Logistics',  'EMPLOYEE');

  -- 4. Upsert Users into auth.users & auth.identities
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    role, confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    t.email,
    crypt('EcoGlobal2026!', gen_salt('bf')),
    now(),
    json_build_object('provider', 'email', 'providers', array['email'])::jsonb,
    json_build_object('name', t.full_name, 'sub', t.email)::jsonb,
    now(), now(),
    'authenticated', '', '', '', '', '', '', '', ''
  from tmp_hw_employees t
  where not exists (select 1 from auth.users u where u.email = t.email);

  -- Ensure identities exist
  insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  select
    u.id, u.id,
    json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
    'email', u.email, now(), now(), now()
  from auth.users u
  join tmp_hw_employees t on t.email = u.email
  on conflict (provider, provider_id) do update set updated_at = now();

  -- 5. Upsert Profiles in public.profiles
  insert into public.profiles (
    id, organization_id, name, email, employee_id, designation, department, role, verified, status
  )
  select
    u.id,
    v_org_id,
    t.full_name,
    t.email,
    t.emp_code,
    t.designation,
    t.department,
    t.role,
    true,
    'ACTIVE'
  from auth.users u
  join tmp_hw_employees t on t.email = u.email
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    name = excluded.name,
    email = excluded.email,
    employee_id = excluded.employee_id,
    designation = excluded.designation,
    department = excluded.department,
    role = excluded.role,
    verified = true,
    status = 'ACTIVE';

  -- 6. Upsert Device User Mappings
  insert into public.device_user_mappings (
    organization_id, device_id, device_user_id, employee_id, privilege, is_synced
  )
  select
    v_org_id,
    v_device_id,
    t.device_pin,
    p.id,
    case when t.role = 'ADMIN' then 'ADMIN' else 'USER' end,
    true
  from tmp_hw_employees t
  join public.profiles p on p.email = t.email and p.organization_id = v_org_id
  on conflict (device_id, device_user_id) do update set
    employee_id = excluded.employee_id,
    privilege = excluded.privilege,
    is_synced = true;

  -- 7. Re-link ALL Attendance Raw Events with the newly mapped employee profiles
  update public.attendance_raw_events are
  set employee_id = dum.employee_id
  from public.device_user_mappings dum
  where are.device_id = dum.device_id
    and are.device_user_id = dum.device_user_id;

  -- 8. Consolidate into Daily Attendance Sessions (PRESENT records)
  insert into public.attendance (
    organization_id, employee_id, employee_name, date, check_in, check_out, status, duty_type, location, remarks
  )
  select
    v_org_id,
    p.id,
    p.name,
    (are.event_timestamp at time zone 'Asia/Dhaka')::date,
    min(are.event_timestamp),
    case when count(*) > 1 then max(are.event_timestamp) else null end,
    'PRESENT',
    'OFFICE',
    'Biometric MB460 Terminal',
    'Ingested from ZKTeco MB460'
  from public.attendance_raw_events are
  join public.profiles p on p.id = are.employee_id
  where are.organization_id = v_org_id
  group by v_org_id, p.id, p.name, (are.event_timestamp at time zone 'Asia/Dhaka')::date
  on conflict (organization_id, employee_id, date) do update set
    employee_name = excluded.employee_name,
    check_in = least(coalesce(public.attendance.check_in, excluded.check_in), excluded.check_in),
    check_out = greatest(coalesce(public.attendance.check_out, excluded.check_out), excluded.check_out),
    status = 'PRESENT',
    updated = now();

  -- 9. Mark Raw Events as processed
  update public.attendance_raw_events are
  set 
    processed = true,
    processed_at = now(),
    session_id = att.id
  from public.attendance att
  where are.employee_id = att.employee_id
    and (are.event_timestamp at time zone 'Asia/Dhaka')::date = att.date;

end $$;

-- Verify results
select 
  dum.device_user_id as pin,
  p.employee_id as code,
  p.name, 
  p.department, 
  p.designation, 
  count(are.id) as punches_linked
from public.profiles p
left join public.device_user_mappings dum on dum.employee_id = p.id
left join public.attendance_raw_events are on are.employee_id = p.id
where p.organization_id = (select id from public.organizations where name = 'EcoGlobal Trading BD' limit 1)
group by dum.device_user_id, p.employee_id, p.name, p.department, p.designation
order by dum.device_user_id::int asc nulls last;
