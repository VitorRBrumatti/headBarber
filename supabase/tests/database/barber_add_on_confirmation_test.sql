begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.barbershops(id,name,slug) values
('e0000000-0000-0000-0000-000000000001','Confirm A','addon-confirm-a'),
('e0000000-0000-0000-0000-000000000002','Confirm B','addon-confirm-b');

insert into public.barbers(id,barbershop_id,name) values
('e0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000001','Ana'),
('e0000000-0000-0000-0000-000000000012','e0000000-0000-0000-0000-000000000001','Bia'),
('e0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000002','Caio');

insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('e0000000-0000-0000-0000-000000000021','e0000000-0000-0000-0000-000000000001','Corte',40,30),
('e0000000-0000-0000-0000-000000000022','e0000000-0000-0000-0000-000000000002','Outro',50,30);

insert into public.barber_services(
  id,barbershop_id,barber_id,service_id,price,duration_minutes
) values
('e0000000-0000-0000-0000-000000000031','e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000021',40,30),
('e0000000-0000-0000-0000-000000000032','e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000022',50,30);

insert into public.add_ons(id,barbershop_id,name,price,duration_minutes) values
('e0000000-0000-0000-0000-000000000041','e0000000-0000-0000-0000-000000000001','Barba',10,15),
('e0000000-0000-0000-0000-000000000042','e0000000-0000-0000-0000-000000000001','Pezinho',8,10),
('e0000000-0000-0000-0000-000000000043','e0000000-0000-0000-0000-000000000002','Externo',20,20),
('e0000000-0000-0000-0000-000000000044','e0000000-0000-0000-0000-000000000001','Inativo',5,5);
update public.add_ons set is_active=false
where id='e0000000-0000-0000-0000-000000000044';

insert into public.barber_add_ons(
  id,barbershop_id,barber_id,add_on_id,price,duration_minutes,is_available
) values
('e0000000-0000-0000-0000-000000000051','e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000041',12,15,true),
('e0000000-0000-0000-0000-000000000052','e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000012','e0000000-0000-0000-0000-000000000042',9,10,true),
('e0000000-0000-0000-0000-000000000053','e0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000013','e0000000-0000-0000-0000-000000000043',20,20,true),
('e0000000-0000-0000-0000-000000000054','e0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000011','e0000000-0000-0000-0000-000000000044',5,5,true);

insert into public.products(
  id,barbershop_id,name,sale_price,stock_quantity
) values(
  'e0000000-0000-0000-0000-000000000061',
  'e0000000-0000-0000-0000-000000000001',
  'Pomada',15,5
);

insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
) values(
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000011',
  extract(dow from date '2030-07-22'),
  '09:00','18:00','12:00','13:00'
);

select has_function(
  'public',
  'create_public_booking_with_barber_add_ons',
  array['uuid','text','text','text','uuid','bigint','timestamptz','text','jsonb','jsonb']
);

create temporary table created_receipt as
select public.create_public_booking_with_barber_add_ons(
  'e0000000-0000-0000-0000-000000000001',
  'Cliente','11999999999','cliente@test.local',
  'e0000000-0000-0000-0000-000000000031',1,
  '2030-07-22 09:00+00',null,
  '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000051","configurationVersion":1}]',
  '[{"productId":"e0000000-0000-0000-0000-000000000061","quantity":2}]'
) value;

select is(
  (select value->>'endAt' from created_receipt),
  '2030-07-22T09:45:00+00:00',
  'receipt end includes add-on duration'
);
select is(
  (select value->>'addOnDurationMinutes' from created_receipt),
  '15',
  'receipt includes add-on duration'
);
select is(
  (select value->>'attendanceTotal' from created_receipt),
  '52.00',
  'receipt uses relationship price'
);
select results_eq(
  $$select price,duration_minutes,barber_add_on_id
    from public.appointment_add_ons
    where appointment_id=(
      select (value->>'appointmentId')::uuid from created_receipt
    )$$,
  $$values(
    12.00::numeric,
    15,
    'e0000000-0000-0000-0000-000000000051'::uuid
  )$$,
  'relationship and snapshots are authoritative'
);
select is(
  (select extract(epoch from end_at-start_at)::integer/60
   from public.appointments
   where id=(select (value->>'appointmentId')::uuid from created_receipt)),
  45,
  'appointment interval includes add-on duration'
);
select is(
  (select stock_quantity from public.products
   where id='e0000000-0000-0000-0000-000000000061'),
  3,
  'product stock reserved'
);

select throws_ok(
  $$select public.create_public_booking_with_barber_add_ons(
    'e0000000-0000-0000-0000-000000000001','Stale','1188',null,
    'e0000000-0000-0000-0000-000000000031',1,'2030-07-22 10:00+00',null,
    '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000051","configurationVersion":0}]',
    '[{"productId":"e0000000-0000-0000-0000-000000000061","quantity":1}]'
  )$$,
  'P0001','CONFIG_CHANGED','stale relationship rejected'
);
select throws_ok(
  $$select public.create_public_booking_with_barber_add_ons(
    'e0000000-0000-0000-0000-000000000001','Duplicate','1177',null,
    'e0000000-0000-0000-0000-000000000031',1,'2030-07-22 10:00+00',null,
    '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000051","configurationVersion":1},
      {"barberAddOnId":"e0000000-0000-0000-0000-000000000051","configurationVersion":1}]',
    '[]'
  )$$,
  'P0001','INVALID_ADD_ON','duplicate relationship rejected'
);
select throws_ok(
  $$select public.create_public_booking_with_barber_add_ons(
    'e0000000-0000-0000-0000-000000000001','Other barber','1166',null,
    'e0000000-0000-0000-0000-000000000031',1,'2030-07-22 10:00+00',null,
    '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000052","configurationVersion":1}]',
    '[]'
  )$$,
  'P0001','INVALID_ADD_ON','other-barber relationship rejected'
);
select throws_ok(
  $$select public.create_public_booking_with_barber_add_ons(
    'e0000000-0000-0000-0000-000000000001','Other tenant','1155',null,
    'e0000000-0000-0000-0000-000000000031',1,'2030-07-22 10:00+00',null,
    '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000053","configurationVersion":1}]',
    '[]'
  )$$,
  'P0001','INVALID_ADD_ON','cross-tenant relationship rejected'
);
select throws_ok(
  $$select public.create_public_booking_with_barber_add_ons(
    'e0000000-0000-0000-0000-000000000001','Inactive','1144',null,
    'e0000000-0000-0000-0000-000000000031',1,'2030-07-22 10:00+00',null,
    '[{"barberAddOnId":"e0000000-0000-0000-0000-000000000054","configurationVersion":1}]',
    '[]'
  )$$,
  'P0001','INVALID_ADD_ON','inactive add-on rejected'
);
select is(
  (select count(*) from public.appointments
   where barbershop_id='e0000000-0000-0000-0000-000000000001'),
  1::bigint,
  'failed confirmations leave appointment count unchanged'
);
select is(
  (select stock_quantity from public.products
   where id='e0000000-0000-0000-0000-000000000061'),
  3,
  'failed confirmations leave stock unchanged'
);

select * from finish();
rollback;
