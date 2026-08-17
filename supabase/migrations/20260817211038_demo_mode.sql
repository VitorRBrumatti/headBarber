-- Shared demo accounts are intentionally read-mostly. The restriction lives in
-- the database so bypassing the dashboard UI does not unlock tenant mutations.

alter table public.profiles
  add column if not exists demo_mode boolean not null default false;

comment on column public.profiles.demo_mode is
  'Marks a shared, read-mostly product demonstration account.';

create schema if not exists private;

create or replace function private.reject_demo_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_is_demo boolean;
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select coalesce(profile.demo_mode, false)
    into v_is_demo
  from public.profiles as profile
  where profile.id = auth.uid();

  if v_is_demo then
    raise exception using
      errcode = '42501',
      message = 'DEMO_MODE_READ_ONLY',
      detail = 'Esta ação está protegida no ambiente de demonstração.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.reject_demo_mutation() from public, anon, authenticated;

-- Catalog, staff, settings, finance and subscription data are fully protected.
do $$
declare
  table_name text;
  protected_tables text[] := array[
    'barbershops',
    'profiles',
    'services',
    'barbers',
    'add_ons',
    'products',
    'barber_work_hours',
    'barber_blocked_times',
    'barbershop_settings',
    'barber_services',
    'barber_add_ons',
    'revenues',
    'expenses',
    'product_sales',
    'subscriptions',
    'subscription_plans',
    'subscription_plan_items',
    'client_subscriptions',
    'subscription_cycles',
    'subscription_cycle_entitlements',
    'appointment_subscription_allocations'
  ];
begin
  foreach table_name in array protected_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop trigger if exists reject_demo_mutation on public.%I', table_name);
      execute format(
        'create trigger reject_demo_mutation before insert or update or delete on public.%I for each row execute function private.reject_demo_mutation()',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Creating an appointment may create a client and its booking line items. Those
-- inserts are the only dashboard mutations available to a demo visitor.
do $$
declare
  table_name text;
  booking_tables text[] := array[
    'clients',
    'appointments',
    'appointment_add_ons',
    'appointment_products'
  ];
begin
  foreach table_name in array booking_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop trigger if exists reject_demo_update_or_delete on public.%I', table_name);
      execute format(
        'create trigger reject_demo_update_or_delete before update or delete on public.%I for each row execute function private.reject_demo_mutation()',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- Resets volatile demo activity while preserving the small curated catalog.
-- Only the service role can call this function (for a scheduled job or script).
create or replace function public.reset_demo_activity(p_barbershop_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
    notes = excluded.notes;

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

revoke all on function public.reset_demo_activity(uuid) from public, anon, authenticated;
grant execute on function public.reset_demo_activity(uuid) to service_role;
