do $$
declare v_bad record;
begin
  select a.id into v_bad
  from public.appointments a
  left join public.barber_services bs
    on bs.barbershop_id=a.barbershop_id and bs.barber_id=a.barber_id and bs.service_id=a.service_id
  where (a.barber_service_id is null or a.service_price is null or a.service_duration_minutes is null)
    and (bs.id is null or a.end_at<=a.start_at
      or extract(epoch from a.end_at-a.start_at)/60 not between 5 and 720
      or a.total_price-coalesce((select sum(aa.price) from public.appointment_add_ons aa where aa.appointment_id=a.id),0)<0)
  limit 1;
  if found then raise exception using message='BARBER_SERVICE_RPC_CATCHUP_INVALID_APPOINTMENT',detail=v_bad.id::text; end if;
end $$;

update public.appointments a
set barber_service_id=bs.id,
    service_price=a.total_price-coalesce((select sum(aa.price) from public.appointment_add_ons aa where aa.appointment_id=a.id),0),
    service_duration_minutes=(extract(epoch from a.end_at-a.start_at)/60)::integer
from public.barber_services bs
where (a.barber_service_id is null or a.service_price is null or a.service_duration_minutes is null)
  and bs.barbershop_id=a.barbershop_id and bs.barber_id=a.barber_id and bs.service_id=a.service_id;

-- Authoritative barber-service booking primitives and compatibility wrappers.
create or replace function private.assert_bookable_appointment_interval(
  p_appointment_id uuid, p_barbershop_id uuid, p_barber_id uuid, p_barber_service_id uuid,
  p_start_at timestamptz, p_end_at timestamptz, p_status text, p_service_id uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare v_start time; v_end time; v_dow integer;
begin
  if p_status in ('cancelled','no_show') then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_barber_id::text));
  if p_end_at <= p_start_at then raise exception using message='SLOT_UNAVAILABLE'; end if;
  if not exists (
    select 1 from public.barber_services bs
    join public.barbers b on b.id=bs.barber_id and b.barbershop_id=bs.barbershop_id and b.is_active
    join public.services s on s.id=bs.service_id and s.barbershop_id=bs.barbershop_id and s.is_active
    where bs.id=p_barber_service_id and bs.barbershop_id=p_barbershop_id
      and bs.barber_id=p_barber_id and bs.service_id=p_service_id and bs.is_available
  ) then raise exception using message='INVALID_BARBER_SERVICE'; end if;
  v_start:=p_start_at::time; v_end:=p_end_at::time; v_dow:=extract(dow from p_start_at)::integer;
  if p_start_at::date<>p_end_at::date or not exists (
    select 1 from public.barber_work_hours wh
    where wh.barbershop_id=p_barbershop_id and wh.barber_id=p_barber_id
      and wh.day_of_week=v_dow and wh.is_active
      and wh.start_time<=v_start and wh.end_time>=v_end
      and not (v_start<wh.lunch_end_time and v_end>wh.lunch_start_time)
  ) then raise exception using message='SLOT_UNAVAILABLE'; end if;
  if exists (
    select 1 from public.barber_blocked_times bt
    where bt.barbershop_id=p_barbershop_id and bt.barber_id=p_barber_id
      and bt.start_at<p_end_at and bt.end_at>p_start_at
  ) or exists (
    select 1 from public.appointments a
    where a.barbershop_id=p_barbershop_id and a.barber_id=p_barber_id
      and a.id is distinct from p_appointment_id and a.status not in ('cancelled','no_show')
      and a.start_at<p_end_at and a.end_at>p_start_at
  ) then raise exception using message='SLOT_UNAVAILABLE'; end if;
end $$;

create or replace function private.guard_appointment_interval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and (
    new.barbershop_id is distinct from old.barbershop_id or new.barber_id is distinct from old.barber_id
    or new.service_id is distinct from old.service_id or new.barber_service_id is distinct from old.barber_service_id
    or new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at
  ) then raise exception using message='APPOINTMENT_RESCHEDULE_REQUIRES_RPC'; end if;
  if tg_op='INSERT' and (new.barber_service_id is null or new.service_price is null or new.service_duration_minutes is null) then
    raise exception using message='APPOINTMENT_SNAPSHOTS_REQUIRED';
  end if;
  if tg_op='INSERT' or (new.status not in ('cancelled','no_show') and new.status is distinct from old.status) then
    perform private.assert_bookable_appointment_interval(new.id,new.barbershop_id,new.barber_id,new.barber_service_id,new.start_at,new.end_at,new.status,new.service_id);
  end if;
  return new;
end $$;

drop trigger if exists guard_appointment_interval on public.appointments;
create trigger guard_appointment_interval
before insert or update of barbershop_id,barber_id,service_id,barber_service_id,start_at,end_at,status
on public.appointments for each row execute function private.guard_appointment_interval();

create or replace function private.create_appointment_from_barber_service(
  p_barbershop_id uuid, p_client_name text, p_client_phone text, p_client_email text,
  p_barber_service_id uuid, p_configuration_version bigint, p_start_at timestamptz,
  p_notes text, p_add_on_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_bs public.barber_services%rowtype; v_client_id uuid; v_id uuid; v_end timestamptz;
  v_phone text; v_addons numeric(10,2):=0; v_ids uuid[]:=coalesce(p_add_on_ids,array[]::uuid[]);
begin
  select bs.* into v_bs from public.barber_services bs
  join public.barbers b on b.id=bs.barber_id and b.barbershop_id=bs.barbershop_id and b.is_active
  join public.services s on s.id=bs.service_id and s.barbershop_id=bs.barbershop_id and s.is_active
  where bs.id=p_barber_service_id and bs.barbershop_id=p_barbershop_id and bs.is_available
  for update of bs;
  if not found then raise exception using message='INVALID_BARBER_SERVICE'; end if;
  if v_bs.configuration_version<>p_configuration_version then raise exception using message='CONFIG_CHANGED'; end if;
  if cardinality(v_ids)<>(select count(distinct x) from unnest(v_ids) x) then raise exception using message='INVALID_ADD_ON'; end if;
  if exists(select 1 from unnest(v_ids) x left join public.add_ons ao on ao.id=x and ao.barbershop_id=p_barbershop_id and ao.is_active where ao.id is null)
  then raise exception using message='INVALID_ADD_ON'; end if;
  select coalesce(sum(ao.price),0) into v_addons from public.add_ons ao where ao.id=any(v_ids);
  v_end:=p_start_at+make_interval(mins=>v_bs.duration_minutes);
  perform private.assert_bookable_appointment_interval(null,p_barbershop_id,v_bs.barber_id,v_bs.id,p_start_at,v_end,'confirmed',v_bs.service_id);
  v_phone:=regexp_replace(coalesce(p_client_phone,''),'\D','','g');
  select c.id into v_client_id from public.clients c where c.barbershop_id=p_barbershop_id and c.normalized_phone=v_phone limit 1;
  if v_client_id is null then
    insert into public.clients(barbershop_id,name,phone,email) values(p_barbershop_id,p_client_name,p_client_phone,p_client_email) returning id into v_client_id;
  end if;
  insert into public.appointments(
    barbershop_id,client_id,barber_id,service_id,barber_service_id,start_at,end_at,status,
    service_price,service_duration_minutes,total_price,notes
  ) values(
    p_barbershop_id,v_client_id,v_bs.barber_id,v_bs.service_id,v_bs.id,p_start_at,v_end,'confirmed',
    v_bs.price,v_bs.duration_minutes,v_bs.price+v_addons,p_notes
  ) returning id into v_id;
  insert into public.appointment_add_ons(barbershop_id,appointment_id,add_on_id,price)
  select p_barbershop_id,v_id,ao.id,ao.price from public.add_ons ao where ao.id=any(v_ids);
  return v_id;
end $$;

create or replace function public.get_public_available_slots_for_service(
  p_barbershop_id uuid,p_barber_service_id uuid,p_date date
) returns table(available_time time) language plpgsql security definer set search_path = '' as $$
declare
  v_bs public.barber_services%rowtype; v_wh public.barber_work_hours%rowtype;
  v_step interval; v_time time; v_start timestamptz; v_end timestamptz;
begin
  select bs.* into v_bs from public.barber_services bs
  join public.barbers b on b.id=bs.barber_id and b.is_active
  join public.services s on s.id=bs.service_id and s.is_active
  where bs.id=p_barber_service_id and bs.barbershop_id=p_barbershop_id and bs.is_available;
  if not found then raise exception using message='INVALID_BARBER_SERVICE'; end if;
  select wh.* into v_wh from public.barber_work_hours wh
  where wh.barbershop_id=p_barbershop_id and wh.barber_id=v_bs.barber_id
    and wh.day_of_week=extract(dow from p_date)::integer and wh.is_active;
  if not found then return; end if;
  select make_interval(mins=>coalesce(s.slot_interval_minutes,30)) into v_step
  from public.barbershop_settings s where s.barbershop_id=p_barbershop_id;
  v_step:=coalesce(v_step,interval '30 minutes'); v_time:=v_wh.start_time;
  while v_time+make_interval(mins=>v_bs.duration_minutes)<=v_wh.end_time loop
    v_start:=(p_date::text||' '||v_time::text)::timestamptz;
    v_end:=v_start+make_interval(mins=>v_bs.duration_minutes);
    if not (v_time<v_wh.lunch_end_time and (v_time+make_interval(mins=>v_bs.duration_minutes))>v_wh.lunch_start_time)
      and not exists(select 1 from public.appointments a where a.barber_id=v_bs.barber_id and a.status not in('cancelled','no_show') and a.start_at<v_end and a.end_at>v_start)
      and not exists(select 1 from public.barber_blocked_times bt where bt.barber_id=v_bs.barber_id and bt.start_at<v_end and bt.end_at>v_start)
    then available_time:=v_time; return next; end if;
    v_time:=v_time+v_step;
  end loop;
end $$;

create or replace function public.create_public_appointment_with_barber_service_and_products(
  p_barbershop_id uuid,p_client_name text,p_client_phone text,p_client_email text,
  p_barber_service_id uuid,p_configuration_version bigint,p_start_at timestamptz,
  p_notes text,p_add_on_ids uuid[],p_products jsonb default '[]'::jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_products jsonb:=coalesce(p_products,'[]'::jsonb); v_id uuid; v_bad jsonb;
  v_product_total numeric(10,2):=0; v_result jsonb;
begin
  if jsonb_typeof(v_products)<>'array' or exists(
    select 1 from jsonb_to_recordset(v_products) x("productId" uuid,quantity integer)
    where x."productId" is null or x.quantity is null or x.quantity<=0
  ) or exists(
    select 1 from jsonb_to_recordset(v_products) x("productId" uuid,quantity integer)
    group by x."productId" having count(*)>1
  ) then raise exception using message='INVALID_PRODUCTS'; end if;
  perform p.id from public.products p
  join jsonb_to_recordset(v_products) x("productId" uuid,quantity integer) on x."productId"=p.id
  order by p.id for update;
  select jsonb_agg(jsonb_build_object('productId',x."productId",'availableQuantity',coalesce(p.stock_quantity,0)))
  into v_bad from jsonb_to_recordset(v_products) x("productId" uuid,quantity integer)
  left join public.products p on p.id=x."productId" and p.barbershop_id=p_barbershop_id and p.is_active
  where p.id is null or p.stock_quantity<x.quantity;
  if v_bad is not null then raise exception using message='INSUFFICIENT_STOCK',detail=v_bad::text; end if;
  v_id:=private.create_appointment_from_barber_service(
    p_barbershop_id,p_client_name,p_client_phone,p_client_email,p_barber_service_id,
    p_configuration_version,p_start_at,p_notes,p_add_on_ids
  );
  insert into public.appointment_products(barbershop_id,appointment_id,product_id,quantity,unit_price)
  select p_barbershop_id,v_id,p.id,x.quantity,p.sale_price
  from jsonb_to_recordset(v_products) x("productId" uuid,quantity integer)
  join public.products p on p.id=x."productId";
  update public.products p set stock_quantity=p.stock_quantity-x.quantity,updated_at=timezone('utc',now())
  from jsonb_to_recordset(v_products) x("productId" uuid,quantity integer) where p.id=x."productId";
  select coalesce(sum(ap.quantity*ap.unit_price),0) into v_product_total
  from public.appointment_products ap where ap.appointment_id=v_id;
  select jsonb_build_object(
    'appointmentId',a.id,'barberId',a.barber_id,'barberName',b.name,
    'serviceId',a.service_id,'serviceName',s.name,
    'servicePrice',to_char(a.service_price,'FM999999990.00'),
    'serviceDurationMinutes',a.service_duration_minutes,
    'addOnTotal',to_char(a.total_price-a.service_price,'FM999999990.00'),
    'productSubtotal',to_char(v_product_total,'FM999999990.00'),
    'attendanceTotal',to_char(a.total_price,'FM999999990.00'),
    'totalAtShop',to_char(a.total_price+v_product_total,'FM999999990.00'),
    'startAt',to_char(a.start_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS')||'+00:00',
    'endAt',to_char(a.end_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS')||'+00:00'
  ) into v_result from public.appointments a
  join public.barbers b on b.id=a.barber_id join public.services s on s.id=a.service_id where a.id=v_id;
  return v_result;
end $$;

create or replace function public.create_public_appointment_with_client(
  p_barbershop_id uuid,p_client_name text,p_client_phone text,p_client_email text,
  p_barber_id uuid,p_service_id uuid,p_start_at timestamptz,p_notes text,p_add_on_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_bs public.barber_services%rowtype;
begin
  insert into private.legacy_booking_rpc_calls(function_name) values('create_public_appointment_with_client');
  select * into v_bs from public.barber_services bs
  where bs.barbershop_id=p_barbershop_id and bs.barber_id=p_barber_id and bs.service_id=p_service_id and bs.is_available;
  if not found then raise exception using message='INVALID_BARBER_SERVICE'; end if;
  return private.create_appointment_from_barber_service(
    p_barbershop_id,p_client_name,p_client_phone,p_client_email,v_bs.id,v_bs.configuration_version,
    p_start_at,p_notes,p_add_on_ids
  );
end $$;

create or replace function public.create_public_appointment_with_products(
  p_barbershop_id uuid,p_client_name text,p_client_phone text,p_client_email text,
  p_barber_id uuid,p_service_id uuid,p_start_at timestamptz,p_notes text,p_add_on_ids uuid[],
  p_products jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_bs public.barber_services%rowtype; v_receipt jsonb;
begin
  insert into private.legacy_booking_rpc_calls(function_name) values('create_public_appointment_with_products');
  select * into v_bs from public.barber_services bs
  where bs.barbershop_id=p_barbershop_id and bs.barber_id=p_barber_id and bs.service_id=p_service_id and bs.is_available;
  if not found then raise exception using message='INVALID_BARBER_SERVICE'; end if;
  v_receipt:=public.create_public_appointment_with_barber_service_and_products(
    p_barbershop_id,p_client_name,p_client_phone,p_client_email,v_bs.id,v_bs.configuration_version,
    p_start_at,p_notes,p_add_on_ids,p_products
  );
  return (v_receipt->>'appointmentId')::uuid;
end $$;

create or replace function public.save_service_with_barbers(
  p_service_id uuid,p_name text,p_description text,p_is_active boolean,p_assignments jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_tenant uuid; v_id uuid:=p_service_id; v_items jsonb:=coalesce(p_assignments,'[]'::jsonb);
  v_first record;
begin
  v_tenant:=public.get_user_barbershop_id(auth.uid());
  if v_tenant is null then raise exception using message='FORBIDDEN'; end if;
  if nullif(btrim(p_name),'') is null or jsonb_typeof(v_items)<>'array' then raise exception using message='INVALID_SERVICE'; end if;
  if exists(
    select 1 from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean)
    where x."barberId" is null or x.price is null or x.price<0
      or x."durationMinutes" is null or x."durationMinutes" not between 5 and 720 or x."isAvailable" is null
  ) or exists(
    select 1 from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean)
    group by x."barberId" having count(*)>1
  ) then raise exception using message='INVALID_ASSIGNMENTS'; end if;
  select x.* into v_first
  from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean)
  where x."isAvailable" order by x."barberId" limit 1;
  if v_id is null then
    if not found then raise exception using message='SERVICE_REQUIRES_AVAILABLE_BARBER'; end if;
    insert into public.services(barbershop_id,name,description,is_active,price,duration_minutes)
    values(v_tenant,btrim(p_name),p_description,p_is_active,v_first.price,v_first."durationMinutes") returning id into v_id;
  else
    if not exists(select 1 from public.services s where s.id=v_id and s.barbershop_id=v_tenant) then raise exception using message='FORBIDDEN'; end if;
    update public.services set name=btrim(p_name),description=p_description,is_active=p_is_active where id=v_id;
  end if;
  update public.barber_services bs set is_available=false,
    configuration_version=bs.configuration_version+1,updated_at=timezone('utc',now())
  where bs.service_id=v_id and bs.barbershop_id=v_tenant and bs.is_available
    and not exists(select 1 from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean) where x."barberId"=bs.barber_id);
  insert into public.barber_services(barbershop_id,barber_id,service_id,price,duration_minutes,is_available)
  select v_tenant,x."barberId",v_id,x.price,x."durationMinutes",x."isAvailable"
  from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean)
  on conflict(barber_id,service_id) do update set
    price=excluded.price,duration_minutes=excluded.duration_minutes,is_available=excluded.is_available,
    configuration_version=public.barber_services.configuration_version+1,updated_at=timezone('utc',now())
  where public.barber_services.price is distinct from excluded.price
     or public.barber_services.duration_minutes is distinct from excluded.duration_minutes
     or public.barber_services.is_available is distinct from excluded.is_available;
  select x.* into v_first
  from jsonb_to_recordset(v_items) x("barberId" uuid,price numeric,"durationMinutes" integer,"isAvailable" boolean)
  where x."isAvailable" order by x."barberId" limit 1;
  if found then update public.services set price=v_first.price,duration_minutes=v_first."durationMinutes" where id=v_id; end if;
  return v_id;
end $$;

revoke execute on function private.create_appointment_from_barber_service(uuid,text,text,text,uuid,bigint,timestamptz,text,uuid[]) from public,anon,authenticated;
revoke execute on function private.assert_bookable_appointment_interval(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,uuid) from public,anon,authenticated;
revoke execute on function private.guard_appointment_interval() from public,anon,authenticated;
revoke execute on function public.get_public_available_slots_for_service(uuid,uuid,date) from public;
grant execute on function public.get_public_available_slots_for_service(uuid,uuid,date) to anon,authenticated;
revoke execute on function public.create_public_appointment_with_barber_service_and_products(uuid,text,text,text,uuid,bigint,timestamptz,text,uuid[],jsonb) from public;
grant execute on function public.create_public_appointment_with_barber_service_and_products(uuid,text,text,text,uuid,bigint,timestamptz,text,uuid[],jsonb) to anon,authenticated;
revoke execute on function public.save_service_with_barbers(uuid,text,text,boolean,jsonb) from public,anon;
grant execute on function public.save_service_with_barbers(uuid,text,text,boolean,jsonb) to authenticated;


grant select on public.profiles to authenticated;
