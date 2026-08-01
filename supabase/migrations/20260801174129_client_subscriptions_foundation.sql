-- Foundation for barbershop-managed customer subscriptions.
-- Every activation flag stays off so this migration only expands the schema.

create extension if not exists btree_gist with schema extensions;
create schema if not exists private;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_id_barbershop_id_key'
  ) then
    alter table public.clients
      add constraint clients_id_barbershop_id_key unique (id, barbershop_id);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.appointments'::regclass
      and conname = 'appointments_id_barbershop_id_key'
  ) then
    alter table public.appointments
      add constraint appointments_id_barbershop_id_key unique (id, barbershop_id);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.appointment_products'::regclass
      and conname = 'appointment_products_identity_key'
  ) then
    alter table public.appointment_products
      add constraint appointment_products_identity_key
      unique (id, barbershop_id, appointment_id);
  end if;
end;
$$;

alter table public.barbershop_settings
  add column if not exists client_subscriptions_admin_enabled boolean not null default false,
  add column if not exists client_subscriptions_booking_enabled boolean not null default false,
  add column if not exists client_subscriptions_settlement_enabled boolean not null default false;

alter table public.appointments
  add column if not exists subscription_coverage_status text not null default 'none',
  add column if not exists subscription_covered_total numeric(10,2) not null default 0,
  add column if not exists commissionable_total numeric(10,2),
  add column if not exists commission_percentage_snapshot numeric(5,2),
  add column if not exists commission_amount numeric(10,2);

alter table public.appointments
  drop constraint if exists appointments_subscription_coverage_status_check,
  drop constraint if exists appointments_subscription_amounts_check,
  drop constraint if exists appointments_commission_snapshots_check;

alter table public.appointments
  add constraint appointments_subscription_coverage_status_check
    check (subscription_coverage_status in ('none','awaiting_cycle','waiting','partial','covered')),
  add constraint appointments_subscription_amounts_check
    check (
      subscription_covered_total >= 0
      and subscription_covered_total <= total_price
    ),
  add constraint appointments_commission_snapshots_check
    check (
      commissionable_total is null or commissionable_total >= 0
    ) not valid;

update public.appointments as appointment
set commissionable_total = appointment.total_price,
    commission_percentage_snapshot = coalesce(barber.commission_percentage, 0),
    commission_amount = round(
      appointment.total_price * coalesce(barber.commission_percentage, 0) / 100,
      2
    )
from public.barbers as barber
where barber.id = appointment.barber_id
  and barber.barbershop_id = appointment.barbershop_id
  and (
    appointment.commissionable_total is null
    or appointment.commission_percentage_snapshot is null
    or appointment.commission_amount is null
  );

update public.appointments
set commissionable_total = total_price,
    commission_percentage_snapshot = coalesce(commission_percentage_snapshot, 0),
    commission_amount = coalesce(commission_amount, 0)
where commissionable_total is null
   or commission_percentage_snapshot is null
   or commission_amount is null;

alter table public.appointments
  alter column commissionable_total set not null,
  alter column commission_percentage_snapshot set not null,
  alter column commission_amount set not null;

alter table public.appointments validate constraint appointments_commission_snapshots_check;

alter table public.appointments
  add column if not exists amount_due numeric(10,2)
    generated always as (total_price - subscription_covered_total) stored;

alter table public.appointments alter column amount_due set not null;

create or replace function private.set_appointment_commission_snapshots()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_percentage numeric(5,2);
begin
  if new.commissionable_total is null then
    new.commissionable_total := new.total_price;
  end if;

  if new.commission_percentage_snapshot is null then
    select coalesce(barber.commission_percentage, 0)
    into v_percentage
    from public.barbers as barber
    where barber.id = new.barber_id
      and barber.barbershop_id = new.barbershop_id;

    new.commission_percentage_snapshot := coalesce(v_percentage, 0);
  end if;

  if new.commission_amount is null then
    new.commission_amount := round(
      new.commissionable_total * new.commission_percentage_snapshot / 100,
      2
    );
  end if;

  return new;
end;
$$;

drop trigger if exists set_appointment_commission_snapshots on public.appointments;
create trigger set_appointment_commission_snapshots
before insert on public.appointments
for each row execute function private.set_appointment_commission_snapshots();

revoke execute on function private.set_appointment_commission_snapshots()
from public, anon, authenticated;

alter table public.revenues add column if not exists source text;

update public.revenues
set source = case
  when category = 'service' and reference_id is not null then 'appointment_service'
  when category = 'product' and reference_id is not null then 'appointment_product'
  else 'manual'
end
where source is null;

alter table public.revenues
  alter column source set default 'manual',
  alter column source set not null;

alter table public.revenues drop constraint if exists revenues_source_check;
alter table public.revenues
  add constraint revenues_source_check
  check (source in ('manual','appointment_service','appointment_product','subscription_cycle'));

create unique index if not exists revenues_automatic_origin_uq
on public.revenues(barbershop_id, source, reference_id)
where source <> 'manual' and reference_id is not null;

alter table public.appointment_products
  drop constraint if exists appointment_products_status_check;
alter table public.appointment_products
  add constraint appointment_products_status_check
  check (status in ('reserved', 'sold', 'released'));

alter table public.product_sales
  add column if not exists appointment_id uuid,
  add column if not exists appointment_product_id uuid;

alter table public.product_sales
  drop constraint if exists product_sales_appointment_tenant_fkey,
  drop constraint if exists product_sales_appointment_product_tenant_fkey;

alter table public.product_sales
  add constraint product_sales_appointment_tenant_fkey
    foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id)
    on delete restrict,
  add constraint product_sales_appointment_product_tenant_fkey
    foreign key (appointment_product_id, barbershop_id, appointment_id)
    references public.appointment_products(id, barbershop_id, appointment_id)
    on delete restrict;

create unique index if not exists product_sales_appointment_product_uq
on public.product_sales(appointment_product_id)
where appointment_product_id is not null;

create index if not exists product_sales_appointment_id_idx
on public.product_sales(appointment_id)
where appointment_id is not null;

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  description text,
  monthly_price numeric(10,2) not null check (monthly_price >= 0),
  is_active boolean not null default true,
  configuration_version bigint not null default 1 check (configuration_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscription_plans_identity_key unique (id, barbershop_id),
  constraint subscription_plans_tenant_name_key unique (barbershop_id, name)
);

create table public.subscription_plan_items (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  plan_id uuid not null,
  item_type text not null check (item_type in ('service','add_on')),
  service_id uuid,
  add_on_id uuid,
  monthly_limit integer check (monthly_limit is null or monthly_limit > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscription_plan_items_identity_key unique (id, barbershop_id),
  constraint subscription_plan_items_target_check check (
    (item_type = 'service' and service_id is not null and add_on_id is null)
    or (item_type = 'add_on' and add_on_id is not null and service_id is null)
  ),
  constraint subscription_plan_items_plan_tenant_fkey
    foreign key (plan_id, barbershop_id)
    references public.subscription_plans(id, barbershop_id)
    on delete cascade,
  constraint subscription_plan_items_service_tenant_fkey
    foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id)
    on delete restrict,
  constraint subscription_plan_items_add_on_tenant_fkey
    foreign key (add_on_id, barbershop_id)
    references public.add_ons(id, barbershop_id)
    on delete restrict
);

create unique index subscription_plan_items_service_uq
on public.subscription_plan_items(plan_id, service_id)
where service_id is not null;

create unique index subscription_plan_items_add_on_uq
on public.subscription_plan_items(plan_id, add_on_id)
where add_on_id is not null;

create index subscription_plan_items_plan_id_idx
on public.subscription_plan_items(plan_id);

create table public.client_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  plan_id uuid not null,
  pending_plan_id uuid,
  status text not null default 'active' check (status in ('active','paused','cancelled')),
  started_on date not null,
  next_billing_date date not null,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_subscriptions_identity_key unique (id, barbershop_id),
  constraint client_subscriptions_cancelled_at_check check (
    (status = 'cancelled' and cancelled_at is not null)
    or (status <> 'cancelled' and cancelled_at is null)
  ),
  constraint client_subscriptions_client_tenant_fkey
    foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id)
    on delete restrict,
  constraint client_subscriptions_plan_tenant_fkey
    foreign key (plan_id, barbershop_id)
    references public.subscription_plans(id, barbershop_id)
    on delete restrict,
  constraint client_subscriptions_pending_plan_tenant_fkey
    foreign key (pending_plan_id, barbershop_id)
    references public.subscription_plans(id, barbershop_id)
    on delete restrict
);

create unique index client_subscriptions_one_open_per_client_uq
on public.client_subscriptions(barbershop_id, client_id)
where status in ('active','paused');

create index client_subscriptions_plan_status_idx
on public.client_subscriptions(plan_id, status);

create index client_subscriptions_next_billing_idx
on public.client_subscriptions(barbershop_id, next_billing_date)
where status = 'active';

create table public.subscription_cycles (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_subscription_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'pending' check (status in ('pending','paid','expired','cancelled')),
  plan_id_snapshot uuid not null,
  plan_name_snapshot text not null,
  price_snapshot numeric(10,2) not null check (price_snapshot >= 0),
  payment_method text check (payment_method in ('money','pix','credit_card','debit_card','other')),
  paid_at timestamptz,
  revenue_id uuid unique references public.revenues(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscription_cycles_identity_key unique (id, barbershop_id),
  constraint subscription_cycles_period_check check (period_end > period_start),
  constraint subscription_cycles_payment_check check (
    (status = 'paid' and payment_method is not null and paid_at is not null)
    or (status <> 'paid')
  ),
  constraint subscription_cycles_subscription_tenant_fkey
    foreign key (client_subscription_id, barbershop_id)
    references public.client_subscriptions(id, barbershop_id)
    on delete restrict,
  constraint subscription_cycles_plan_tenant_fkey
    foreign key (plan_id_snapshot, barbershop_id)
    references public.subscription_plans(id, barbershop_id)
    on delete restrict
);

create unique index subscription_cycles_period_uq
on public.subscription_cycles(client_subscription_id, period_start);

create index subscription_cycles_subscription_period_idx
on public.subscription_cycles(client_subscription_id, period_start, period_end);

create index subscription_cycles_tenant_status_period_idx
on public.subscription_cycles(barbershop_id, status, period_start, period_end);

alter table public.subscription_cycles
  add constraint subscription_cycles_paid_period_excl
  exclude using gist (
    client_subscription_id with =,
    daterange(period_start, period_end, '[)') with &&
  ) where (status = 'paid');

create table public.subscription_cycle_entitlements (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  cycle_id uuid not null,
  item_type text not null check (item_type in ('service','add_on')),
  service_id uuid,
  add_on_id uuid,
  item_name_snapshot text not null,
  monthly_limit integer check (monthly_limit is null or monthly_limit > 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint subscription_cycle_entitlements_identity_key unique (id, barbershop_id),
  constraint subscription_cycle_entitlements_target_check check (
    (item_type = 'service' and service_id is not null and add_on_id is null)
    or (item_type = 'add_on' and add_on_id is not null and service_id is null)
  ),
  constraint subscription_cycle_entitlements_cycle_tenant_fkey
    foreign key (cycle_id, barbershop_id)
    references public.subscription_cycles(id, barbershop_id)
    on delete cascade,
  constraint subscription_cycle_entitlements_service_tenant_fkey
    foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id)
    on delete restrict,
  constraint subscription_cycle_entitlements_add_on_tenant_fkey
    foreign key (add_on_id, barbershop_id)
    references public.add_ons(id, barbershop_id)
    on delete restrict
);

create unique index subscription_cycle_entitlements_service_uq
on public.subscription_cycle_entitlements(cycle_id, service_id)
where service_id is not null;

create unique index subscription_cycle_entitlements_add_on_uq
on public.subscription_cycle_entitlements(cycle_id, add_on_id)
where add_on_id is not null;

create index subscription_cycle_entitlements_cycle_id_idx
on public.subscription_cycle_entitlements(cycle_id);

create table public.appointment_subscription_allocations (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null,
  cycle_entitlement_id uuid not null,
  item_type text not null check (item_type in ('service','add_on')),
  service_id uuid,
  add_on_id uuid,
  covered_amount numeric(10,2) not null default 0 check (covered_amount >= 0),
  status text not null check (status in ('waiting','reserved','consumed','released')),
  reserved_at timestamptz,
  consumed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint appointment_subscription_allocations_identity_key unique (id, barbershop_id),
  constraint appointment_subscription_allocations_appointment_entitlement_key
    unique (appointment_id, cycle_entitlement_id),
  constraint appointment_subscription_allocations_target_check check (
    (item_type = 'service' and service_id is not null and add_on_id is null)
    or (item_type = 'add_on' and add_on_id is not null and service_id is null)
  ),
  constraint appointment_subscription_allocations_timestamps_check check (
    (status = 'waiting' and reserved_at is null and consumed_at is null and released_at is null)
    or (status = 'reserved' and reserved_at is not null and consumed_at is null and released_at is null)
    or (status = 'consumed' and reserved_at is not null and consumed_at is not null and released_at is null)
    or (status = 'released' and released_at is not null)
  ),
  constraint appointment_subscription_allocations_appointment_tenant_fkey
    foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id)
    on delete cascade,
  constraint appointment_subscription_allocations_entitlement_tenant_fkey
    foreign key (cycle_entitlement_id, barbershop_id)
    references public.subscription_cycle_entitlements(id, barbershop_id)
    on delete restrict,
  constraint appointment_subscription_allocations_service_tenant_fkey
    foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id)
    on delete restrict,
  constraint appointment_subscription_allocations_add_on_tenant_fkey
    foreign key (add_on_id, barbershop_id)
    references public.add_ons(id, barbershop_id)
    on delete restrict
);

create index appointment_subscription_allocations_appointment_id_idx
on public.appointment_subscription_allocations(appointment_id);

create index appointment_subscription_allocations_entitlement_status_idx
on public.appointment_subscription_allocations(cycle_entitlement_id, status, appointment_id);

create index appointment_subscription_allocations_tenant_status_idx
on public.appointment_subscription_allocations(barbershop_id, status);

alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_items enable row level security;
alter table public.client_subscriptions enable row level security;
alter table public.subscription_cycles enable row level security;
alter table public.subscription_cycle_entitlements enable row level security;
alter table public.appointment_subscription_allocations enable row level security;

create policy "Subscription plans: members can view own barbershop"
on public.subscription_plans for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.subscription_plans as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

create policy "Subscription plan items: members can view own barbershop"
on public.subscription_plan_items for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.subscription_plan_items as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

create policy "Client subscriptions: members can view own barbershop"
on public.client_subscriptions for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.client_subscriptions as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

create policy "Subscription cycles: members can view own barbershop"
on public.subscription_cycles for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.subscription_cycles as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

create policy "Subscription entitlements: members can view own barbershop"
on public.subscription_cycle_entitlements for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.subscription_cycle_entitlements as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

create policy "Subscription allocations: members can view own barbershop"
on public.appointment_subscription_allocations for select to authenticated
using (barbershop_id = (select public.get_user_barbershop_id(auth.uid())));
create policy subscription_required_for_authenticated_access
on public.appointment_subscription_allocations as restrictive for all to authenticated
using ((select public.has_active_subscription()))
with check ((select public.has_active_subscription()));

revoke all on table public.subscription_plans from anon, authenticated;
revoke all on table public.subscription_plan_items from anon, authenticated;
revoke all on table public.client_subscriptions from anon, authenticated;
revoke all on table public.subscription_cycles from anon, authenticated;
revoke all on table public.subscription_cycle_entitlements from anon, authenticated;
revoke all on table public.appointment_subscription_allocations from anon, authenticated;

grant select on table public.subscription_plans to authenticated;
grant select on table public.subscription_plan_items to authenticated;
grant select on table public.client_subscriptions to authenticated;
grant select on table public.subscription_cycles to authenticated;
grant select on table public.subscription_cycle_entitlements to authenticated;
grant select on table public.appointment_subscription_allocations to authenticated;

grant all on table public.subscription_plans to service_role;
grant all on table public.subscription_plan_items to service_role;
grant all on table public.client_subscriptions to service_role;
grant all on table public.subscription_cycles to service_role;
grant all on table public.subscription_cycle_entitlements to service_role;
grant all on table public.appointment_subscription_allocations to service_role;

create trigger update_subscription_plans_updated_at
before update on public.subscription_plans
for each row execute function public.update_updated_at_column();

create trigger update_subscription_plan_items_updated_at
before update on public.subscription_plan_items
for each row execute function public.update_updated_at_column();

create trigger update_client_subscriptions_updated_at
before update on public.client_subscriptions
for each row execute function public.update_updated_at_column();

create trigger update_subscription_cycles_updated_at
before update on public.subscription_cycles
for each row execute function public.update_updated_at_column();

create trigger update_appointment_subscription_allocations_updated_at
before update on public.appointment_subscription_allocations
for each row execute function public.update_updated_at_column();
