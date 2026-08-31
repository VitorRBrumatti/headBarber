-- No existing profile is implicitly trusted: registering a disposable tenant
-- is a separate service-role/operator action. This project supports ONE demo.
create table public.demo_accounts (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id),
  barbershop_id uuid not null unique references public.barbershops(id),
  created_at timestamptz not null default now()
);
alter table public.demo_accounts enable row level security;
revoke all on public.demo_accounts from public, anon, authenticated;
grant select, insert, update, delete on public.demo_accounts to service_role;

-- The image-upload feature added on main must not spend provider quota for demo
-- visitors. Its SECURITY DEFINER quota RPC still fires this actor-aware guard.
create trigger reject_demo_mutation before insert or update or delete on public.image_upload_attempts
  for each row execute function private.reject_demo_mutation();

create function private.validate_demo_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = new.user_id and p.barbershop_id = new.barbershop_id
      and p.demo_mode and p.role = 'owner'
      and u.email_confirmed_at is not null and coalesce(u.encrypted_password, '') <> ''
  ) or exists (
    select 1 from public.profiles
    where barbershop_id = new.barbershop_id and id <> new.user_id
  ) or exists (
    select 1 from public.subscriptions
    where user_id = new.user_id
      and (stripe_customer_id is not null or stripe_subscription_id is not null)
  ) or exists (select 1 from auth.mfa_factors where user_id = new.user_id) then
    raise exception using errcode = '42501', message = 'UNSAFE_DEMO_REGISTRATION';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_demo_registration() from public, anon, authenticated;
create trigger validate_demo_registration before insert or update on public.demo_accounts
  for each row execute function private.validate_demo_registration();

-- Own-row UPDATE permissions must not confer the ability to opt into demo mode
-- or to attach another account to the disposable tenant.
create function private.protect_demo_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_privileged boolean := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  ) = 'service_role' or (
    session_user in ('postgres', 'supabase_admin')
    and coalesce(nullif(current_setting('role', true), ''), 'none') in ('none', 'postgres', 'supabase_admin')
  );
begin
  if tg_op = 'UPDATE' and exists (
    select 1 from public.demo_accounts d where d.user_id = old.id
  ) and (new.id is distinct from old.id
    or new.barbershop_id is distinct from old.barbershop_id
    or new.demo_mode is distinct from old.demo_mode
    or new.role is distinct from old.role) then
    raise exception using errcode = '42501', message = 'DEMO_IDENTITY_LOCKED';
  end if;
  if exists (select 1 from public.demo_accounts d
      where d.barbershop_id = new.barbershop_id and d.user_id <> new.id) then
    raise exception using errcode = '42501', message = 'DEMO_TENANT_RESERVED';
  end if;
  if not v_privileged and (
    (tg_op = 'INSERT' and new.demo_mode)
    or (tg_op = 'UPDATE' and new.demo_mode is distinct from old.demo_mode)
  ) then
    raise exception using errcode = '42501', message = 'DEMO_FLAG_SERVER_ONLY';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_demo_profile() from public, anon, authenticated;
create trigger protect_demo_profile before insert or update on public.profiles
  for each row execute function private.protect_demo_profile();

-- Auth API writes run as supabase_auth_admin, not the browser's database role.
-- Do NOT exempt that role or service-role Auth calls. Only sign-in timestamps
-- may change while registered; credential rotation requires operator maintenance.
create function private.protect_demo_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.demo_accounts where user_id = old.id) then
    if tg_op = 'DELETE' or
      (to_jsonb(new) - array['last_sign_in_at', 'updated_at']) is distinct from
      (to_jsonb(old) - array['last_sign_in_at', 'updated_at']) then
      raise exception using errcode = '42501', message = 'DEMO_AUTH_LOCKED';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.protect_demo_auth_user() from public, anon, authenticated;
create trigger protect_demo_auth_user before update or delete on auth.users
  for each row execute function private.protect_demo_auth_user();

create function private.protect_demo_auth_factor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.demo_accounts d
    where (tg_op <> 'INSERT' and d.user_id = old.user_id)
      or (tg_op <> 'DELETE' and d.user_id = new.user_id)) then
    -- Email identity timestamps may be touched during password sign-in.
    if tg_table_name <> 'identities' or tg_op <> 'UPDATE' or
      (to_jsonb(new) - array['last_sign_in_at', 'updated_at']) is distinct from
      (to_jsonb(old) - array['last_sign_in_at', 'updated_at']) then
      raise exception using errcode = '42501', message = 'DEMO_AUTH_LOCKED';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.protect_demo_auth_factor() from public, anon, authenticated;
create trigger protect_demo_auth_factor before insert or update or delete on auth.mfa_factors
  for each row execute function private.protect_demo_auth_factor();
create trigger protect_demo_auth_identity before insert or update or delete on auth.identities
  for each row execute function private.protect_demo_auth_factor();

-- Retain the existing seed implementation, but remove every direct API grant.
alter function public.reset_demo_activity(uuid) set schema private;
revoke all on function private.reset_demo_activity(uuid) from public, anon, authenticated, service_role;

create function public.reset_demo_activity(p_barbershop_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  if coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  ) <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select user_id into v_user_id from public.demo_accounts
    where barbershop_id = p_barbershop_id for update;
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id
      and barbershop_id = p_barbershop_id and demo_mode and role = 'owner'
  ) or exists (
    select 1 from public.profiles where barbershop_id = p_barbershop_id and id <> v_user_id
  ) or exists (
    select 1 from public.subscriptions where user_id = v_user_id
      and (stripe_customer_id is not null or stripe_subscription_id is not null)
  ) then
    raise exception using errcode = '42501', message = 'NOT_A_REGISTERED_DEMO_TENANT';
  end if;
  -- Legacy seed IDs are global. Refuse any collision rather than update a real client.
  if exists (select 1 from public.clients where barbershop_id <> p_barbershop_id
    and id in ('d0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000102',
               'd0000000-0000-4000-8000-000000000103', 'd0000000-0000-4000-8000-000000000104')) then
    raise exception using errcode = '42501', message = 'DEMO_SEED_ID_COLLISION';
  end if;
  perform private.reset_demo_activity(p_barbershop_id);
end;
$$;
revoke all on function public.reset_demo_activity(uuid) from public, anon, authenticated;
grant execute on function public.reset_demo_activity(uuid) to service_role;

-- Guard ownership inside ON CONFLICT as well, so a concurrent insert cannot
-- turn the preflight check into a cross-tenant update. A mismatch rolls back
-- the entire reset transaction, including any preceding deletes.
create or replace function private.reset_demo_activity(p_barbershop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_seed_count integer;
  v_barber_service_id uuid;
  v_barber_id uuid;
  v_service_id uuid;
  v_service_price numeric(10, 2);
  v_service_duration integer;
  v_start timestamptz;
  v_client_ids uuid[] := array[
    'd0000000-0000-4000-8000-000000000101'::uuid,
    'd0000000-0000-4000-8000-000000000102'::uuid,
    'd0000000-0000-4000-8000-000000000103'::uuid,
    'd0000000-0000-4000-8000-000000000104'::uuid
  ];
begin
  if coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    coalesce(
      nullif(current_setting('request.jwt.claims', true), ''),
      '{}'
    )::jsonb ->> 'role'
  ) is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where barbershop_id = p_barbershop_id and demo_mode = true
  ) then
    raise exception using errcode = '22023', message = 'NOT_A_DEMO_TENANT';
  end if;

  delete from public.appointment_subscription_allocations
  where appointment_id in (
    select id from public.appointments where barbershop_id = p_barbershop_id
  );
  delete from public.appointment_products where barbershop_id = p_barbershop_id;
  delete from public.appointment_add_ons where barbershop_id = p_barbershop_id;
  delete from public.product_sales where barbershop_id = p_barbershop_id;
  delete from public.revenues where barbershop_id = p_barbershop_id;
  delete from public.expenses where barbershop_id = p_barbershop_id;
  delete from public.appointments where barbershop_id = p_barbershop_id;
  delete from public.clients
  where barbershop_id = p_barbershop_id and not (id = any(v_client_ids));

  insert into public.clients (id, barbershop_id, name, phone, email, notes)
  values
    (v_client_ids[1], p_barbershop_id, 'Ana Costa', '(11) 99910-0101', 'ana.demo@example.com', 'Cliente demonstrativa'),
    (v_client_ids[2], p_barbershop_id, 'Bruno Lima', '(11) 99910-0102', 'bruno.demo@example.com', null),
    (v_client_ids[3], p_barbershop_id, 'Caio Mendes', '(11) 99910-0103', 'caio.demo@example.com', null),
    (v_client_ids[4], p_barbershop_id, 'Diego Alves', '(11) 99910-0104', 'diego.demo@example.com', null)
  on conflict (id) do update set
    name = excluded.name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes
  where public.clients.barbershop_id = excluded.barbershop_id;

  get diagnostics v_seed_count = row_count;
  if v_seed_count <> 4 then
    raise exception using errcode = '42501', message = 'DEMO_SEED_ID_COLLISION';
  end if;

  select bs.id, bs.barber_id, bs.service_id, bs.price, bs.duration_minutes
    into v_barber_service_id, v_barber_id, v_service_id, v_service_price, v_service_duration
  from public.barber_services as bs
  where bs.barbershop_id = p_barbershop_id and bs.is_available = true
  order by bs.created_at
  limit 1;

  if v_barber_service_id is null then
    raise exception using errcode = '22023', message = 'DEMO_CATALOG_NOT_CONFIGURED';
  end if;

  for i in 1..4 loop
    v_start := date_trunc('day', now()) + make_interval(days => i - 1, hours => 9 + i);
    insert into public.appointments (
      barbershop_id,
      client_id,
      barber_id,
      service_id,
      barber_service_id,
      start_at,
      end_at,
      status,
      total_price,
      service_price,
      service_duration_minutes,
      notes
    ) values (
      p_barbershop_id,
      v_client_ids[i],
      v_barber_id,
      v_service_id,
      v_barber_service_id,
      v_start,
      v_start + make_interval(mins => v_service_duration),
      case when i = 1 then 'completed' else 'confirmed' end,
      v_service_price,
      v_service_price,
      v_service_duration,
      'Dado de demonstração'
    );
  end loop;

  insert into public.revenues (barbershop_id, category, description, amount, date, payment_method)
  values
    (p_barbershop_id, 'service', 'Atendimentos demonstrativos', 135.00, current_date, 'pix'),
    (p_barbershop_id, 'product', 'Venda de pomada', 38.00, current_date - 1, 'credit_card');

  insert into public.expenses (barbershop_id, category, description, amount, date, is_recurring)
  values
    (p_barbershop_id, 'products', 'Reposição de produtos', 42.00, current_date - 2, false);
end;
$$;
