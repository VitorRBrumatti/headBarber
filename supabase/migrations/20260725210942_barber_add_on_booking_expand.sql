-- Validate versioned barber add-on selections and include their duration in
-- public slot availability.
create or replace function private.get_selected_barber_add_on_duration(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_add_ons jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb := coalesce(p_add_ons, '[]'::jsonb);
  v_expected integer;
  v_found integer;
  v_duration integer;
begin
  if jsonb_typeof(v_items) <> 'array' then
    raise exception using message = 'INVALID_ADD_ON';
  end if;

  v_expected := jsonb_array_length(v_items);

  if exists(
    select 1
    from jsonb_to_recordset(v_items)
      x("barberAddOnId" uuid, "configurationVersion" bigint)
    where x."barberAddOnId" is null
       or x."configurationVersion" is null
  ) or exists(
    select 1
    from jsonb_to_recordset(v_items)
      x("barberAddOnId" uuid, "configurationVersion" bigint)
    group by x."barberAddOnId"
    having count(*) > 1
  ) then
    raise exception using message = 'INVALID_ADD_ON';
  end if;

  perform ba.id
  from public.barber_add_ons ba
  join public.add_ons ao
    on ao.id = ba.add_on_id
   and ao.barbershop_id = ba.barbershop_id
   and ao.is_active
  join jsonb_to_recordset(v_items)
    x("barberAddOnId" uuid, "configurationVersion" bigint)
    on x."barberAddOnId" = ba.id
  where ba.barbershop_id = p_barbershop_id
    and ba.barber_id = p_barber_id
    and ba.is_available
  order by ba.id
  for share of ba;

  select count(*), coalesce(sum(ba.duration_minutes), 0)
  into v_found, v_duration
  from public.barber_add_ons ba
  join public.add_ons ao
    on ao.id = ba.add_on_id
   and ao.barbershop_id = ba.barbershop_id
   and ao.is_active
  join jsonb_to_recordset(v_items)
    x("barberAddOnId" uuid, "configurationVersion" bigint)
    on x."barberAddOnId" = ba.id
  where ba.barbershop_id = p_barbershop_id
    and ba.barber_id = p_barber_id
    and ba.is_available;

  if v_found <> v_expected then
    raise exception using message = 'INVALID_ADD_ON';
  end if;

  if exists(
    select 1
    from public.barber_add_ons ba
    join jsonb_to_recordset(v_items)
      x("barberAddOnId" uuid, "configurationVersion" bigint)
      on x."barberAddOnId" = ba.id
    where ba.barbershop_id = p_barbershop_id
      and ba.barber_id = p_barber_id
      and ba.configuration_version <> x."configurationVersion"
  ) then
    raise exception using message = 'CONFIG_CHANGED';
  end if;

  return v_duration;
end;
$$;

create or replace function public.get_public_available_slots_for_service_and_add_ons(
  p_barbershop_id uuid,
  p_barber_service_id uuid,
  p_add_ons jsonb,
  p_date date
) returns table(available_time time)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bs public.barber_services%rowtype;
  v_wh public.barber_work_hours%rowtype;
  v_total_duration integer;
  v_step interval;
  v_time time;
  v_candidate_start timestamptz;
  v_candidate_end timestamptz;
begin
  select bs.*
  into v_bs
  from public.barber_services bs
  join public.barbers b
    on b.id = bs.barber_id
   and b.barbershop_id = bs.barbershop_id
   and b.is_active
  join public.services s
    on s.id = bs.service_id
   and s.barbershop_id = bs.barbershop_id
   and s.is_active
  where bs.id = p_barber_service_id
    and bs.barbershop_id = p_barbershop_id
    and bs.is_available
  for share of bs;

  if not found then
    raise exception using message = 'INVALID_BARBER_SERVICE';
  end if;

  v_total_duration := v_bs.duration_minutes
    + private.get_selected_barber_add_on_duration(
      p_barbershop_id,
      v_bs.barber_id,
      p_add_ons
    );

  select wh.*
  into v_wh
  from public.barber_work_hours wh
  where wh.barbershop_id = p_barbershop_id
    and wh.barber_id = v_bs.barber_id
    and wh.day_of_week = extract(dow from p_date)::integer
    and wh.is_active;

  if not found then
    return;
  end if;

  select make_interval(mins => coalesce(settings.slot_interval_minutes, 30))
  into v_step
  from public.barbershop_settings settings
  where settings.barbershop_id = p_barbershop_id;

  v_step := coalesce(v_step, interval '30 minutes');
  v_time := v_wh.start_time;

  while v_time + make_interval(mins => v_total_duration) <= v_wh.end_time loop
    v_candidate_start := (p_date::text || ' ' || v_time::text)::timestamptz;
    v_candidate_end := v_candidate_start
      + make_interval(mins => v_total_duration);

    if not (
      v_time < v_wh.lunch_end_time
      and v_time + make_interval(mins => v_total_duration)
        > v_wh.lunch_start_time
    ) and not exists(
      select 1
      from public.appointments a
      where a.barbershop_id = p_barbershop_id
        and a.barber_id = v_bs.barber_id
        and a.status not in ('cancelled', 'no_show')
        and a.start_at < v_candidate_end
        and a.end_at > v_candidate_start
    ) and not exists(
      select 1
      from public.barber_blocked_times bt
      where bt.barbershop_id = p_barbershop_id
        and bt.barber_id = v_bs.barber_id
        and bt.start_at < v_candidate_end
        and bt.end_at > v_candidate_start
    ) then
      available_time := v_time;
      return next;
    end if;

    v_time := v_time + v_step;
  end loop;
end;
$$;

revoke execute on function private.get_selected_barber_add_on_duration(
  uuid,uuid,jsonb
) from public,anon,authenticated;
revoke execute on function public.get_public_available_slots_for_service_and_add_ons(
  uuid,uuid,jsonb,date
) from public;
grant execute on function public.get_public_available_slots_for_service_and_add_ons(
  uuid,uuid,jsonb,date
) to anon,authenticated;
