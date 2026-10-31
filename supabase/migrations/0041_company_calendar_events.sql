-- ============================================================
-- Company OS — Phase 4: Company Calendar & Events
-- Migration: 0041_company_calendar_events.sql
-- ============================================================

create table if not exists public.company_events (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  title               text not null,
  description         text,
  event_type          text not null default 'EVENT'
                      check (event_type in ('EVENT', 'MEETING', 'MILESTONE', 'HOLIDAY', 'TRAINING', 'DEADLINE')),
  start_time          timestamptz not null,
  end_time            timestamptz,
  is_all_day          boolean not null default false,
  location            text,
  meeting_link        text,
  department_id       uuid references public.departments(id) on delete set null,
  creator_id          uuid references public.profiles(id) on delete set null,
  color               text default '#4f46e5',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_company_events_org_date on public.company_events(organization_id, start_time);
create index if not exists idx_company_events_type on public.company_events(organization_id, event_type);

-- RLS
alter table public.company_events enable row level security;

drop policy if exists "company_events_select" on public.company_events;
create policy "company_events_select" on public.company_events for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);

drop policy if exists "company_events_modify" on public.company_events;
create policy "company_events_modify" on public.company_events for all using (
  public.is_super_admin() or (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('ADMIN', 'HR', 'MANAGER')
      or creator_id::text = auth.uid()::text
    )
  )
);

-- Seed Calendar Permissions
insert into public.permissions (module, action, code, name, description)
values
  ('calendar', 'view', 'calendar:view', 'View Company Calendar', 'Can view company calendar, events, holidays and schedule'),
  ('calendar', 'manage', 'calendar:manage', 'Manage Calendar Events', 'Can create, edit and delete company calendar events')
on conflict (code) do nothing;
