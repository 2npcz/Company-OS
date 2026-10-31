-- ============================================================
-- EcoGlobal Trading BD — Complete Admin Account Setup & Fix
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vxxhziyepxddxiptfqab/sql
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Ensure public.custom_access_token_hook exists (prevents 500 error if Auth Hook is enabled)
grant usage on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return event;
end;
$$;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- 2. Ensure EcoGlobal Trading BD organization exists
insert into public.organizations (name, subscription_status)
values ('EcoGlobal Trading BD', 'ACTIVE')
on conflict do nothing;

-- 3. Create or update the admin user in auth.users AND auth.identities
do $$
declare
  v_org_id uuid;
  v_user_id uuid;
  v_email text := 'admin@ecoglobalbd.com';
  v_password text := 'EcoGlobal2026!';
  v_encrypted_pw text;
begin
  select id into v_org_id from public.organizations where name = 'EcoGlobal Trading BD' limit 1;
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
  end if;

  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  -- Upsert auth.users
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Admin EcoGlobal"}'::jsonb,
    false,
    now(),
    now()
  )
  on conflict (id) do update set
    encrypted_password = v_encrypted_pw,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
    updated_at = now();

  -- CRITICAL: Upsert auth.identities (Supabase GoTrue requires this or returns 500 {})
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id, v_email)::jsonb,
    'email',
    v_email,
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id) do update set
    user_id = v_user_id,
    updated_at = now();

  -- Upsert profile with verified = true and role = ADMIN
  insert into public.profiles (
    id,
    name,
    email,
    role,
    organization_id,
    verified,
    status
  ) values (
    v_user_id,
    'Admin EcoGlobal',
    v_email,
    'ADMIN',
    v_org_id,
    true,
    'ACTIVE'
  )
  on conflict (id) do update set
    name = 'Admin EcoGlobal',
    email = v_email,
    role = 'ADMIN',
    organization_id = v_org_id,
    verified = true,
    status = 'ACTIVE';

  raise notice '=========================================================';
  raise notice 'SUCCESS: Admin account ready for EcoGlobal Trading BD!';
  raise notice 'Email:    admin@ecoglobalbd.com';
  raise notice 'Password: EcoGlobal2026!';
  raise notice '=========================================================';
end $$;
