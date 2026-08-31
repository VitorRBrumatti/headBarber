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

  -- Serialize with normal bookings for this barber, then derive each seed slot
  -- from the actual work schedule instead of assuming fixed clock hours.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(v_barber_id::text));

  for i in 1..4 loop
    select slot.start_at
      into v_start
    from pg_catalog.generate_series(
      current_date::timestamp,
      (current_date + 13)::timestamp,
      interval '1 day'
    ) as demo_day(day_start)
    join public.barber_work_hours as wh
      on wh.barbershop_id = p_barbershop_id
      and wh.barber_id = v_barber_id
      and wh.day_of_week = extract(dow from demo_day.day_start)::integer
      and wh.is_active = true
    cross join lateral pg_catalog.generate_series(
      demo_day.day_start + wh.start_time,
      demo_day.day_start + wh.end_time - pg_catalog.make_interval(mins => v_service_duration),
      interval '30 minutes'
    ) as slot(start_at)
    where (
      wh.lunch_start_time is null
      or wh.lunch_end_time is null
      or not (
        slot.start_at::time < wh.lunch_end_time
        and (slot.start_at + pg_catalog.make_interval(mins => v_service_duration))::time > wh.lunch_start_time
      )
    )
    and not exists (
      select 1 from public.barber_blocked_times as bt
      where bt.barbershop_id = p_barbershop_id
        and bt.barber_id = v_barber_id
        and bt.start_at < slot.start_at + pg_catalog.make_interval(mins => v_service_duration)
        and bt.end_at > slot.start_at
    )
    and not exists (
      select 1 from public.appointments as existing
      where existing.barbershop_id = p_barbershop_id
        and existing.barber_id = v_barber_id
        and existing.status not in ('cancelled', 'no_show')
        and existing.start_at < slot.start_at + pg_catalog.make_interval(mins => v_service_duration)
        and existing.end_at > slot.start_at
    )
    order by slot.start_at
    limit 1;

    if v_start is null then
      raise exception using errcode = '22023', message = 'DEMO_SEED_NO_AVAILABLE_SLOT';
    end if;
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
