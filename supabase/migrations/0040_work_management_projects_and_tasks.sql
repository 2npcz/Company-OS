-- ============================================================
-- Company OS — Phase 3: Work Management (Projects & Tasks)
-- Migration: 0040_work_management_projects_and_tasks.sql
-- ============================================================

-- 1. PROJECTS
create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  code                text,
  description         text,
  owner_id            uuid references public.profiles(id) on delete set null,
  status              text not null default 'ACTIVE' 
                      check (status in ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  priority            text not null default 'MEDIUM' 
                      check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  start_date          date,
  target_date         date,
  completed_date      date,
  budget              numeric default 0,
  progress            integer not null default 0 check (progress >= 0 and progress <= 100),
  tags                text[] default array[]::text[],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_projects_org_status on public.projects(organization_id, status);
create index if not exists idx_projects_owner on public.projects(organization_id, owner_id);

-- 2. PROJECT MEMBERS
create table if not exists public.project_members (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  employee_id         uuid not null references public.profiles(id) on delete cascade,
  role                text not null default 'MEMBER' check (role in ('LEAD', 'MEMBER', 'VIEWER')),
  joined_at           timestamptz not null default now(),
  unique (project_id, employee_id)
);

create index if not exists idx_project_members_org on public.project_members(organization_id);
create index if not exists idx_project_members_emp on public.project_members(organization_id, employee_id);

-- 3. TASKS
create table if not exists public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid references public.projects(id) on delete set null,
  department_id       uuid references public.departments(id) on delete set null,
  team_id             uuid references public.teams(id) on delete set null,
  title               text not null,
  description         text,
  assignee_id         uuid references public.profiles(id) on delete set null,
  creator_id          uuid references public.profiles(id) on delete set null,
  priority            text not null default 'MEDIUM' 
                      check (priority in ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status              text not null default 'TODO' 
                      check (status in ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
  start_date          date,
  due_date            date,
  estimated_hours     numeric default 0,
  actual_hours        numeric default 0,
  progress            integer not null default 0 check (progress >= 0 and progress <= 100),
  tags                text[] default array[]::text[],
  blocked_reason      text,
  display_order       integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_tasks_org_status on public.tasks(organization_id, status);
create index if not exists idx_tasks_org_assignee on public.tasks(organization_id, assignee_id);
create index if not exists idx_tasks_project on public.tasks(organization_id, project_id);
create index if not exists idx_tasks_team on public.tasks(organization_id, team_id);
create index if not exists idx_tasks_due_date on public.tasks(organization_id, due_date);

-- 4. TASK SUBTASKS
create table if not exists public.task_subtasks (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  task_id             uuid not null references public.tasks(id) on delete cascade,
  title               text not null,
  is_completed        boolean not null default false,
  assignee_id         uuid references public.profiles(id) on delete set null,
  due_date            date,
  display_order       integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_task_subtasks_task on public.task_subtasks(organization_id, task_id);

-- 5. TASK COMMENTS
create table if not exists public.task_comments (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  task_id             uuid not null references public.tasks(id) on delete cascade,
  author_id           uuid not null references public.profiles(id) on delete cascade,
  content             text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_task_comments_task on public.task_comments(organization_id, task_id);

-- 6. TASK WORK UPDATES
create table if not exists public.task_work_updates (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  task_id             uuid not null references public.tasks(id) on delete cascade,
  employee_id         uuid not null references public.profiles(id) on delete cascade,
  summary             text not null,
  hours_spent         numeric default 0,
  progress_percent    integer check (progress_percent >= 0 and progress_percent <= 100),
  blockers            text,
  date                date not null default current_date,
  created_at          timestamptz not null default now()
);

create index if not exists idx_task_work_updates_task on public.task_work_updates(organization_id, task_id);
create index if not exists idx_task_work_updates_emp on public.task_work_updates(organization_id, employee_id);

-- ============================================================
-- ROW LEVEL SECURITY (Strict Multi-Tenant Isolation)
-- ============================================================

-- PROJECTS
alter table public.projects enable row level security;
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "projects_modify" on public.projects;
create policy "projects_modify" on public.projects for all using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR', 'MANAGER'))
);

-- PROJECT MEMBERS
alter table public.project_members enable row level security;
drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select" on public.project_members for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "project_members_modify" on public.project_members;
create policy "project_members_modify" on public.project_members for all using (
  public.is_super_admin() or (organization_id = public.auth_org_id() and public.auth_role() in ('ADMIN', 'HR', 'MANAGER'))
);

-- TASKS
alter table public.tasks enable row level security;
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "tasks_modify" on public.tasks;
create policy "tasks_modify" on public.tasks for all using (
  public.is_super_admin() or (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('ADMIN', 'HR', 'MANAGER')
      or assignee_id::text = auth.uid()::text
      or creator_id::text = auth.uid()::text
    )
  )
);

-- TASK SUBTASKS
alter table public.task_subtasks enable row level security;
drop policy if exists "task_subtasks_select" on public.task_subtasks;
create policy "task_subtasks_select" on public.task_subtasks for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "task_subtasks_modify" on public.task_subtasks;
create policy "task_subtasks_modify" on public.task_subtasks for all using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);

-- TASK COMMENTS
alter table public.task_comments enable row level security;
drop policy if exists "task_comments_select" on public.task_comments;
create policy "task_comments_select" on public.task_comments for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "task_comments_modify" on public.task_comments;
create policy "task_comments_modify" on public.task_comments for all using (
  public.is_super_admin() or (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('ADMIN', 'HR', 'MANAGER')
      or author_id::text = auth.uid()::text
    )
  )
);

-- TASK WORK UPDATES
alter table public.task_work_updates enable row level security;
drop policy if exists "task_work_updates_select" on public.task_work_updates;
create policy "task_work_updates_select" on public.task_work_updates for select using (
  public.is_super_admin() or organization_id = public.auth_org_id()
);
drop policy if exists "task_work_updates_modify" on public.task_work_updates;
create policy "task_work_updates_modify" on public.task_work_updates for all using (
  public.is_super_admin() or (
    organization_id = public.auth_org_id() and (
      public.auth_role() in ('ADMIN', 'HR', 'MANAGER')
      or employee_id::text = auth.uid()::text
    )
  )
);

-- ============================================================
-- SEED WORK MANAGEMENT PERMISSIONS
-- ============================================================
insert into public.permissions (code, module, name, description)
values
  ('projects.view', 'work', 'View Projects', 'View organization project directory and details'),
  ('projects.create', 'work', 'Create Projects', 'Create new organization projects'),
  ('projects.edit', 'work', 'Edit Projects', 'Edit project details, milestones, and status'),
  ('projects.delete', 'work', 'Delete Projects', 'Delete projects'),
  ('tasks.view', 'work', 'View Tasks', 'View company, team, or assigned tasks'),
  ('tasks.create', 'work', 'Create Tasks', 'Create new tasks and assign to team members'),
  ('tasks.edit', 'work', 'Edit Tasks', 'Edit tasks, update status, and log progress'),
  ('tasks.delete', 'work', 'Delete Tasks', 'Delete tasks'),
  ('tasks.review', 'work', 'Review Tasks', 'Approve and review submitted task deliverables')
on conflict (code) do nothing;
