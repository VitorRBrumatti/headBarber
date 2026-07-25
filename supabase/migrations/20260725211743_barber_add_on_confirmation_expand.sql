-- Confirm bookings from versioned barber add-on relationships. All money and
-- duration values are re-read and snapshotted by the database.
create or replace function public.create_public_booking_with_barber_add_ons(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_service_id uuid,
  p_configuration_version bigint,
  p_start_at timestamptz,
  p_notes text,
  p_add_ons jsonb,
  p_products jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_service public.barber_services%rowtype;
  v_add_ons jsonb := coalesce(p_add_ons, '[]'::jsonb);
  v_products jsonb := coalesce(p_products, '[]'::jsonb);
  v_add_on_duration integer;
  v_add_on_total numeric(10,2);
  v_product_total numeric(10,2) := 0;
  v_bad_products jsonb;
  v_phone text;
  v_client_id uuid;
  v_appointment_id uuid;
  v_end_at timestamptz;
  v_result jsonb;
begin
  if jsonb_typeof(v_products) <> 'array' or exists(
    select 1
    from jsonb_to_recordset(v_products)
      x("productId" uuid, quantity integer)
    where x."productId" is null
       or x.quantity is null
       or x.quantity <= 0
  ) or exists(
    select 1
    from jsonb_to_recordset(v_products)
      x("productId" uuid, quantity integer)
    group by x."productId"
    having count(*) > 1
  ) then
    raise exception using message = 'INVALID_PRODUCTS';
  end if;

  select bs.*
  into v_service
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
  for update of bs;

  if not found then
    raise exception using message = 'INVALID_BARBER_SERVICE';
  end if;
  if v_service.configuration_version <> p_configuration_version then
    raise exception using message = 'CONFIG_CHANGED';
  end if;

  v_add_on_duration := private.get_selected_barber_add_on_duration(
    p_barbershop_id,
    v_service.barber_id,
    v_add_ons
  );

  select coalesce(sum(ba.price), 0)
  into v_add_on_total
  from public.barber_add_ons ba
  join jsonb_to_recordset(v_add_ons)
    x("barberAddOnId" uuid, "configurationVersion" bigint)
    on x."barberAddOnId" = ba.id
  where ba.barbershop_id = p_barbershop_id
    and ba.barber_id = v_service.barber_id;

  perform product.id
  from public.products product
  join jsonb_to_recordset(v_products)
    x("productId" uuid, quantity integer)
    on x."productId" = product.id
  order by product.id
  for update of product;

  select jsonb_agg(
    jsonb_build_object(
      'productId', x."productId",
      'availableQuantity', coalesce(product.stock_quantity, 0)
    )
  )
  into v_bad_products
  from jsonb_to_recordset(v_products)
    x("productId" uuid, quantity integer)
  left join public.products product
    on product.id = x."productId"
   and product.barbershop_id = p_barbershop_id
   and product.is_active
  where product.id is null
     or product.stock_quantity < x.quantity;

  if v_bad_products is not null then
    raise exception using
      message = 'INSUFFICIENT_STOCK',
      detail = v_bad_products::text;
  end if;

  v_end_at := p_start_at + make_interval(
    mins => v_service.duration_minutes + v_add_on_duration
  );
  perform private.assert_bookable_appointment_interval(
    null,
    p_barbershop_id,
    v_service.barber_id,
    v_service.id,
    p_start_at,
    v_end_at,
    'confirmed',
    v_service.service_id
  );

  v_phone := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  select client.id
  into v_client_id
  from public.clients client
  where client.barbershop_id = p_barbershop_id
    and client.normalized_phone = v_phone
  limit 1;

  if v_client_id is null then
    insert into public.clients(barbershop_id,name,phone,email)
    values(p_barbershop_id,p_client_name,p_client_phone,p_client_email)
    returning id into v_client_id;
  end if;

  insert into public.appointments(
    barbershop_id,
    client_id,
    barber_id,
    service_id,
    barber_service_id,
    start_at,
    end_at,
    status,
    service_price,
    service_duration_minutes,
    total_price,
    notes
  ) values(
    p_barbershop_id,
    v_client_id,
    v_service.barber_id,
    v_service.service_id,
    v_service.id,
    p_start_at,
    v_end_at,
    'confirmed',
    v_service.price,
    v_service.duration_minutes,
    v_service.price + v_add_on_total,
    p_notes
  ) returning id into v_appointment_id;

  insert into public.appointment_add_ons(
    barbershop_id,
    appointment_id,
    add_on_id,
    barber_add_on_id,
    price,
    duration_minutes
  )
  select
    p_barbershop_id,
    v_appointment_id,
    ba.add_on_id,
    ba.id,
    ba.price,
    ba.duration_minutes
  from public.barber_add_ons ba
  join jsonb_to_recordset(v_add_ons)
    x("barberAddOnId" uuid, "configurationVersion" bigint)
    on x."barberAddOnId" = ba.id;

  insert into public.appointment_products(
    barbershop_id,
    appointment_id,
    product_id,
    quantity,
    unit_price
  )
  select
    p_barbershop_id,
    v_appointment_id,
    product.id,
    x.quantity,
    product.sale_price
  from jsonb_to_recordset(v_products)
    x("productId" uuid, quantity integer)
  join public.products product
    on product.id = x."productId";

  update public.products product
  set
    stock_quantity = product.stock_quantity - x.quantity,
    updated_at = timezone('utc', now())
  from jsonb_to_recordset(v_products)
    x("productId" uuid, quantity integer)
  where product.id = x."productId";

  select coalesce(sum(ap.quantity * ap.unit_price), 0)
  into v_product_total
  from public.appointment_products ap
  where ap.appointment_id = v_appointment_id;

  select jsonb_build_object(
    'appointmentId', appointment.id,
    'barberId', appointment.barber_id,
    'barberName', barber.name,
    'serviceId', appointment.service_id,
    'serviceName', service.name,
    'servicePrice', to_char(appointment.service_price, 'FM999999990.00'),
    'serviceDurationMinutes', appointment.service_duration_minutes,
    'addOnDurationMinutes', v_add_on_duration,
    'addOnTotal', to_char(
      appointment.total_price - appointment.service_price,
      'FM999999990.00'
    ),
    'productSubtotal', to_char(v_product_total, 'FM999999990.00'),
    'attendanceTotal', to_char(appointment.total_price, 'FM999999990.00'),
    'totalAtShop', to_char(
      appointment.total_price + v_product_total,
      'FM999999990.00'
    ),
    'startAt', to_char(
      appointment.start_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) || '+00:00',
    'endAt', to_char(
      appointment.end_at at time zone 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) || '+00:00'
  )
  into v_result
  from public.appointments appointment
  join public.barbers barber on barber.id = appointment.barber_id
  join public.services service on service.id = appointment.service_id
  where appointment.id = v_appointment_id;

  return v_result;
end;
$$;

revoke execute on function public.create_public_booking_with_barber_add_ons(
  uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) from public;
grant execute on function public.create_public_booking_with_barber_add_ons(
  uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb
) to anon,authenticated;
