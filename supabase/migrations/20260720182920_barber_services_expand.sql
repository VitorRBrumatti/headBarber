create schema if not exists private;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.barbers'::regclass and conname = 'barbers_id_barbershop_id_key') then
    alter table public.barbers add constraint barbers_id_barbershop_id_key unique (id, barbershop_id);
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_id_barbershop_id_key') then
    alter table public.services add constraint services_id_barbershop_id_key unique (id, barbershop_id);
  end if;
end;
$$;

do $$
declare invalid_service record;
begin
  select service.id, service.price, service.duration_minutes into invalid_service
  from public.services as service
  where service.price < 0 or service.duration_minutes not between 5 and 720
  order by service.id limit 1;
  if found then
    raise exception using
      message = 'BARBER_SERVICES_BACKFILL_INVALID_SERVICE',
      detail = format('Service %s has price %s and duration %s; expected price >= 0 and duration between 5 and 720.', invalid_service.id, invalid_service.price, invalid_service.duration_minutes);
  end if;
end;
$$;

create table public.barber_services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  price numeric(10, 2) not null,
  duration_minutes integer not null,
  is_available boolean not null default true,
  configuration_version bigint not null default 1,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint barber_services_price_check check (price >= 0),
  constraint barber_services_duration_minutes_check check (duration_minutes between 5 and 720),
  constraint barber_services_configuration_version_check check (configuration_version > 0),
  constraint barber_services_barber_service_key unique (barber_id, service_id),
  constraint barber_services_identity_key unique (id, barbershop_id, barber_id, service_id),
  constraint barber_services_barber_tenant_fkey foreign key (barber_id, barbershop_id) references public.barbers(id, barbershop_id) on delete cascade,
  constraint barber_services_service_tenant_fkey foreign key (service_id, barbershop_id) references public.services(id, barbershop_id) on delete cascade
);

create index barber_services_barber_available_idx on public.barber_services(barber_id, is_available);
create index barber_services_service_id_idx on public.barber_services(service_id);
create index barber_services_barbershop_id_idx on public.barber_services(barbershop_id);

insert into public.barber_services (barbershop_id, barber_id, service_id, price, duration_minutes, is_available)
select barber.barbershop_id, barber.id, service.id, service.price, service.duration_minutes, true
from public.barbers as barber
join public.services as service on service.barbershop_id = barber.barbershop_id;

alter table public.barber_services enable row level security;

create policy "Barber services: public can view available"
on public.barber_services for select to anon
using (
  is_available = true
  and exists (select 1 from public.barbers as barber where barber.id = barber_services.barber_id and barber.barbershop_id = barber_services.barbershop_id and barber.is_active = true)
  and exists (select 1 from public.services as service where service.id = barber_services.service_id and service.barbershop_id = barber_services.barbershop_id and service.is_active = true)
);

create policy "Barber services: members can view own barbershop"
on public.barber_services for select to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber services: members can insert"
on public.barber_services for insert to authenticated
with check (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber services: members can update"
on public.barber_services for update to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())))
with check (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber services: members can delete"
on public.barber_services for delete to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

revoke all on public.barber_services from public, anon, authenticated;
grant select on public.barber_services to anon;
grant select, insert, update, delete on public.barber_services to authenticated;
grant all on public.barber_services to service_role;

create trigger update_barber_services_updated_at
before update on public.barber_services
for each row execute function public.update_updated_at_column();

alter table public.appointments
  add column barber_service_id uuid,
  add column service_price numeric(10, 2),
  add column service_duration_minutes integer;

do $$
declare invalid_appointment record;
begin
  select appointment.id, appointment.barbershop_id, appointment.barber_id, appointment.service_id into invalid_appointment
  from public.appointments as appointment
  left join public.barber_services as barber_service
    on barber_service.barbershop_id = appointment.barbershop_id
   and barber_service.barber_id = appointment.barber_id
   and barber_service.service_id = appointment.service_id
  where barber_service.id is null
  order by appointment.id limit 1;
  if found then
    raise exception using
      message = 'BARBER_SERVICES_BACKFILL_MISSING_RELATION',
      detail = format('Appointment %s does not have a same-tenant barber/service relation (%s, %s, %s).', invalid_appointment.id, invalid_appointment.barbershop_id, invalid_appointment.barber_id, invalid_appointment.service_id);
  end if;

  select appointment.id, appointment.total_price - coalesce(add_on.total, 0) as reconstructed_price into invalid_appointment
  from public.appointments as appointment
  left join (select appointment_id, sum(price) as total from public.appointment_add_ons group by appointment_id) as add_on
    on add_on.appointment_id = appointment.id
  where appointment.total_price - coalesce(add_on.total, 0) < 0
  order by appointment.id limit 1;
  if found then
    raise exception using
      message = 'BARBER_SERVICES_BACKFILL_NEGATIVE_PRICE',
      detail = format('Appointment %s reconstructs a negative service price (%s).', invalid_appointment.id, invalid_appointment.reconstructed_price);
  end if;

  select appointment.id, appointment.start_at, appointment.end_at,
    extract(epoch from appointment.end_at - appointment.start_at) / 60 as reconstructed_duration
  into invalid_appointment
  from public.appointments as appointment
  where appointment.end_at <= appointment.start_at
     or extract(epoch from appointment.end_at - appointment.start_at) / 60 not between 5 and 720
     or mod(extract(epoch from appointment.end_at - appointment.start_at)::numeric, 60) <> 0
  order by appointment.id limit 1;
  if found then
    raise exception using
      message = 'BARBER_SERVICES_BACKFILL_INVALID_DURATION',
      detail = format('Appointment %s has interval %s to %s (%s minutes); expected whole minutes between 5 and 720.', invalid_appointment.id, invalid_appointment.start_at, invalid_appointment.end_at, invalid_appointment.reconstructed_duration);
  end if;
end;
$$;

update public.appointments as appointment
set barber_service_id = barber_service.id,
    service_price = appointment.total_price - coalesce((
      select sum(add_on.price)
      from public.appointment_add_ons as add_on
      where add_on.appointment_id = appointment.id
    ), 0),
    service_duration_minutes = (extract(epoch from appointment.end_at - appointment.start_at) / 60)::integer
from public.barber_services as barber_service
where barber_service.barbershop_id = appointment.barbershop_id
  and barber_service.barber_id = appointment.barber_id
  and barber_service.service_id = appointment.service_id;

create index appointments_barber_service_id_idx on public.appointments(barber_service_id);

alter table public.appointments
  add constraint appointments_barber_service_identity_fkey
  foreign key (barber_service_id, barbershop_id, barber_id, service_id)
  references public.barber_services(id, barbershop_id, barber_id, service_id)
  on delete restrict not valid;

alter table public.appointments validate constraint appointments_barber_service_identity_fkey;

create table private.legacy_booking_rpc_calls (
  function_name text not null,
  called_at timestamp with time zone not null default timezone('utc', now())
);
create index legacy_booking_rpc_calls_called_at_idx on private.legacy_booking_rpc_calls(called_at);
alter table private.legacy_booking_rpc_calls enable row level security;
revoke all on private.legacy_booking_rpc_calls from public, anon, authenticated;
grant all on private.legacy_booking_rpc_calls to service_role;
