-- Tenant-safe non-terminal transitions and rollback-compatible status changes.

create or replace function public.transition_appointment_status(
  p_appointment_id uuid,
  p_target_status text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_appointment public.appointments%rowtype;
  v_settlement_enabled boolean;
begin
  if auth.uid() is null then
    raise exception using message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(auth.uid());
  if v_tenant_id is null or not public.has_active_subscription() then
    raise exception using message = 'FORBIDDEN';
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

  if v_appointment.status = p_target_status then
    return jsonb_build_object(
      'appointmentId', v_appointment.id,
      'status', v_appointment.status
    );
  end if;

  if not (
    (v_appointment.status = 'pending'
      and p_target_status in ('confirmed', 'cancelled'))
    or
    (v_appointment.status = 'confirmed'
      and p_target_status in ('completed', 'cancelled', 'no_show'))
  ) then
    raise exception using message = 'INVALID_STATUS_TRANSITION';
  end if;

  select coalesce(settings.client_subscriptions_settlement_enabled, false)
  into v_settlement_enabled
  from public.barbershop_settings as settings
  where settings.barbershop_id = v_tenant_id;

  if coalesce(v_settlement_enabled, false)
    and p_target_status in ('completed', 'cancelled', 'no_show')
  then
    raise exception using message = 'USE_SETTLEMENT';
  end if;

  update public.appointments
  set status = p_target_status
  where id = v_appointment.id;

  return jsonb_build_object(
    'appointmentId', v_appointment.id,
    'status', p_target_status
  );
end;
$$;

revoke all on function public.transition_appointment_status(uuid,text)
from public, anon;
grant execute on function public.transition_appointment_status(uuid,text)
to authenticated, service_role;
