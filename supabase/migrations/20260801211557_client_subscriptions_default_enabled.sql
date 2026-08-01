insert into public.barbershop_settings (barbershop_id)
select barbershop.id
from public.barbershops as barbershop
on conflict (barbershop_id) do nothing;

update public.barbershop_settings
set
  client_subscriptions_admin_enabled = true,
  client_subscriptions_booking_enabled = true,
  client_subscriptions_settlement_enabled = true
where not client_subscriptions_admin_enabled
   or not client_subscriptions_booking_enabled
   or not client_subscriptions_settlement_enabled;

alter table public.barbershop_settings
  alter column client_subscriptions_admin_enabled set default true,
  alter column client_subscriptions_booking_enabled set default true,
  alter column client_subscriptions_settlement_enabled set default true;