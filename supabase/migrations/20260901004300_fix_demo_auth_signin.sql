-- Supabase Auth may add/update operational sign-in columns over time. Protect a
-- deny-list of credential fields instead of rejecting every unknown column.
create or replace function private.demo_auth_sensitive_user_fields(p_user jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(pg_catalog.jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  from pg_catalog.jsonb_each(p_user) as entry
  where entry.key = any(array[
    'instance_id', 'aud', 'role',
    'email', 'encrypted_password', 'phone',
    'raw_app_meta_data', 'raw_user_meta_data',
    'confirmation_token', 'recovery_token', 'reauthentication_token',
    'email_change', 'email_change_token_new', 'email_change_token_current',
    'phone_change', 'phone_change_token',
    'banned_until', 'deleted_at', 'is_anonymous'
  ]::text[])
$$;

revoke all on function private.demo_auth_sensitive_user_fields(jsonb)
from public, anon, authenticated, service_role;

create or replace function private.protect_demo_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.demo_accounts where user_id = old.id) then
    if tg_op = 'DELETE' or
      private.demo_auth_sensitive_user_fields(to_jsonb(new)) is distinct from
      private.demo_auth_sensitive_user_fields(to_jsonb(old)) then
      raise exception using errcode = '42501', message = 'DEMO_AUTH_LOCKED';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_demo_auth_user()
from public, anon, authenticated, service_role;

-- Linking/unlinking an identity remains forbidden. Updates are internal Auth
-- maintenance; browser roles have no direct privileges on auth.identities.
create or replace function private.protect_demo_auth_factor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.demo_accounts d
    where (tg_op <> 'INSERT' and d.user_id = old.user_id)
       or (tg_op <> 'DELETE' and d.user_id = new.user_id)
  ) and (tg_table_name <> 'identities' or tg_op <> 'UPDATE') then
    raise exception using errcode = '42501', message = 'DEMO_AUTH_LOCKED';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.protect_demo_auth_factor()
from public, anon, authenticated, service_role;
