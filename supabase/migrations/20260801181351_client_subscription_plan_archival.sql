create or replace function public.set_subscription_plan_active(
  p_plan_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_plan public.subscription_plans%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using errcode = 'P0001', message = 'FORBIDDEN';
  end if;

  if p_is_active is null then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  select plan.*
  into v_plan
  from public.subscription_plans as plan
  where plan.id = p_plan_id
    and plan.barbershop_id = v_tenant_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'INVALID_PLAN';
  end if;

  update public.subscription_plans
  set is_active = p_is_active
  where id = v_plan.id
  returning * into v_plan;

  return jsonb_build_object(
    'planId', v_plan.id,
    'isActive', v_plan.is_active,
    'configurationVersion', v_plan.configuration_version
  );
end;
$$;

revoke all on function public.set_subscription_plan_active(uuid, boolean)
from public, anon;
grant execute on function public.set_subscription_plan_active(uuid, boolean)
to authenticated, service_role;
