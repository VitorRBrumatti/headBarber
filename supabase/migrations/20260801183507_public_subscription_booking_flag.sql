-- Expose only the public booking activation decision, not the remaining
-- operational settings of the barbershop.
create or replace function public.is_client_subscriptions_booking_enabled(
  p_barbershop_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select settings.client_subscriptions_booking_enabled
    from public.barbershop_settings as settings
    where settings.barbershop_id = p_barbershop_id
  ), false);
$$;

revoke all on function public.is_client_subscriptions_booking_enabled(uuid)
from public;
grant execute on function public.is_client_subscriptions_booking_enabled(uuid)
to anon, authenticated, service_role;
