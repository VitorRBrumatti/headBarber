-- Subscription-aware booking expansion. Legacy booking RPCs intentionally remain
-- available while the feature flag is disabled.

create or replace function private.create_appointment_with_entitlements(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb,
  p_preview boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.barber_services%rowtype;
  v_add_ons jsonb := coalesce(p_add_ons, '[]'::jsonb);
  v_products jsonb := coalesce(p_products, '[]'::jsonb);
  v_add_on_duration integer;
  v_add_on_total numeric(10,2);
  v_product_total numeric(10,2) := 0;
  v_attendance_total numeric(10,2);
  v_covered_total numeric(10,2) := 0;
  v_amount_due numeric(10,2);
  v_bad_products jsonb;
  v_phone text;
  v_client_id uuid;
  v_open_subscription_id uuid;
  v_cycle_id uuid;
  v_plan_name text;
  v_appointment_id uuid;
  v_end_at timestamptz;
  v_coverage_status text := 'none';
  v_has_waiting boolean := false;
  v_entitlement record;
  v_used_count integer;
  v_allocation_status text;
begin
  if p_barbershop_id is null
    or p_barber_service_id is null
    or p_configuration_version is null
    or p_start_at is null
  then
    raise exception using message = 'INVALID_BOOKING';
  end if;

  if not p_preview and (
    nullif(btrim(coalesce(p_client_name, '')), '') is null
    or nullif(regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g'), '') is null
  ) then
    raise exception using message = 'INVALID_CLIENT';
  end if;

  if jsonb_typeof(v_products) <> 'array' or exists(
    select 1
    from jsonb_to_recordset(v_products)
      x("productId" uuid, quantity integer)
    where x."productId" is null
       or x.quantity is null
       or x.quantity <= 0
  ) or exists(
    select 1
    from jsonb_to_recordset(v_products)
      x("productId" uuid, quantity integer)
    group by x."productId"
    having count(*) > 1
  ) then
    raise exception using message = 'INVALID_PRODUCTS';
  end if;

  select barber_service.*
  into v_service
  from public.barber_services as barber_service
  join public.barbers as barber
    on barber.id = barber_service.barber_id
   and barber.barbershop_id = barber_service.barbershop_id
   and barber.is_active
  join public.services as service
    on service.id = barber_service.service_id
   and service.barbershop_id = barber_service.barbershop_id
   and service.is_active
  where barber_service.id = p_barber_service_id
    and barber_service.barbershop_id = p_barbershop_id
    and barber_service.is_available
  for update of barber_service;

  if not found then
    raise exception using message = 'INVALID_BARBER_SERVICE';
  end if;
  if v_service.configuration_version <> p_configuration_version then
    raise exception using message = 'CONFIG_CHANGED';
  end if;

  v_add_on_duration := private.get_selected_barber_add_on_duration(
    p_barbershop_id,
    v_service.barber_id,
    v_add_ons
  );

  select coalesce(sum(barber_add_on.price), 0)
  into v_add_on_total
  from public.barber_add_ons as barber_add_on
  join jsonb_to_recordset(v_add_ons)
    selection("barberAddOnId" uuid, "configurationVersion" bigint)
    on selection."barberAddOnId" = barber_add_on.id
  where barber_add_on.barbershop_id = p_barbershop_id
    and barber_add_on.barber_id = v_service.barber_id;

  perform product.id
  from public.products as product
  join jsonb_to_recordset(v_products)
    selection("productId" uuid, quantity integer)
    on selection."productId" = product.id
  order by product.id
  for update of product;

  select jsonb_agg(
    jsonb_build_object(
      'productId', selection."productId",
      'availableQuantity', coalesce(product.stock_quantity, 0)
    )
  )
  into v_bad_products
  from jsonb_to_recordset(v_products)
    selection("productId" uuid, quantity integer)
  left join public.products as product
    on product.id = selection."productId"
   and product.barbershop_id = p_barbershop_id
   and product.is_active
  where product.id is null
     or product.stock_quantity < selection.quantity;

  if v_bad_products is not null then
    raise exception using
      message = 'INSUFFICIENT_STOCK',
      detail = v_bad_products::text;
  end if;

  select coalesce(sum(selection.quantity * product.sale_price), 0)
  into v_product_total
  from jsonb_to_recordset(v_products)
    selection("productId" uuid, quantity integer)
  join public.products as product
    on product.id = selection."productId"
   and product.barbershop_id = p_barbershop_id;

  v_attendance_total := v_service.price + v_add_on_total;
  v_end_at := p_start_at + make_interval(
    mins => v_service.duration_minutes + v_add_on_duration
  );

  perform private.assert_bookable_appointment_interval(
    null,
    p_barbershop_id,
    v_service.barber_id,
    v_service.id,
    p_start_at,
    v_end_at,
    'confirmed',
    v_service.service_id
  );

  v_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  select client.id
  into v_client_id
  from public.clients as client
  where client.barbershop_id = p_barbershop_id
    and client.normalized_phone = v_phone
  order by client.id
  limit 1;

  if v_client_id is not null then
    select subscription.id
    into v_open_subscription_id
    from public.client_subscriptions as subscription
    where subscription.barbershop_id = p_barbershop_id
      and subscription.client_id = v_client_id
      and subscription.status in ('active', 'paused')
    order by subscription.created_at desc, subscription.id
    limit 1;

    select cycle.id, cycle.plan_name_snapshot
    into v_cycle_id, v_plan_name
    from public.subscription_cycles as cycle
    join public.client_subscriptions as subscription
      on subscription.id = cycle.client_subscription_id
     and subscription.barbershop_id = cycle.barbershop_id
    where cycle.barbershop_id = p_barbershop_id
      and subscription.client_id = v_client_id
      and cycle.status = 'paid'
      and (p_start_at at time zone 'UTC')::date >= cycle.period_start
      and (p_start_at at time zone 'UTC')::date < cycle.period_end
    order by cycle.period_start desc, cycle.id
    limit 1;
  end if;

  if v_cycle_id is not null then
    for v_entitlement in
      select
        entitlement.*,
        case
          when entitlement.item_type = 'service' then v_service.price
          else coalesce((
            select sum(barber_add_on.price)
            from public.barber_add_ons as barber_add_on
            join jsonb_to_recordset(v_add_ons)
              selection("barberAddOnId" uuid, "configurationVersion" bigint)
              on selection."barberAddOnId" = barber_add_on.id
            where barber_add_on.add_on_id = entitlement.add_on_id
              and barber_add_on.barbershop_id = p_barbershop_id
          ), 0)
        end as eligible_amount
      from public.subscription_cycle_entitlements as entitlement
      where entitlement.cycle_id = v_cycle_id
        and entitlement.barbershop_id = p_barbershop_id
        and (
          (entitlement.item_type = 'service'
            and entitlement.service_id = v_service.service_id)
          or
          (entitlement.item_type = 'add_on' and exists (
            select 1
            from public.barber_add_ons as barber_add_on
            join jsonb_to_recordset(v_add_ons)
              selection("barberAddOnId" uuid, "configurationVersion" bigint)
              on selection."barberAddOnId" = barber_add_on.id
            where barber_add_on.add_on_id = entitlement.add_on_id
              and barber_add_on.barbershop_id = p_barbershop_id
          ))
        )
      order by entitlement.id
      for update of entitlement
    loop
      select count(*)::integer
      into v_used_count
      from public.appointment_subscription_allocations as allocation
      where allocation.cycle_entitlement_id = v_entitlement.id
        and allocation.status in ('reserved', 'consumed');

      v_allocation_status := case
        when v_entitlement.monthly_limit is null
          or v_used_count < v_entitlement.monthly_limit
        then 'reserved'
        else 'waiting'
      end;

      if v_allocation_status = 'reserved' then
        v_covered_total := v_covered_total + greatest(v_entitlement.eligible_amount, 0);
      else
        v_has_waiting := true;
      end if;
    end loop;
  elsif v_open_subscription_id is not null then
    v_coverage_status := 'awaiting_cycle';
  end if;

  v_covered_total := least(v_attendance_total, v_covered_total);
  if v_cycle_id is not null then
    v_coverage_status := case
      when v_covered_total >= v_attendance_total and v_attendance_total > 0 then 'covered'
      when v_covered_total > 0 then 'partial'
      when v_has_waiting then 'waiting'
      else 'none'
    end;
  end if;
  v_amount_due := v_attendance_total - v_covered_total;

  if not p_preview then
    if v_client_id is null then
      insert into public.clients(barbershop_id, name, phone, email)
      values(p_barbershop_id, p_client_name, p_client_phone, p_client_email)
      returning id into v_client_id;
    end if;

    insert into public.appointments(
      barbershop_id,
      client_id,
      barber_id,
      service_id,
      barber_service_id,
      start_at,
      end_at,
      status,
      service_price,
      service_duration_minutes,
      total_price,
      notes,
      subscription_coverage_status
    ) values(
      p_barbershop_id,
      v_client_id,
      v_service.barber_id,
      v_service.service_id,
      v_service.id,
      p_start_at,
      v_end_at,
      'confirmed',
      v_service.price,
      v_service.duration_minutes,
      v_attendance_total,
      p_notes,
      v_coverage_status
    ) returning id into v_appointment_id;

    insert into public.appointment_add_ons(
      barbershop_id,
      appointment_id,
      add_on_id,
      barber_add_on_id,
      price,
      duration_minutes
    )
    select
      p_barbershop_id,
      v_appointment_id,
      barber_add_on.add_on_id,
      barber_add_on.id,
      barber_add_on.price,
      barber_add_on.duration_minutes
    from public.barber_add_ons as barber_add_on
    join jsonb_to_recordset(v_add_ons)
      selection("barberAddOnId" uuid, "configurationVersion" bigint)
      on selection."barberAddOnId" = barber_add_on.id;

    insert into public.appointment_products(
      barbershop_id,
      appointment_id,
      product_id,
      quantity,
      unit_price
    )
    select
      p_barbershop_id,
      v_appointment_id,
      product.id,
      selection.quantity,
      product.sale_price
    from jsonb_to_recordset(v_products)
      selection("productId" uuid, quantity integer)
    join public.products as product
      on product.id = selection."productId";

    update public.products as product
    set stock_quantity = product.stock_quantity - selection.quantity,
        updated_at = timezone('utc', now())
    from jsonb_to_recordset(v_products)
      selection("productId" uuid, quantity integer)
    where product.id = selection."productId";

    if v_cycle_id is not null then
      for v_entitlement in
        select
          entitlement.*,
          case
            when entitlement.item_type = 'service' then v_service.price
            else coalesce((
              select sum(appointment_add_on.price)
              from public.appointment_add_ons as appointment_add_on
              where appointment_add_on.appointment_id = v_appointment_id
                and appointment_add_on.add_on_id = entitlement.add_on_id
            ), 0)
          end as eligible_amount
        from public.subscription_cycle_entitlements as entitlement
        where entitlement.cycle_id = v_cycle_id
          and entitlement.barbershop_id = p_barbershop_id
          and (
            (entitlement.item_type = 'service'
              and entitlement.service_id = v_service.service_id)
            or
            (entitlement.item_type = 'add_on' and exists (
              select 1
              from public.appointment_add_ons as appointment_add_on
              where appointment_add_on.appointment_id = v_appointment_id
                and appointment_add_on.add_on_id = entitlement.add_on_id
            ))
          )
        order by entitlement.id
        for update of entitlement
      loop
        select count(*)::integer
        into v_used_count
        from public.appointment_subscription_allocations as allocation
        where allocation.cycle_entitlement_id = v_entitlement.id
          and allocation.status in ('reserved', 'consumed');

        v_allocation_status := case
          when v_entitlement.monthly_limit is null
            or v_used_count < v_entitlement.monthly_limit
          then 'reserved'
          else 'waiting'
        end;

        insert into public.appointment_subscription_allocations(
          barbershop_id,
          appointment_id,
          cycle_entitlement_id,
          item_type,
          service_id,
          add_on_id,
          covered_amount,
          status,
          reserved_at
        ) values (
          p_barbershop_id,
          v_appointment_id,
          v_entitlement.id,
          v_entitlement.item_type,
          v_entitlement.service_id,
          v_entitlement.add_on_id,
          greatest(v_entitlement.eligible_amount, 0),
          v_allocation_status,
          case when v_allocation_status = 'reserved'
            then timezone('utc', now()) end
        );
      end loop;

      perform private.recalculate_appointment_subscription_totals(v_appointment_id);
    end if;

    select
      appointment.subscription_covered_total,
      appointment.amount_due,
      appointment.subscription_coverage_status
    into v_covered_total, v_amount_due, v_coverage_status
    from public.appointments as appointment
    where appointment.id = v_appointment_id;
  end if;

  return jsonb_build_object(
    'appointmentId', v_appointment_id,
    'barberId', v_service.barber_id,
    'barberName', (
      select barber.name from public.barbers as barber
      where barber.id = v_service.barber_id
    ),
    'serviceId', v_service.service_id,
    'serviceName', (
      select service.name from public.services as service
      where service.id = v_service.service_id
    ),
    'servicePrice', to_char(v_service.price, 'FM999999990.00'),
    'serviceDurationMinutes', v_service.duration_minutes,
    'addOnDurationMinutes', v_add_on_duration,
    'addOnTotal', to_char(v_add_on_total, 'FM999999990.00'),
    'productSubtotal', to_char(v_product_total, 'FM999999990.00'),
    'attendanceTotal', to_char(v_attendance_total, 'FM999999990.00'),
    'subscriptionCoveredTotal', to_char(v_covered_total, 'FM999999990.00'),
    'amountDue', to_char(v_amount_due, 'FM999999990.00'),
    'subscriptionCoverageStatus', v_coverage_status,
    'subscriptionPlanName', v_plan_name,
    'totalAtShop', to_char(v_amount_due + v_product_total, 'FM999999990.00'),
    'startAt', to_char(
      p_start_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) || '+00:00',
    'endAt', to_char(
      v_end_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) || '+00:00'
  );
end;
$$;

create or replace function public.preview_public_booking_with_entitlements(
  p_barbershop_id uuid,
  p_client_phone text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.create_appointment_with_entitlements(
    p_barbershop_id, null, p_client_phone, null,
    p_barber_service_id, p_configuration_version, p_start_at, null,
    p_add_ons, p_products, true
  );
$$;

create or replace function public.create_public_booking_with_entitlements(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.create_appointment_with_entitlements(
    p_barbershop_id, p_client_name, p_client_phone, p_client_email,
    p_barber_service_id, p_configuration_version, p_start_at, p_notes,
    p_add_ons, p_products, false
  );
$$;

create or replace function public.create_admin_booking_with_entitlements(
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_barbershop_id uuid;
begin
  if auth.uid() is null then
    raise exception using message = 'UNAUTHENTICATED';
  end if;

  v_barbershop_id := public.get_user_barbershop_id(auth.uid());
  if v_barbershop_id is null or not public.has_active_subscription() then
    raise exception using message = 'FORBIDDEN';
  end if;

  return private.create_appointment_with_entitlements(
    v_barbershop_id, p_client_name, p_client_phone, p_client_email,
    p_barber_service_id, p_configuration_version, p_start_at, p_notes,
    p_add_ons, p_products, false
  );
end;
$$;

revoke all on function private.create_appointment_with_entitlements(
  uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb,boolean
) from public, anon, authenticated;

revoke all on function public.preview_public_booking_with_entitlements(
  uuid,text,uuid,bigint,timestamptz,jsonb,jsonb
) from public;
revoke all on function public.create_public_booking_with_entitlements(
  uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) from public;
revoke all on function public.create_admin_booking_with_entitlements(
  text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) from public, anon;

grant execute on function public.preview_public_booking_with_entitlements(
  uuid,text,uuid,bigint,timestamptz,jsonb,jsonb
) to anon, authenticated, service_role;
grant execute on function public.create_public_booking_with_entitlements(
  uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) to anon, authenticated, service_role;
grant execute on function public.create_admin_booking_with_entitlements(
  text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) to authenticated, service_role;
