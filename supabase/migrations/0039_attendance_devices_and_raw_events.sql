-- ============================================================
-- OpenHRApp / Company OS — Phase 2: Attendance Engine & Biometric Hardware
-- 0039_attendance_devices_and_raw_events.sql
-- ============================================================

-- 1. ATTENDANCE DEVICES (ZKTeco MB460 & Hardware Terminals)
create table if not exists public.attendance_devices (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  device_type         text not null default 'ZKTECO_MB460',
  model               text default 'MB460',
  serial_number       text,
  location_name       text default 'Head Office',
  ip_address          text not null,
  port                integer not null default 4370,
  comm_key            text default '0',
  connection_status   text not null default 'OFFLINE'
                      check (connection_status in ('ONLINE', 'OFFLINE', 'WARNING', 'SYNCING')),
  last_sync_at        timestamptz,
  last_heartbeat_at   timestamptz,
  is_active           boolean not null default true,
  timezone            text default 'UTC',
  metadata            jsonb default '{}'::jsonb,
  created             timestamptz not null default now(),
  updated             timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, ip_address, port)
);

create index if not exists idx_att_devices_org on public.attendance_devices(organization_id);
create index if not exists idx_att_devices_status on public.attendance_devices(connection_status);

-- 2. DEVICE USER MAPPINGS (Terminal Biometric PIN <-> Company Employee Profile)
create table if not exists public.device_user_mappings (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  device_id           uuid not null references public.attendance_devices(id) on delete cascade,
  device_user_id      text not null,
  employee_id         uuid not null references public.profiles(id) on delete cascade,
  card_number         text,
  privilege           text default 'USER' check (privilege in ('USER', 'ENROLLER', 'ADMIN', 'SUPER_ADMIN')),
  is_synced           boolean not null default true,
  created             timestamptz not null default now(),
  updated             timestamptz not null default now(),
  unique (device_id, device_user_id),
  unique (device_id, employee_id)
);

create index if not exists idx_dum_org on public.device_user_mappings(organization_id);
create index if not exists idx_dum_device on public.device_user_mappings(device_id);
create index if not exists idx_dum_employee on public.device_user_mappings(employee_id);

-- 3. RAW ATTENDANCE EVENTS (Immutable Hardware Source Log)
create table if not exists public.attendance_raw_events (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  device_id           uuid references public.attendance_devices(id) on delete set null,
  device_user_id      text not null,
  employee_id         uuid references public.profiles(id) on delete set null,
  event_timestamp     timestamptz not null,
  event_type          text not null default 'CHECK_IN'
                      check (event_type in ('CHECK_IN', 'CHECK_OUT', 'BREAK_OUT', 'BREAK_IN', 'OVERTIME_IN', 'OVERTIME_OUT', 'UNKNOWN')),
  verification_method text not null default 'FINGERPRINT'
                      check (verification_method in ('FACE', 'FINGERPRINT', 'PASSWORD', 'CARD', 'MANUAL', 'LOCATION_SELFIE')),
  source              text not null default 'DEVICE'
                      check (source in ('DEVICE', 'LOCAL_CONNECTOR', 'WEB', 'MOBILE', 'MANUAL_IMPORT')),
  received_at         timestamptz not null default now(),
  external_event_id   text,
  raw_payload         jsonb default '{}'::jsonb,
  processed           boolean not null default false,
  processed_at        timestamptz,
  session_id          uuid references public.attendance(id) on delete set null,
  created             timestamptz not null default now(),
  unique (organization_id, device_id, external_event_id)
);

create index if not exists idx_are_org on public.attendance_raw_events(organization_id);
create index if not exists idx_are_device on public.attendance_raw_events(device_id);
create index if not exists idx_are_employee on public.attendance_raw_events(employee_id);
create index if not exists idx_are_timestamp on public.attendance_raw_events(event_timestamp desc);
create index if not exists idx_are_processed on public.attendance_raw_events(processed);

-- 4. ATTENDANCE SYNC LOGS (Connector Operations & Audit)
create table if not exists public.attendance_sync_logs (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  device_id           uuid references public.attendance_devices(id) on delete cascade,
  sync_type           text not null default 'PULL_EVENTS'
                      check (sync_type in ('HEARTBEAT', 'PULL_EVENTS', 'PUSH_USERS', 'MANUAL', 'CONNECTOR_STATUS')),
  status              text not null default 'SUCCESS'
                      check (status in ('SUCCESS', 'PARTIAL', 'FAILED')),
  events_received     integer default 0,
  events_ingested     integer default 0,
  events_duplicate    integer default 0,
  error_message       text,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz default now()
);

create index if not exists idx_asl_org on public.attendance_sync_logs(organization_id);
create index if not exists idx_asl_device on public.attendance_sync_logs(device_id);
create index if not exists idx_asl_time on public.attendance_sync_logs(started_at desc);

-- 5. AUTO-UPDATE TIMESTAMPS
do $$
begin
  drop trigger if exists trg_attendance_devices_updated_at on public.attendance_devices;
  create trigger trg_attendance_devices_updated_at
    before update on public.attendance_devices
    for each row execute function public.set_updated_at();

  drop trigger if exists trg_device_user_mappings_updated_at on public.device_user_mappings;
  create trigger trg_device_user_mappings_updated_at
    before update on public.device_user_mappings
    for each row execute function public.set_updated_at();
exception when others then null;
end;
$$;

-- 6. ROW LEVEL SECURITY POLICIES

-- 6a. Attendance Devices
alter table public.attendance_devices enable row level security;

drop policy if exists "att_devices_select" on public.attendance_devices;
create policy "att_devices_select" on public.attendance_devices for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "att_devices_insert" on public.attendance_devices;
create policy "att_devices_insert" on public.attendance_devices for insert with check (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN','HR'))
);
drop policy if exists "att_devices_update" on public.attendance_devices;
create policy "att_devices_update" on public.attendance_devices for update using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN','HR'))
);
drop policy if exists "att_devices_delete" on public.attendance_devices;
create policy "att_devices_delete" on public.attendance_devices for delete using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN','HR'))
);

-- 6b. Device User Mappings
alter table public.device_user_mappings enable row level security;

drop policy if exists "dum_select" on public.device_user_mappings;
create policy "dum_select" on public.device_user_mappings for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "dum_modify" on public.device_user_mappings;
create policy "dum_modify" on public.device_user_mappings for all using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN','HR'))
);

-- 6c. Attendance Raw Events
alter table public.attendance_raw_events enable row level security;

drop policy if exists "are_select" on public.attendance_raw_events;
create policy "are_select" on public.attendance_raw_events for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "are_insert" on public.attendance_raw_events;
create policy "are_insert" on public.attendance_raw_events for insert with check (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "are_modify" on public.attendance_raw_events;
create policy "are_modify" on public.attendance_raw_events for all using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN','HR'))
);

-- 6d. Attendance Sync Logs
alter table public.attendance_sync_logs enable row level security;

drop policy if exists "asl_select" on public.attendance_sync_logs;
create policy "asl_select" on public.attendance_sync_logs for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "asl_insert" on public.attendance_sync_logs;
create policy "asl_insert" on public.attendance_sync_logs for insert with check (
  public.is_super_admin() or organization_id = public.auth_org_id()
);

-- 7. SEED STANDARD HARDWARE PERMISSIONS
insert into public.permissions (module, action, code, name, description) values
  ('devices', 'view', 'devices:view', 'View Attendance Devices', 'Can view biometric attendance devices and connectivity status'),
  ('devices', 'manage', 'devices:manage', 'Manage Attendance Devices', 'Can add, edit, test and delete attendance terminals'),
  ('devices', 'map', 'devices:map', 'Map Device Users', 'Can map terminal biometric IDs to company employee accounts'),
  ('devices', 'sync', 'devices:sync', 'Sync Attendance Data', 'Can trigger manual sync and calculation from biometric terminals')
on conflict (code) do nothing;
