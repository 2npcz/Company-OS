-- ============================================================
-- EcoGlobal Trading BD — Complete Admin Fix Script
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vxxhziyepxddxiptfqab/sql
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Fix GoTrue scanner crash: replace all NULL token columns with ''
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  encrypted_password = crypt('EcoGlobal2026!', gen_salt('bf'))
where email = 'admin@ecoglobalbd.com';

-- 2. Ensure auth.identities exists for admin@ecoglobalbd.com
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select 
  u.id,
  u.id,
  json_build_object('sub', u.id::text, 'email', u.email)::jsonb,
  'email',
  u.email,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'admin@ecoglobalbd.com'
on conflict (provider, provider_id) do update set
  updated_at = now();

-- 3. Ensure EcoGlobal Trading BD organization exists
insert into public.organizations (name, subscription_status)
values ('EcoGlobal Trading BD', 'ACTIVE')
on conflict do nothing;

-- 4. Ensure public.profiles has verified = true and role = ADMIN
insert into public.profiles (
  id,
  name,
  email,
  role,
  organization_id,
  verified,
  status
)
select 
  u.id,
  'Admin EcoGlobal',
  u.email,
  'ADMIN',
  (select id from public.organizations where name = 'EcoGlobal Trading BD' limit 1),
  true,
  'ACTIVE'
from auth.users u
where u.email = 'admin@ecoglobalbd.com'
on conflict (id) do update set
  name = 'Admin EcoGlobal',
  email = 'admin@ecoglobalbd.com',
  role = 'ADMIN',
  organization_id = (select id from public.organizations where name = 'EcoGlobal Trading BD' limit 1),
  verified = true,
  status = 'ACTIVE';

-- 5. Safe pass-through for custom_access_token_hook
grant usage on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  return event;
end;
$$;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
