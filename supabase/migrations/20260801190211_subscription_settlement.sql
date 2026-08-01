-- Transactional terminal-state handling for subscription-aware appointments.

create or replace function public.sync_appointment_to_revenue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_description text;
  v_client_name text;
  v_settlement_enabled boolean;
begin
  select coalesce(settings.client_subscriptions_settlement_enabled, false)
  into v_settlement_enabled
  from public.barbershop_settings as settings
  where settings.barbershop_id = new.barbershop_id;

  if coalesce(v_settlement_enabled, false) then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'completed'
      and old.status is distinct from 'completed'
    then
      select client.name
      into v_client_name
      from public.clients as client
      where client.id = new.client_id;

      v_description := 'Atendimento concluído: '
        || coalesce(v_client_name, 'Cliente Avulso');

      insert into public.revenues(
        barbershop_id,
        category,
        description,
        amount,
        date,
        reference_id,
        payment_method,
        source
      ) values (
        new.barbershop_id,
        'service',
        v_description,
        new.amount_due,
        (new.start_at at time zone 'UTC')::date,
        new.id,
        'pix',
        'appointment_service'
      )
      on conflict (barbershop_id, source, reference_id)
        where source <> 'manual' and reference_id is not null
      do nothing;
    elsif new.status <> 'completed' and old.status = 'completed' then
      delete from public.revenues as revenue
      where revenue.barbershop_id = new.barbershop_id
        and revenue.reference_id = new.id
        and revenue.source = 'appointment_service';
    end if;

    if new.status = 'completed'
      and old.status = 'completed'
      and (
        new.amount_due is distinct from old.amount_due
        or new.start_at is distinct from old.start_at
      )
    then
      update public.revenues as revenue
      set amount = new.amount_due,
          date = (new.start_at at time zone 'UTC')::date
      where revenue.barbershop_id = new.barbershop_id
        and revenue.reference_id = new.id
        and revenue.source = 'appointment_service';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.settle_appointment(
  p_appointment_id uuid,
  p_target_status text,
  p_payment_method text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_appointment public.appointments%rowtype;
  v_product record;
  v_product_sale_id uuid;
  v_service_revenue_id uuid;
  v_product_sale_count integer := 0;
  v_entitlement_ids uuid[] := array[]::uuid[];
  v_entitlement_id uuid;
  v_product_subtotal numeric(10,2) := 0;
  v_settlement_enabled boolean;
begin
  if auth.uid() is null then
    raise exception using message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using message = 'FORBIDDEN';
  end if;

  if p_target_status not in ('completed','cancelled','no_show') then
    raise exception using message = 'INVALID_STATUS_TRANSITION';
  end if;

  select appointment.*
  into v_appointment
  from public.appointments as appointment
  where appointment.id = p_appointment_id
    and appointment.barbershop_id = v_tenant_id
  for update;

  if not found then
    raise exception using message = 'APPOINTMENT_NOT_FOUND';
  end if;

  select coalesce(settings.client_subscriptions_settlement_enabled, false)
  into v_settlement_enabled
  from public.barbershop_settings as settings
  where settings.barbershop_id = v_tenant_id;

  if not coalesce(v_settlement_enabled, false) then
    raise exception using message = 'SETTLEMENT_DISABLED';
  end if;

  if v_appointment.status = p_target_status then
    select coalesce(sum(
      appointment_product.quantity * appointment_product.unit_price
    ), 0)
    into v_product_subtotal
    from public.appointment_products as appointment_product
    where appointment_product.appointment_id = v_appointment.id
      and appointment_product.status = 'sold';

    select revenue.id
    into v_service_revenue_id
    from public.revenues as revenue
    where revenue.barbershop_id = v_tenant_id
      and revenue.source = 'appointment_service'
      and revenue.reference_id = v_appointment.id;

    select count(*)::integer
    into v_product_sale_count
    from public.product_sales as sale
    where sale.appointment_id = v_appointment.id;

    return jsonb_build_object(
      'appointmentId', v_appointment.id,
      'status', v_appointment.status,
      'attendanceTotal', v_appointment.total_price,
      'subscriptionCoveredTotal', v_appointment.subscription_covered_total,
      'amountDue', v_appointment.amount_due,
      'productSubtotal', v_product_subtotal,
      'paymentMethod', p_payment_method,
      'serviceRevenueId', v_service_revenue_id,
      'productSaleCount', v_product_sale_count
    );
  end if;

  if v_appointment.status not in ('pending', 'confirmed') then
    raise exception using message = 'INVALID_STATUS_TRANSITION';
  end if;

  if p_target_status = 'completed'
    and p_payment_method not in (
      'money', 'pix', 'credit_card', 'debit_card', 'other'
    )
  then
    raise exception using message = 'INVALID_PAYMENT';
  end if;

  if p_target_status = 'completed' then
    update public.appointment_subscription_allocations as allocation
    set status = 'consumed',
        consumed_at = timezone('utc', now()),
        released_at = null
    where allocation.appointment_id = v_appointment.id
      and allocation.barbershop_id = v_tenant_id
      and allocation.status = 'reserved';

    update public.appointment_subscription_allocations as allocation
    set status = 'released',
        released_at = timezone('utc', now())
    where allocation.appointment_id = v_appointment.id
      and allocation.barbershop_id = v_tenant_id
      and allocation.status = 'waiting';

    update public.appointments
    set status = 'completed'
    where id = v_appointment.id;

    if v_appointment.amount_due > 0 then
      insert into public.revenues(
        barbershop_id,
        category,
        description,
        amount,
        date,
        reference_id,
        payment_method,
        source
      ) values (
        v_tenant_id,
        'service',
        'Atendimento concluído',
        v_appointment.amount_due,
        (v_appointment.start_at at time zone 'UTC')::date,
        v_appointment.id,
        p_payment_method,
        'appointment_service'
      )
      on conflict (barbershop_id, source, reference_id)
        where source <> 'manual' and reference_id is not null
      do nothing
      returning id into v_service_revenue_id;

      if v_service_revenue_id is null then
        select revenue.id
        into v_service_revenue_id
        from public.revenues as revenue
        where revenue.barbershop_id = v_tenant_id
          and revenue.source = 'appointment_service'
          and revenue.reference_id = v_appointment.id;
      end if;
    end if;

    for v_product in
      select appointment_product.*
      from public.appointment_products as appointment_product
      where appointment_product.appointment_id = v_appointment.id
        and appointment_product.barbershop_id = v_tenant_id
        and appointment_product.status = 'reserved'
      order by appointment_product.id
      for update
    loop
      insert into public.product_sales(
        barbershop_id,
        product_id,
        client_id,
        quantity,
        unit_price,
        total_price,
        payment_method,
        appointment_id,
        appointment_product_id
      ) values (
        v_tenant_id,
        v_product.product_id,
        v_appointment.client_id,
        v_product.quantity,
        v_product.unit_price,
        v_product.quantity * v_product.unit_price,
        p_payment_method,
        v_appointment.id,
        v_product.id
      )
      on conflict (appointment_product_id)
        where appointment_product_id is not null
      do nothing
      returning id into v_product_sale_id;

      if v_product_sale_id is not null then
        insert into public.revenues(
          barbershop_id,
          category,
          description,
          amount,
          date,
          reference_id,
          payment_method,
          source
        ) values (
          v_tenant_id,
          'product',
          'Produto vendido no atendimento',
          v_product.quantity * v_product.unit_price,
          (v_appointment.start_at at time zone 'UTC')::date,
          v_product_sale_id,
          p_payment_method,
          'appointment_product'
        )
        on conflict (barbershop_id, source, reference_id)
          where source <> 'manual' and reference_id is not null
        do nothing;

        v_product_sale_count := v_product_sale_count + 1;
      end if;
    end loop;

    update public.appointment_products
    set status = 'sold',
        updated_at = timezone('utc', now())
    where appointment_id = v_appointment.id
      and barbershop_id = v_tenant_id
      and status = 'reserved';
  elsif p_target_status = 'cancelled' then
    select coalesce(array_agg(allocation.cycle_entitlement_id), array[]::uuid[])
    into v_entitlement_ids
    from public.appointment_subscription_allocations as allocation
    where allocation.appointment_id = v_appointment.id
      and allocation.barbershop_id = v_tenant_id
      and allocation.status = 'reserved';

    update public.appointment_subscription_allocations
    set status = 'released',
        released_at = timezone('utc', now())
    where appointment_id = v_appointment.id
      and barbershop_id = v_tenant_id
      and status in ('reserved', 'waiting');

    update public.appointments
    set status = 'cancelled'
    where id = v_appointment.id;

    foreach v_entitlement_id in array v_entitlement_ids
    loop
      perform private.promote_waiting_subscription_allocation(
        v_entitlement_id
      );
    end loop;
  else
    update public.appointment_subscription_allocations
    set status = 'consumed',
        consumed_at = timezone('utc', now()),
        released_at = null
    where appointment_id = v_appointment.id
      and barbershop_id = v_tenant_id
      and status = 'reserved';

    update public.appointment_subscription_allocations
    set status = 'released',
        released_at = timezone('utc', now())
    where appointment_id = v_appointment.id
      and barbershop_id = v_tenant_id
      and status = 'waiting';

    update public.products as product
    set stock_quantity = product.stock_quantity + released.quantity,
        updated_at = timezone('utc', now())
    from (
      select appointment_product.product_id,
             sum(appointment_product.quantity)::integer as quantity
      from public.appointment_products as appointment_product
      where appointment_product.appointment_id = v_appointment.id
        and appointment_product.status = 'reserved'
      group by appointment_product.product_id
    ) as released
    where product.id = released.product_id
      and product.barbershop_id = v_tenant_id;

    update public.appointment_products
    set status = 'released',
        updated_at = timezone('utc', now())
    where appointment_id = v_appointment.id
      and barbershop_id = v_tenant_id
      and status = 'reserved';

    update public.appointments
    set status = 'no_show'
    where id = v_appointment.id;
  end if;

  perform private.recalculate_appointment_subscription_totals(
    v_appointment.id
  );

  select appointment.*
  into v_appointment
  from public.appointments as appointment
  where appointment.id = v_appointment.id;

  select coalesce(sum(
    appointment_product.quantity * appointment_product.unit_price
  ), 0)
  into v_product_subtotal
  from public.appointment_products as appointment_product
  where appointment_product.appointment_id = v_appointment.id
    and appointment_product.status = 'sold';

  return jsonb_build_object(
    'appointmentId', v_appointment.id,
    'status', v_appointment.status,
    'attendanceTotal', v_appointment.total_price,
    'subscriptionCoveredTotal', v_appointment.subscription_covered_total,
    'amountDue', v_appointment.amount_due,
    'productSubtotal', v_product_subtotal,
    'paymentMethod', p_payment_method,
    'serviceRevenueId', v_service_revenue_id,
    'productSaleCount', v_product_sale_count
  );
end;
$$;

revoke all on function public.settle_appointment(uuid,text,text)
from public, anon;
grant execute on function public.settle_appointment(uuid,text,text)
to authenticated, service_role;
