begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select function_returns(
  'private', 'create_appointment_with_entitlements',
  array['uuid','text','text','text','uuid','bigint','timestamptz','text','jsonb','jsonb','boolean'],
  'jsonb', 'shared booking core has a stable signature'
);
select function_returns(
  'public', 'preview_public_booking_with_entitlements',
  array['uuid','text','uuid','bigint','timestamptz','jsonb','jsonb'],
  'jsonb', 'preview wrapper has a stable signature'
);
select function_returns(
  'public', 'create_public_booking_with_entitlements',
  array['uuid','text','text','text','uuid','bigint','timestamptz','text','jsonb','jsonb'],
  'jsonb', 'public confirmation wrapper has a stable signature'
);
select function_returns(
  'public', 'create_admin_booking_with_entitlements',
  array['text','text','text','uuid','bigint','timestamptz','text','jsonb','jsonb'],
  'jsonb', 'admin confirmation wrapper has a stable signature'
);

insert into public.barbershops(id,name,slug) values
('f1000000-0000-0000-0000-000000000001','Booking A','subscription-booking-a'),
('f1000000-0000-0000-0000-000000000002','Booking B','subscription-booking-b');

insert into public.barbers(id,barbershop_id,name) values
('f1000000-0000-0000-0000-000000000011','f1000000-0000-0000-0000-000000000001','Ana'),
('f1000000-0000-0000-0000-000000000012','f1000000-0000-0000-0000-000000000002','Bia');

insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('f1000000-0000-0000-0000-000000000021','f1000000-0000-0000-0000-000000000001','Corte',40,30),
('f1000000-0000-0000-0000-000000000022','f1000000-0000-0000-0000-000000000002','Outro',60,30);

insert into public.barber_services(
  id,barbershop_id,barber_id,service_id,price,duration_minutes
) values
('f1000000-0000-0000-0000-000000000031','f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000011','f1000000-0000-0000-0000-000000000021',40,30),
('f1000000-0000-0000-0000-000000000032','f1000000-0000-0000-0000-000000000002','f1000000-0000-0000-0000-000000000012','f1000000-0000-0000-0000-000000000022',60,30);

insert into public.add_ons(id,barbershop_id,name,price,duration_minutes) values
('f1000000-0000-0000-0000-000000000041','f1000000-0000-0000-0000-000000000001','Barba',10,15);
insert into public.barber_add_ons(
  id,barbershop_id,barber_id,add_on_id,price,duration_minutes
) values (
  'f1000000-0000-0000-0000-000000000042','f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000011','f1000000-0000-0000-0000-000000000041',12,15
);

insert into public.products(id,barbershop_id,name,sale_price,stock_quantity) values
('f1000000-0000-0000-0000-000000000051','f1000000-0000-0000-0000-000000000001','Pomada',15,5);

insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
) values (
  'f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000011',
  extract(dow from date '2030-08-05'),'08:00','20:00','12:00','13:00'
);

insert into public.clients(id,barbershop_id,name,phone) values
('f1000000-0000-0000-0000-000000000061','f1000000-0000-0000-0000-000000000001','Pago','11911111111'),
('f1000000-0000-0000-0000-000000000062','f1000000-0000-0000-0000-000000000001','Futuro','11922222222');

insert into public.subscription_plans(id,barbershop_id,name,monthly_price) values
('f1000000-0000-0000-0000-000000000071','f1000000-0000-0000-0000-000000000001','Premium',100);
insert into public.client_subscriptions(
  id,barbershop_id,client_id,plan_id,status,started_on,next_billing_date
) values
('f1000000-0000-0000-0000-000000000072','f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000061','f1000000-0000-0000-0000-000000000071','active','2030-08-01','2030-09-01'),
('f1000000-0000-0000-0000-000000000073','f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000062','f1000000-0000-0000-0000-000000000071','active','2030-08-01','2030-08-01');

insert into public.subscription_cycles(
  id,barbershop_id,client_subscription_id,period_start,period_end,status,
  plan_id_snapshot,plan_name_snapshot,price_snapshot,payment_method,paid_at
) values (
  'f1000000-0000-0000-0000-000000000081','f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000072','2030-08-01','2030-09-01','paid',
  'f1000000-0000-0000-0000-000000000071','Premium',100,'pix',timezone('utc',now())
);
insert into public.subscription_cycle_entitlements(
  id,barbershop_id,cycle_id,item_type,service_id,add_on_id,item_name_snapshot,monthly_limit
) values
('f1000000-0000-0000-0000-000000000091','f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000081','service','f1000000-0000-0000-0000-000000000021',null,'Corte',1),
('f1000000-0000-0000-0000-000000000092','f1000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000081','add_on',null,'f1000000-0000-0000-0000-000000000041','Barba',1);

create temporary table preview_receipt as
select public.preview_public_booking_with_entitlements(
  'f1000000-0000-0000-0000-000000000001','11911111111',
  'f1000000-0000-0000-0000-000000000031',1,'2030-08-05 09:00+00',
  '[{"barberAddOnId":"f1000000-0000-0000-0000-000000000042","configurationVersion":1}]',
  '[{"productId":"f1000000-0000-0000-0000-000000000051","quantity":2}]'
) value;

select is((select count(*) from public.appointments where barbershop_id='f1000000-0000-0000-0000-000000000001'),0::bigint,'preview writes no appointment');
select is((select stock_quantity from public.products where id='f1000000-0000-0000-0000-000000000051'),5,'preview reserves no product stock');
select is((select value->>'subscriptionCoveredTotal' from preview_receipt),'52.00','preview covers service and add-on');
select is((select value->>'amountDue' from preview_receipt),'0.00','preview reports no attendance amount due');
select is((select value->>'totalAtShop' from preview_receipt),'30.00','products remain payable outside the plan');

create temporary table first_receipt as
select public.create_public_booking_with_entitlements(
  'f1000000-0000-0000-0000-000000000001','Pago','11911111111',null,
  'f1000000-0000-0000-0000-000000000031',1,'2030-08-05 09:00+00',null,
  '[{"barberAddOnId":"f1000000-0000-0000-0000-000000000042","configurationVersion":1}]',
  '[{"productId":"f1000000-0000-0000-0000-000000000051","quantity":2}]'
) value;

select is((select value->>'attendanceTotal' from first_receipt),(select value->>'attendanceTotal' from preview_receipt),'confirmation matches unchanged preview gross');
select is((select value->>'subscriptionCoveredTotal' from first_receipt),(select value->>'subscriptionCoveredTotal' from preview_receipt),'confirmation matches unchanged preview coverage');
select is((select value->>'subscriptionCoverageStatus' from first_receipt),'covered','first eligible booking is covered');
select is((select value->>'subscriptionPlanName' from first_receipt),'Premium','receipt identifies the paid plan snapshot');
select is((select stock_quantity from public.products where id='f1000000-0000-0000-0000-000000000051'),3,'confirmation reserves product stock');
select is((select count(*) from public.appointment_products where appointment_id=(select (value->>'appointmentId')::uuid from first_receipt)),1::bigint,'product snapshot belongs to the appointment');

create temporary table waiting_receipt as
select public.create_public_booking_with_entitlements(
  'f1000000-0000-0000-0000-000000000001','Pago','11911111111',null,
  'f1000000-0000-0000-0000-000000000031',1,'2030-08-05 10:00+00',null,
  '[{"barberAddOnId":"f1000000-0000-0000-0000-000000000042","configurationVersion":1}]','[]'
) value;
select is((select value->>'subscriptionCoverageStatus' from waiting_receipt),'waiting','exhausted quotas put the booking on the waiting list');
select is((select value->>'amountDue' from waiting_receipt),'52.00','waiting booking keeps normal price');
select is((select count(*) from public.appointment_subscription_allocations where appointment_id=(select (value->>'appointmentId')::uuid from waiting_receipt) and status='waiting'),2::bigint,'each exhausted eligible item is queued');

update public.subscription_cycle_entitlements
set monthly_limit=null
where id='f1000000-0000-0000-0000-000000000092';
create temporary table partial_receipt as
select public.create_public_booking_with_entitlements(
  'f1000000-0000-0000-0000-000000000001','Pago','11911111111',null,
  'f1000000-0000-0000-0000-000000000031',1,'2030-08-05 11:00+00',null,
  '[{"barberAddOnId":"f1000000-0000-0000-0000-000000000042","configurationVersion":1}]','[]'
) value;
select is((select value->>'subscriptionCoverageStatus' from partial_receipt),'partial','unlimited add-on can cover a partially eligible booking');
select is((select value->>'subscriptionCoveredTotal' from partial_receipt),'12.00','partial coverage uses the add-on price snapshot');
select is((select value->>'amountDue' from partial_receipt),'40.00','partial booking charges only the uncovered service');

create temporary table future_receipt as
select public.create_public_booking_with_entitlements(
  'f1000000-0000-0000-0000-000000000001','Futuro','11922222222',null,
  'f1000000-0000-0000-0000-000000000031',1,'2030-08-05 14:00+00',null,'[]','[]'
) value;
select is((select value->>'subscriptionCoverageStatus' from future_receipt),'awaiting_cycle','unpaid future cycle is explicit');
select is((select value->>'amountDue' from future_receipt),'40.00','unpaid future cycle keeps normal price');

insert into public.subscription_cycles(
  id,barbershop_id,client_subscription_id,period_start,period_end,status,
  plan_id_snapshot,plan_name_snapshot,price_snapshot,payment_method,paid_at
) values (
  'f1000000-0000-0000-0000-000000000082','f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000073','2030-08-01','2030-09-01','paid',
  'f1000000-0000-0000-0000-000000000071','Premium',100,'pix',timezone('utc',now())
);
insert into public.subscription_cycle_entitlements(
  id,barbershop_id,cycle_id,item_type,service_id,item_name_snapshot,monthly_limit
) values (
  'f1000000-0000-0000-0000-000000000093','f1000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000082','service','f1000000-0000-0000-0000-000000000021','Corte',1
);
select private.reconcile_subscription_cycle('f1000000-0000-0000-0000-000000000082');
select is((select amount_due from public.appointments where id=(select (value->>'appointmentId')::uuid from future_receipt)),0::numeric,'payment reconciliation adjusts the existing future booking');
select is((select subscription_coverage_status from public.appointments where id=(select (value->>'appointmentId')::uuid from future_receipt)),'covered','reconciled future booking returns to subscription pricing');

select throws_ok(
  $$select public.preview_public_booking_with_entitlements(
    'f1000000-0000-0000-0000-000000000001','11911111111',
    'f1000000-0000-0000-0000-000000000031',0,'2030-08-05 15:00+00','[]','[]'
  )$$,
  'P0001','CONFIG_CHANGED','stale service configuration is rejected'
);
select throws_ok(
  $$select public.preview_public_booking_with_entitlements(
    'f1000000-0000-0000-0000-000000000001','11911111111',
    'f1000000-0000-0000-0000-000000000032',1,'2030-08-05 15:00+00','[]','[]'
  )$$,
  'P0001','INVALID_BARBER_SERVICE','cross-tenant barber service is rejected'
);

select ok(has_function_privilege('anon','public.preview_public_booking_with_entitlements(uuid,text,uuid,bigint,timestamptz,jsonb,jsonb)','EXECUTE'),'anonymous users can preview');
select ok(has_function_privilege('anon','public.create_public_booking_with_entitlements(uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb)','EXECUTE'),'anonymous users can confirm');
select ok(not has_function_privilege('anon','public.create_admin_booking_with_entitlements(text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb)','EXECUTE'),'anonymous users cannot use the admin wrapper');
select ok(not has_function_privilege('authenticated','private.create_appointment_with_entitlements(uuid,text,text,text,uuid,bigint,timestamptz,text,jsonb,jsonb,boolean)','EXECUTE'),'shared writer remains private');

select * from finish();
rollback;
