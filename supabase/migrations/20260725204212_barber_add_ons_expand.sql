do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.add_ons'::regclass
      and conname = 'add_ons_id_barbershop_id_key'
  ) then
    alter table public.add_ons
      add constraint add_ons_id_barbershop_id_key unique (id, barbershop_id);
  end if;
end;
$$;

do $$
declare invalid_add_on record;
begin
  select id, price, duration_minutes into invalid_add_on
  from public.add_ons
  where price < 0 or duration_minutes not between 0 and 720
  order by id limit 1;
  if found then
    raise exception using
      message = 'BARBER_ADD_ONS_BACKFILL_INVALID_ADD_ON',
      detail = format('Add-on %s has invalid price %s or duration %s.', invalid_add_on.id, invalid_add_on.price, invalid_add_on.duration_minutes);
  end if;
end;
$$;

create table public.barber_add_ons (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  add_on_id uuid not null,
  price numeric(10, 2) not null,
  duration_minutes integer not null,
  is_available boolean not null default true,
  configuration_version bigint not null default 1,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint barber_add_ons_price_check check (price >= 0),
  constraint barber_add_ons_duration_minutes_check check (duration_minutes between 0 and 720),
  constraint barber_add_ons_configuration_version_check check (configuration_version > 0),
  constraint barber_add_ons_barber_add_on_key unique (barber_id, add_on_id),
  constraint barber_add_ons_identity_key unique (id, barbershop_id, add_on_id),
  constraint barber_add_ons_barber_tenant_fkey foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id) on delete cascade,
  constraint barber_add_ons_add_on_tenant_fkey foreign key (add_on_id, barbershop_id)
    references public.add_ons(id, barbershop_id) on delete cascade
);

create index barber_add_ons_barber_available_idx on public.barber_add_ons(barber_id, is_available);
create index barber_add_ons_add_on_id_idx on public.barber_add_ons(add_on_id);
create index barber_add_ons_barbershop_id_idx on public.barber_add_ons(barbershop_id);

insert into public.barber_add_ons(barbershop_id, barber_id, add_on_id, price, duration_minutes, is_available)
select add_on.barbershop_id, barber.id, add_on.id, add_on.price, add_on.duration_minutes, true
from public.add_ons as add_on
join public.barbers as barber on barber.barbershop_id = add_on.barbershop_id;

alter table public.barber_add_ons enable row level security;

create policy "Barber add-ons: public can view available"
on public.barber_add_ons for select to anon
using (
  is_available = true
  and exists (
    select 1 from public.barbers as barber
    where barber.id = barber_add_ons.barber_id
      and barber.barbershop_id = barber_add_ons.barbershop_id
      and barber.is_active = true
  )
  and exists (
    select 1 from public.add_ons as add_on
    where add_on.id = barber_add_ons.add_on_id
      and add_on.barbershop_id = barber_add_ons.barbershop_id
      and add_on.is_active = true
  )
);

create policy "Barber add-ons: members can view own barbershop"
on public.barber_add_ons for select to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber add-ons: members can insert"
on public.barber_add_ons for insert to authenticated
with check (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber add-ons: members can update"
on public.barber_add_ons for update to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())))
with check (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

create policy "Barber add-ons: members can delete"
on public.barber_add_ons for delete to authenticated
using (barbershop_id = (select profile.barbershop_id from public.profiles as profile where profile.id = (select auth.uid())));

revoke all on public.barber_add_ons from public, anon, authenticated;
grant select on public.barber_add_ons to anon;
grant select, insert, update, delete on public.barber_add_ons to authenticated;
grant all on public.barber_add_ons to service_role;

create or replace function private.bump_barber_add_on_configuration()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := timezone('utc', now());
  if old.price is distinct from new.price
     or old.duration_minutes is distinct from new.duration_minutes
     or old.is_available is distinct from new.is_available then
    new.configuration_version := old.configuration_version + 1;
  else
    new.configuration_version := old.configuration_version;
  end if;
  return new;
end;
$$;

create trigger bump_barber_add_on_configuration
before update on public.barber_add_ons
for each row execute function private.bump_barber_add_on_configuration();

revoke execute on function private.bump_barber_add_on_configuration() from public, anon, authenticated;

alter table public.appointment_add_ons
  add column barber_add_on_id uuid,
  add column duration_minutes integer;

update public.appointment_add_ons set duration_minutes = 0;

update public.appointment_add_ons as appointment_add_on
set barber_add_on_id = barber_add_on.id
from public.appointments as appointment
join public.barber_add_ons as barber_add_on
  on barber_add_on.barbershop_id = appointment.barbershop_id
 and barber_add_on.barber_id = appointment.barber_id
where appointment.id = appointment_add_on.appointment_id
  and barber_add_on.add_on_id = appointment_add_on.add_on_id
  and appointment_add_on.barbershop_id = appointment.barbershop_id;

do $$
declare invalid_snapshot uuid;
begin
  select id into invalid_snapshot
  from public.appointment_add_ons
  where barber_add_on_id is null
  order by id limit 1;
  if found then
    raise exception using
      message = 'BARBER_ADD_ONS_BACKFILL_MISSING_RELATION',
      detail = format('Appointment add-on %s has no same-tenant barber relationship.', invalid_snapshot);
  end if;
end;
$$;

alter table public.appointment_add_ons
  alter column duration_minutes set default 0,
  alter column duration_minutes set not null,
  add constraint appointment_add_ons_duration_minutes_check check (duration_minutes between 0 and 720),
  add constraint appointment_add_ons_barber_add_on_identity_fkey
    foreign key (barber_add_on_id, barbershop_id, add_on_id)
    references public.barber_add_ons(id, barbershop_id, add_on_id)
    on delete restrict;

create index appointment_add_ons_barber_add_on_id_idx
  on public.appointment_add_ons(barber_add_on_id);

create or replace function public.save_add_on_with_barbers(
  p_add_on_id uuid,
  p_name text,
  p_is_active boolean,
  p_assignments jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tenant_id uuid;
  saved_add_on_id uuid := p_add_on_id;
  assignments jsonb := coalesce(p_assignments, '[]'::jsonb);
  first_available record;
begin
  tenant_id := public.get_user_barbershop_id(auth.uid());
  if tenant_id is null then raise exception using message = 'FORBIDDEN'; end if;
  if nullif(btrim(p_name), '') is null or jsonb_typeof(assignments) <> 'array' then
    raise exception using message = 'INVALID_ADD_ON';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(assignments)
      as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
    where item."barberId" is null or item.price is null or item.price < 0
       or item."durationMinutes" is null or item."durationMinutes" not between 0 and 720
       or item."isAvailable" is null
  ) or exists (
    select 1 from jsonb_to_recordset(assignments)
      as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
    group by item."barberId" having count(*) > 1
  ) or exists (
    select 1 from jsonb_to_recordset(assignments)
      as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
    left join public.barbers as barber
      on barber.id = item."barberId" and barber.barbershop_id = tenant_id
    where barber.id is null
  ) then
    raise exception using message = 'INVALID_ASSIGNMENTS';
  end if;

  select item.* into first_available
  from jsonb_to_recordset(assignments)
    as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
  where item."isAvailable"
  order by item."barberId" limit 1;

  if saved_add_on_id is null then
    if not found then raise exception using message = 'ADD_ON_REQUIRES_AVAILABLE_BARBER'; end if;
    insert into public.add_ons(barbershop_id, name, price, duration_minutes, is_active)
    values (tenant_id, btrim(p_name), first_available.price, first_available."durationMinutes", p_is_active)
    returning id into saved_add_on_id;
  else
    if not exists (
      select 1 from public.add_ons
      where id = saved_add_on_id and barbershop_id = tenant_id
    ) then raise exception using message = 'FORBIDDEN'; end if;
    update public.add_ons
    set name = btrim(p_name), is_active = p_is_active
    where id = saved_add_on_id and barbershop_id = tenant_id;
  end if;

  update public.barber_add_ons as barber_add_on
  set is_available = false
  where barber_add_on.add_on_id = saved_add_on_id
    and barber_add_on.barbershop_id = tenant_id
    and barber_add_on.is_available
    and not exists (
      select 1 from jsonb_to_recordset(assignments)
        as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
      where item."barberId" = barber_add_on.barber_id
    );

  insert into public.barber_add_ons(barbershop_id, barber_id, add_on_id, price, duration_minutes, is_available)
  select tenant_id, item."barberId", saved_add_on_id, item.price, item."durationMinutes", item."isAvailable"
  from jsonb_to_recordset(assignments)
    as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
  on conflict (barber_id, add_on_id) do update
  set price = excluded.price,
      duration_minutes = excluded.duration_minutes,
      is_available = excluded.is_available
  where public.barber_add_ons.price is distinct from excluded.price
     or public.barber_add_ons.duration_minutes is distinct from excluded.duration_minutes
     or public.barber_add_ons.is_available is distinct from excluded.is_available;

  select item.* into first_available
  from jsonb_to_recordset(assignments)
    as item("barberId" uuid, price numeric, "durationMinutes" integer, "isAvailable" boolean)
  where item."isAvailable"
  order by item."barberId" limit 1;
  if found then
    update public.add_ons
    set price = first_available.price,
        duration_minutes = first_available."durationMinutes"
    where id = saved_add_on_id and barbershop_id = tenant_id;
  end if;
  return saved_add_on_id;
end;
$$;

revoke execute on function public.save_add_on_with_barbers(uuid, text, boolean, jsonb) from public, anon;
grant execute on function public.save_add_on_with_barbers(uuid, text, boolean, jsonb) to authenticated;
