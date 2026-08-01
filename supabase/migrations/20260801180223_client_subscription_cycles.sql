create or replace function private.recalculate_appointment_subscription_totals(
  p_appointment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_price numeric(10,2);
  v_covered_total numeric(10,2);
  v_has_waiting boolean;
  v_coverage_status text;
begin
  select appointment.total_price
  into v_total_price
  from public.appointments as appointment
  where appointment.id = p_appointment_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_APPOINTMENT';
  end if;

  select
    coalesce(sum(allocation.covered_amount) filter (
      where allocation.status in ('reserved', 'consumed')
    ), 0),
    coalesce(bool_or(allocation.status = 'waiting'), false)
  into v_covered_total, v_has_waiting
  from public.appointment_subscription_allocations as allocation
  where allocation.appointment_id = p_appointment_id;

  v_covered_total := least(v_total_price, v_covered_total);
  v_coverage_status := case
    when v_covered_total >= v_total_price and v_total_price > 0 then 'covered'
    when v_covered_total > 0 then 'partial'
    when v_has_waiting then 'waiting'
    else 'none'
  end;

  update public.appointments
  set subscription_covered_total = v_covered_total,
      subscription_coverage_status = v_coverage_status
  where id = p_appointment_id;
end;
$$;

create or replace function private.reconcile_subscription_cycle(
  p_cycle_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle record;
  v_entitlement record;
  v_appointment record;
  v_used_count integer;
  v_allocation_status text;
  v_inserted_status text;
  v_covered_amount numeric(10,2);
begin
  select
    cycle.id,
    cycle.barbershop_id,
    cycle.period_start,
    cycle.period_end,
    cycle.client_subscription_id,
    subscription.client_id
  into v_cycle
  from public.subscription_cycles as cycle
  join public.client_subscriptions as subscription
    on subscription.id = cycle.client_subscription_id
   and subscription.barbershop_id = cycle.barbershop_id
  where cycle.id = p_cycle_id
    and cycle.status = 'paid'
  for update of cycle;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_CYCLE';
  end if;

  for v_entitlement in
    select entitlement.*
    from public.subscription_cycle_entitlements as entitlement
    where entitlement.cycle_id = v_cycle.id
      and entitlement.barbershop_id = v_cycle.barbershop_id
    order by entitlement.id
    for update
  loop
    select count(*)::integer
    into v_used_count
    from public.appointment_subscription_allocations as allocation
    where allocation.cycle_entitlement_id = v_entitlement.id
      and allocation.status in ('reserved', 'consumed');

    for v_appointment in
      select
        appointment.id,
        appointment.start_at,
        appointment.service_price,
        case
          when v_entitlement.item_type = 'add_on' then coalesce((
            select sum(appointment_add_on.price)
            from public.appointment_add_ons as appointment_add_on
            where appointment_add_on.appointment_id = appointment.id
              and appointment_add_on.barbershop_id = appointment.barbershop_id
              and appointment_add_on.add_on_id = v_entitlement.add_on_id
          ), 0)
          else appointment.service_price
        end as eligible_amount
      from public.appointments as appointment
      where appointment.barbershop_id = v_cycle.barbershop_id
        and appointment.client_id = v_cycle.client_id
        and appointment.status in ('pending', 'confirmed')
        and appointment.start_at >= v_cycle.period_start::timestamptz
        and appointment.start_at < v_cycle.period_end::timestamptz
        and appointment.start_at >= timezone('utc', now())
        and (
          (v_entitlement.item_type = 'service'
            and appointment.service_id = v_entitlement.service_id)
          or
          (v_entitlement.item_type = 'add_on' and exists (
            select 1
            from public.appointment_add_ons as appointment_add_on
            where appointment_add_on.appointment_id = appointment.id
              and appointment_add_on.barbershop_id = appointment.barbershop_id
              and appointment_add_on.add_on_id = v_entitlement.add_on_id
          ))
        )
      order by appointment.start_at, appointment.id
    loop
      v_allocation_status := case
        when v_entitlement.monthly_limit is null
          or v_used_count < v_entitlement.monthly_limit
        then 'reserved'
        else 'waiting'
      end;
      v_covered_amount := greatest(v_appointment.eligible_amount, 0);
      v_inserted_status := null;

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
        v_cycle.barbershop_id,
        v_appointment.id,
        v_entitlement.id,
        v_entitlement.item_type,
        v_entitlement.service_id,
        v_entitlement.add_on_id,
        v_covered_amount,
        v_allocation_status,
        case when v_allocation_status = 'reserved'
          then timezone('utc', now()) end
      )
      on conflict (appointment_id, cycle_entitlement_id) do nothing
      returning status into v_inserted_status;

      if v_inserted_status = 'reserved' then
        v_used_count := v_used_count + 1;
      end if;

      perform private.recalculate_appointment_subscription_totals(v_appointment.id);
    end loop;
  end loop;
end;
$$;

create or replace function private.promote_waiting_subscription_allocation(
  p_cycle_entitlement_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement public.subscription_cycle_entitlements%rowtype;
  v_used_count integer;
  v_allocation_id uuid;
  v_appointment_id uuid;
begin
  select entitlement.*
  into v_entitlement
  from public.subscription_cycle_entitlements as entitlement
  where entitlement.id = p_cycle_entitlement_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_ENTITLEMENT';
  end if;

  if v_entitlement.monthly_limit is null then
    return null;
  end if;

  select count(*)::integer
  into v_used_count
  from public.appointment_subscription_allocations as allocation
  where allocation.cycle_entitlement_id = v_entitlement.id
    and allocation.status in ('reserved', 'consumed');

  if v_used_count >= v_entitlement.monthly_limit then
    return null;
  end if;

  select allocation.id, allocation.appointment_id
  into v_allocation_id, v_appointment_id
  from public.appointment_subscription_allocations as allocation
  join public.appointments as appointment
    on appointment.id = allocation.appointment_id
   and appointment.barbershop_id = allocation.barbershop_id
  where allocation.cycle_entitlement_id = v_entitlement.id
    and allocation.status = 'waiting'
    and appointment.status in ('pending', 'confirmed')
  order by appointment.start_at, appointment.id
  for update of allocation skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.appointment_subscription_allocations
  set status = 'reserved',
      reserved_at = timezone('utc', now()),
      consumed_at = null,
      released_at = null
  where id = v_allocation_id;

  perform private.recalculate_appointment_subscription_totals(v_appointment_id);
  return v_appointment_id;
end;
$$;

create or replace function public.register_client_subscription_payment(
  p_subscription_id uuid,
  p_period_start date,
  p_payment_method text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_subscription public.client_subscriptions%rowtype;
  v_plan public.subscription_plans%rowtype;
  v_cycle public.subscription_cycles%rowtype;
  v_cycle_id uuid;
  v_period_end date;
  v_revenue_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if p_period_start is null
    or p_payment_method not in ('money', 'pix', 'credit_card', 'debit_card', 'other')
  then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYMENT';
  end if;

  select subscription.*
  into v_subscription
  from public.client_subscriptions as subscription
  where subscription.id = p_subscription_id
    and subscription.barbershop_id = v_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_SUBSCRIPTION';
  end if;

  select cycle.*
  into v_cycle
  from public.subscription_cycles as cycle
  where cycle.client_subscription_id = v_subscription.id
    and cycle.period_start = p_period_start;

  if found then
    return jsonb_build_object(
      'cycleId', v_cycle.id,
      'subscriptionId', v_cycle.client_subscription_id,
      'periodStart', v_cycle.period_start,
      'periodEnd', v_cycle.period_end,
      'status', v_cycle.status,
      'planId', v_cycle.plan_id_snapshot,
      'amount', v_cycle.price_snapshot,
      'paymentMethod', v_cycle.payment_method,
      'revenueId', v_cycle.revenue_id
    );
  end if;

  if v_subscription.status <> 'active'
    or p_period_start < v_subscription.started_on
  then
    raise exception using errcode = 'P0001', message = 'INVALID_SUBSCRIPTION';
  end if;

  if p_period_start <> v_subscription.next_billing_date then
    raise exception using errcode = 'P0001', message = 'PAYMENT_CONFLICT';
  end if;

  select plan.*
  into v_plan
  from public.subscription_plans as plan
  where plan.id = coalesce(v_subscription.pending_plan_id, v_subscription.plan_id)
    and plan.barbershop_id = v_tenant_id
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  v_period_end := (p_period_start + interval '1 month')::date;

  insert into public.subscription_cycles(
    barbershop_id,
    client_subscription_id,
    period_start,
    period_end,
    status,
    plan_id_snapshot,
    plan_name_snapshot,
    price_snapshot,
    payment_method,
    paid_at
  ) values (
    v_tenant_id,
    v_subscription.id,
    p_period_start,
    v_period_end,
    'paid',
    v_plan.id,
    v_plan.name,
    v_plan.monthly_price,
    p_payment_method,
    timezone('utc', now())
  )
  on conflict (client_subscription_id, period_start) do nothing
  returning id into v_cycle_id;

  if v_cycle_id is null then
    select cycle.*
    into v_cycle
    from public.subscription_cycles as cycle
    where cycle.client_subscription_id = v_subscription.id
      and cycle.period_start = p_period_start;

    return jsonb_build_object(
      'cycleId', v_cycle.id,
      'subscriptionId', v_cycle.client_subscription_id,
      'periodStart', v_cycle.period_start,
      'periodEnd', v_cycle.period_end,
      'status', v_cycle.status,
      'planId', v_cycle.plan_id_snapshot,
      'amount', v_cycle.price_snapshot,
      'paymentMethod', v_cycle.payment_method,
      'revenueId', v_cycle.revenue_id
    );
  end if;

  insert into public.subscription_cycle_entitlements(
    barbershop_id,
    cycle_id,
    item_type,
    service_id,
    add_on_id,
    item_name_snapshot,
    monthly_limit
  )
  select
    v_tenant_id,
    v_cycle_id,
    item.item_type,
    item.service_id,
    item.add_on_id,
    case
      when item.item_type = 'service' then service.name
      else add_on.name
    end,
    item.monthly_limit
  from public.subscription_plan_items as item
  left join public.services as service
    on service.id = item.service_id
   and service.barbershop_id = item.barbershop_id
  left join public.add_ons as add_on
    on add_on.id = item.add_on_id
   and add_on.barbershop_id = item.barbershop_id
  where item.plan_id = v_plan.id
    and item.barbershop_id = v_tenant_id;

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
    'monthly_plan',
    'Assinatura - ' || v_plan.name,
    v_plan.monthly_price,
    current_date,
    v_cycle_id,
    p_payment_method,
    'subscription_cycle'
  )
  on conflict (barbershop_id, source, reference_id)
    where source <> 'manual' and reference_id is not null
  do nothing
  returning id into v_revenue_id;

  if v_revenue_id is null then
    select revenue.id
    into v_revenue_id
    from public.revenues as revenue
    where revenue.barbershop_id = v_tenant_id
      and revenue.source = 'subscription_cycle'
      and revenue.reference_id = v_cycle_id;
  end if;

  update public.subscription_cycles
  set revenue_id = v_revenue_id
  where id = v_cycle_id;

  update public.client_subscriptions
  set plan_id = v_plan.id,
      pending_plan_id = null,
      next_billing_date = v_period_end
  where id = v_subscription.id;

  perform private.reconcile_subscription_cycle(v_cycle_id);

  select cycle.*
  into v_cycle
  from public.subscription_cycles as cycle
  where cycle.id = v_cycle_id;

  return jsonb_build_object(
    'cycleId', v_cycle.id,
    'subscriptionId', v_cycle.client_subscription_id,
    'periodStart', v_cycle.period_start,
    'periodEnd', v_cycle.period_end,
    'status', v_cycle.status,
    'planId', v_cycle.plan_id_snapshot,
    'amount', v_cycle.price_snapshot,
    'paymentMethod', v_cycle.payment_method,
    'revenueId', v_cycle.revenue_id
  );
end;
$$;

revoke all on function private.recalculate_appointment_subscription_totals(uuid)
from public, anon, authenticated;
revoke all on function private.reconcile_subscription_cycle(uuid)
from public, anon, authenticated;
revoke all on function private.promote_waiting_subscription_allocation(uuid)
from public, anon, authenticated;
revoke all on function public.register_client_subscription_payment(uuid, date, text)
from public, anon;

grant execute on function public.register_client_subscription_payment(uuid, date, text)
to authenticated, service_role;
