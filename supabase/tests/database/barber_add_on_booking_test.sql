begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.barbershops(id,name,slug) values
('d0000000-0000-0000-0000-000000000001','Slots A','addon-slots-a'),
('d0000000-0000-0000-0000-000000000002','Slots B','addon-slots-b');

insert into public.barbers(id,barbershop_id,name) values
('d0000000-0000-0000-0000-000000000011','d0000000-0000-0000-0000-000000000001','Ana'),
('d0000000-0000-0000-0000-000000000012','d0000000-0000-0000-0000-000000000001','Bia'),
('d0000000-0000-0000-0000-000000000013','d0000000-0000-0000-0000-000000000002','Caio');

insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('d0000000-0000-0000-0000-000000000021','d0000000-0000-0000-0000-000000000001','Corte',40,30),
('d0000000-0000-0000-0000-000000000022','d0000000-0000-0000-0000-000000000002','Outro',50,30);

insert into public.barber_services(
  id,barbershop_id,barber_id,service_id,price,duration_minutes
) values
('d0000000-0000-0000-0000-000000000031','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000011','d0000000-0000-0000-0000-000000000021',40,30),
('d0000000-0000-0000-0000-000000000032','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000013','d0000000-0000-0000-0000-000000000022',50,30);

insert into public.add_ons(id,barbershop_id,name,price,duration_minutes) values
('d0000000-0000-0000-0000-000000000041','d0000000-0000-0000-0000-000000000001','Barba',10,15),
('d0000000-0000-0000-0000-000000000042','d0000000-0000-0000-0000-000000000001','Pezinho',8,10),
('d0000000-0000-0000-0000-000000000043','d0000000-0000-0000-0000-000000000002','Externo',20,20);

insert into public.barber_add_ons(
  id,barbershop_id,barber_id,add_on_id,price,duration_minutes
) values
('d0000000-0000-0000-0000-000000000051','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000011','d0000000-0000-0000-0000-000000000041',12,15),
('d0000000-0000-0000-0000-000000000052','d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000012','d0000000-0000-0000-0000-000000000042',9,10),
('d0000000-0000-0000-0000-000000000053','d0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000013','d0000000-0000-0000-0000-000000000043',20,20);

insert into public.barbershop_settings(barbershop_id,slot_interval_minutes)
values('d0000000-0000-0000-0000-000000000001',15);

insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
) values(
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000011',
  extract(dow from date '2030-07-22'),
  '09:00','18:00','12:00','13:00'
);

select has_function(
  'public',
  'get_public_available_slots_for_service_and_add_ons',
  array['uuid','uuid','jsonb','date']
);
select function_returns(
  'public',
  'get_public_available_slots_for_service_and_add_ons',
  array['uuid','uuid','jsonb','date'],
  'setof time without time zone'
);
select ok(
  time '11:15' in(
    select available_time
    from public.get_public_available_slots_for_service_and_add_ons(
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000031',
      '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000051","configurationVersion":1}]',
      date '2030-07-22'
    )
  ),
  '45-minute attendance can end at lunch'
);
select ok(
  time '11:30' not in(
    select available_time
    from public.get_public_available_slots_for_service_and_add_ons(
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000031',
      '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000051","configurationVersion":1}]',
      date '2030-07-22'
    )
  ),
  '45-minute attendance cannot cross lunch'
);
select throws_ok(
  $$select public.get_public_available_slots_for_service_and_add_ons(
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000031',
    '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000051","configurationVersion":1},
      {"barberAddOnId":"d0000000-0000-0000-0000-000000000051","configurationVersion":1}]',
    date '2030-07-22'
  )$$,
  'P0001','INVALID_ADD_ON','duplicate relationship rejected'
);
select throws_ok(
  $$select public.get_public_available_slots_for_service_and_add_ons(
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000031',
    '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000053","configurationVersion":1}]',
    date '2030-07-22'
  )$$,
  'P0001','INVALID_ADD_ON','cross-tenant relationship rejected'
);
select throws_ok(
  $$select public.get_public_available_slots_for_service_and_add_ons(
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000031',
    '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000052","configurationVersion":1}]',
    date '2030-07-22'
  )$$,
  'P0001','INVALID_ADD_ON','other-barber relationship rejected'
);
select throws_ok(
  $$select public.get_public_available_slots_for_service_and_add_ons(
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000031',
    '[{"barberAddOnId":"d0000000-0000-0000-0000-000000000051","configurationVersion":0}]',
    date '2030-07-22'
  )$$,
  'P0001','CONFIG_CHANGED','stale relationship version rejected'
);
select ok(
  time '11:30' in(
    select available_time
    from public.get_public_available_slots_for_service(
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000031',
      date '2030-07-22'
    )
  ),
  'legacy service-only wrapper remains available'
);

select * from finish();
rollback;
