create or replace function public.save_subscription_plan(
  p_plan_id uuid,
  p_name text,
  p_description text,
  p_monthly_price numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_plan_id uuid := coalesce(p_plan_id, gen_random_uuid());
  v_existing_tenant_id uuid;
  v_item jsonb;
  v_item_type text;
  v_service_id uuid;
  v_add_on_id uuid;
  v_monthly_limit integer;
  v_item_key text;
  v_seen_items text[] := array[]::text[];
  v_is_existing boolean := false;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if p_name is null
    or length(btrim(p_name)) not between 1 and 120
    or p_monthly_price is null
    or p_monthly_price < 0
    or p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
    end if;

    v_item_type := v_item ->> 'itemType';
    v_service_id := null;
    v_add_on_id := null;
    v_monthly_limit := null;

    if v_item ? 'monthlyLimit' and v_item -> 'monthlyLimit' <> 'null'::jsonb then
      begin
        v_monthly_limit := (v_item ->> 'monthlyLimit')::integer;
      exception when others then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end;

      if v_monthly_limit <= 0 then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end if;
    end if;

    if v_item_type = 'service'
      and v_item ? 'serviceId'
      and not (v_item ? 'addOnId')
    then
      begin
        v_service_id := (v_item ->> 'serviceId')::uuid;
      exception when others then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end;

      if not exists (
        select 1
        from public.services s
        where s.id = v_service_id
          and s.barbershop_id = v_tenant_id
          and s.is_active
      ) then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end if;

      v_item_key := 'service:' || v_service_id::text;
    elsif v_item_type = 'add_on'
      and v_item ? 'addOnId'
      and not (v_item ? 'serviceId')
    then
      begin
        v_add_on_id := (v_item ->> 'addOnId')::uuid;
      exception when others then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end;

      if not exists (
        select 1
        from public.add_ons a
        where a.id = v_add_on_id
          and a.barbershop_id = v_tenant_id
          and a.is_active
      ) then
        raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
      end if;

      v_item_key := 'add_on:' || v_add_on_id::text;
    else
      raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
    end if;

    if array_position(v_seen_items, v_item_key) is not null then
      raise exception using errcode = 'P0001', message = 'INVALID_PLAN_ITEM';
    end if;
    v_seen_items := array_append(v_seen_items, v_item_key);
  end loop;

  select sp.barbershop_id
  into v_existing_tenant_id
  from public.subscription_plans sp
  where sp.id = v_plan_id
  for update;

  if found then
    if v_existing_tenant_id <> v_tenant_id then
      raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
    end if;
    v_is_existing := true;
  end if;

  if exists (
    select 1
    from public.subscription_plans sp
    where sp.barbershop_id = v_tenant_id
      and lower(btrim(sp.name)) = lower(btrim(p_name))
      and sp.id <> v_plan_id
  ) then
    raise exception using errcode = 'P0001', message = 'PLAN_NAME_EXISTS';
  end if;

  if v_is_existing then
    update public.subscription_plans
    set name = btrim(p_name),
        description = nullif(btrim(p_description), ''),
        monthly_price = p_monthly_price,
        configuration_version = configuration_version + 1
    where id = v_plan_id;
  else
    insert into public.subscription_plans(
      id, barbershop_id, name, description, monthly_price
    ) values (
      v_plan_id, v_tenant_id, btrim(p_name),
      nullif(btrim(p_description), ''), p_monthly_price
    );
  end if;

  delete from public.subscription_plan_items where plan_id = v_plan_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_item_type := v_item ->> 'itemType';
    v_service_id := case when v_item_type = 'service' then (v_item ->> 'serviceId')::uuid end;
    v_add_on_id := case when v_item_type = 'add_on' then (v_item ->> 'addOnId')::uuid end;
    v_monthly_limit := case
      when v_item ? 'monthlyLimit' and v_item -> 'monthlyLimit' <> 'null'::jsonb
      then (v_item ->> 'monthlyLimit')::integer
    end;

    insert into public.subscription_plan_items(
      barbershop_id, plan_id, item_type, service_id, add_on_id, monthly_limit
    ) values (
      v_tenant_id, v_plan_id, v_item_type, v_service_id, v_add_on_id, v_monthly_limit
    );
  end loop;

  return v_plan_id;
end;
$$;

create or replace function public.create_client_subscription(
  p_client_id uuid,
  p_plan_id uuid,
  p_started_on date,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if p_started_on is null then
    raise exception using errcode = 'P0001', message = 'INVALID_SUBSCRIPTION';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.barbershop_id = v_tenant_id
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_CLIENT';
  end if;

  if not exists (
    select 1 from public.subscription_plans sp
    where sp.id = p_plan_id
      and sp.barbershop_id = v_tenant_id
      and sp.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  if exists (
    select 1 from public.client_subscriptions cs
    where cs.barbershop_id = v_tenant_id
      and cs.client_id = p_client_id
      and cs.status in ('active', 'paused')
  ) then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_ALREADY_EXISTS';
  end if;

  insert into public.client_subscriptions(
    barbershop_id, client_id, plan_id, status,
    started_on, next_billing_date, notes
  ) values (
    v_tenant_id, p_client_id, p_plan_id, 'active',
    p_started_on, p_started_on, nullif(btrim(p_notes), '')
  )
  returning id into v_subscription_id;

  return v_subscription_id;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'SUBSCRIPTION_ALREADY_EXISTS';
end;
$$;

create or replace function public.set_client_subscription_status(
  p_subscription_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_subscription public.client_subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if p_status not in ('active', 'paused', 'cancelled') then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  select cs.* into v_subscription
  from public.client_subscriptions cs
  where cs.id = p_subscription_id
    and cs.barbershop_id = v_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_SUBSCRIPTION';
  end if;

  if v_subscription.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  if (v_subscription.status = 'active' and p_status not in ('active', 'paused', 'cancelled'))
    or (v_subscription.status = 'paused' and p_status not in ('active', 'paused', 'cancelled'))
  then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  update public.client_subscriptions
  set status = p_status,
      cancelled_at = case
        when p_status = 'cancelled' then coalesce(cancelled_at, timezone('utc', now()))
        else null
      end
  where id = p_subscription_id
  returning * into v_subscription;

  return jsonb_build_object(
    'subscriptionId', v_subscription.id,
    'status', v_subscription.status,
    'planId', v_subscription.plan_id,
    'pendingPlanId', v_subscription.pending_plan_id
  );
end;
$$;

create or replace function public.schedule_client_subscription_plan(
  p_subscription_id uuid,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_subscription public.client_subscriptions%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  select cs.* into v_subscription
  from public.client_subscriptions cs
  where cs.id = p_subscription_id
    and cs.barbershop_id = v_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_SUBSCRIPTION';
  end if;

  if v_subscription.status = 'cancelled' then
    raise exception using errcode = 'P0001', message = 'INVALID_STATUS_TRANSITION';
  end if;

  if not exists (
    select 1 from public.subscription_plans sp
    where sp.id = p_plan_id
      and sp.barbershop_id = v_tenant_id
      and sp.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  update public.client_subscriptions
  set pending_plan_id = case when plan_id = p_plan_id then null else p_plan_id end
  where id = p_subscription_id
  returning * into v_subscription;

  return jsonb_build_object(
    'subscriptionId', v_subscription.id,
    'status', v_subscription.status,
    'planId', v_subscription.plan_id,
    'pendingPlanId', v_subscription.pending_plan_id
  );
end;
$$;

revoke all on function public.save_subscription_plan(uuid, text, text, numeric, jsonb) from public, anon;
revoke all on function public.create_client_subscription(uuid, uuid, date, text) from public, anon;
revoke all on function public.set_client_subscription_status(uuid, text) from public, anon;
revoke all on function public.schedule_client_subscription_plan(uuid, uuid) from public, anon;

grant execute on function public.save_subscription_plan(uuid, text, text, numeric, jsonb) to authenticated;
grant execute on function public.create_client_subscription(uuid, uuid, date, text) to authenticated;
grant execute on function public.set_client_subscription_status(uuid, text) to authenticated;
grant execute on function public.schedule_client_subscription_plan(uuid, uuid) to authenticated;
