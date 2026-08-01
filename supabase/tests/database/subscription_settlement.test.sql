begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

select function_returns(
  'public', 'settle_appointment', array['uuid','text','text'], 'jsonb',
  'settlement RPC has a stable signature'
);

insert into public.barbershops(id,name,slug) values
('f2000000-0000-0000-0000-000000000001','Settlement A','settlement-a'),
('f2000000-0000-0000-0000-000000000002','Settlement B','settlement-b');
insert into public.barbershop_settings(barbershop_id) values
('f2000000-0000-0000-0000-000000000001'),
('f2000000-0000-0000-0000-000000000002');

insert into auth.users(id,email) values
('f2000000-0000-0000-0000-000000000011','settlement-a@test.local'),
('f2000000-0000-0000-0000-000000000012','settlement-b@test.local');
insert into public.subscriptions(user_id,status) values
('f2000000-0000-0000-0000-000000000011','active'),
('f2000000-0000-0000-0000-000000000012','active');
update public.profiles set barbershop_id='f2000000-0000-0000-0000-000000000001',role='owner'
where id='f2000000-0000-0000-0000-000000000011';
update public.profiles set barbershop_id='f2000000-0000-0000-0000-000000000002',role='owner'
where id='f2000000-0000-0000-0000-000000000012';

insert into public.barbers(id,barbershop_id,name) values
('f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000001','Ana'),
('f2000000-0000-0000-0000-000000000022','f2000000-0000-0000-0000-000000000002','Bia');
insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000001','Corte',40,30),
('f2000000-0000-0000-0000-000000000032','f2000000-0000-0000-0000-000000000002','Outro',60,30);
insert into public.barber_services(id,barbershop_id,barber_id,service_id,price,duration_minutes) values
('f2000000-0000-0000-0000-000000000033','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031',40,30),
('f2000000-0000-0000-0000-000000000034','f2000000-0000-0000-0000-000000000002','f2000000-0000-0000-0000-000000000022','f2000000-0000-0000-0000-000000000032',60,30);
insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
)
select 'f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000021',day_of_week,'08:00','18:00','12:00','13:00'
from generate_series(0,6) as day_of_week;
insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
)
select 'f2000000-0000-0000-0000-000000000002','f2000000-0000-0000-0000-000000000022',day_of_week,'08:00','18:00','12:00','13:00'
from generate_series(0,6) as day_of_week;
insert into public.add_ons(id,barbershop_id,name,price,duration_minutes) values
('f2000000-0000-0000-0000-000000000035','f2000000-0000-0000-0000-000000000001','Barba',10,15);
insert into public.clients(id,barbershop_id,name,phone) values
('f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000001','Cliente A','11933333333'),
('f2000000-0000-0000-0000-000000000042','f2000000-0000-0000-0000-000000000002','Cliente B','11944444444');
insert into public.products(id,barbershop_id,name,sale_price,stock_quantity) values
('f2000000-0000-0000-0000-000000000051','f2000000-0000-0000-0000-000000000001','Pomada',15,7);

insert into public.subscription_plans(id,barbershop_id,name,monthly_price) values
('f2000000-0000-0000-0000-000000000061','f2000000-0000-0000-0000-000000000001','Premium',100);
insert into public.client_subscriptions(id,barbershop_id,client_id,plan_id,status,started_on,next_billing_date) values
('f2000000-0000-0000-0000-000000000062','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000061','active','2030-08-01','2030-09-01');
insert into public.subscription_cycles(
  id,barbershop_id,client_subscription_id,period_start,period_end,status,
  plan_id_snapshot,plan_name_snapshot,price_snapshot,payment_method,paid_at
) values (
  'f2000000-0000-0000-0000-000000000063','f2000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000062','2030-08-01','2030-09-01','paid',
  'f2000000-0000-0000-0000-000000000061','Premium',100,'pix',timezone('utc',now())
);
insert into public.subscription_cycle_entitlements(
  id,barbershop_id,cycle_id,item_type,service_id,add_on_id,item_name_snapshot,monthly_limit
) values
('f2000000-0000-0000-0000-000000000071','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000063','service','f2000000-0000-0000-0000-000000000031',null,'Corte',2),
('f2000000-0000-0000-0000-000000000073','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000063','add_on',null,'f2000000-0000-0000-0000-000000000035','Barba',1);

insert into public.appointments(
  id,barbershop_id,client_id,barber_id,service_id,barber_service_id,start_at,end_at,status,
  service_price,service_duration_minutes,total_price,subscription_covered_total,subscription_coverage_status
) values
('f2000000-0000-0000-0000-000000000080','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-01 09:00+00','2030-08-01 09:30+00','confirmed',40,30,40,0,'none'),
('f2000000-0000-0000-0000-000000000081','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-02 09:00+00','2030-08-02 09:30+00','confirmed',40,30,40,40,'covered'),
('f2000000-0000-0000-0000-000000000082','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-03 09:00+00','2030-08-03 09:30+00','confirmed',40,30,40,0,'none'),
('f2000000-0000-0000-0000-000000000083','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-04 09:00+00','2030-08-04 09:30+00','confirmed',40,30,40,40,'covered'),
('f2000000-0000-0000-0000-000000000084','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-05 09:00+00','2030-08-05 09:30+00','confirmed',40,30,40,0,'waiting'),
('f2000000-0000-0000-0000-000000000085','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-06 09:00+00','2030-08-06 09:30+00','confirmed',40,30,40,40,'covered'),
('f2000000-0000-0000-0000-000000000086','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000041','f2000000-0000-0000-0000-000000000021','f2000000-0000-0000-0000-000000000031','f2000000-0000-0000-0000-000000000033','2030-08-07 09:00+00','2030-08-07 09:30+00','confirmed',40,30,40,0,'none'),
('f2000000-0000-0000-0000-000000000087','f2000000-0000-0000-0000-000000000002','f2000000-0000-0000-0000-000000000042','f2000000-0000-0000-0000-000000000022','f2000000-0000-0000-0000-000000000032','f2000000-0000-0000-0000-000000000034','2030-08-07 10:00+00','2030-08-07 10:30+00','confirmed',60,30,60,0,'none');

insert into public.appointment_subscription_allocations(
  barbershop_id,appointment_id,cycle_entitlement_id,item_type,service_id,add_on_id,covered_amount,status,reserved_at
) values
('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000081','f2000000-0000-0000-0000-000000000071','service','f2000000-0000-0000-0000-000000000031',null,40,'reserved',timezone('utc',now())),
('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000083','f2000000-0000-0000-0000-000000000071','service','f2000000-0000-0000-0000-000000000031',null,40,'reserved',timezone('utc',now())),
('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000084','f2000000-0000-0000-0000-000000000071','service','f2000000-0000-0000-0000-000000000031',null,40,'waiting',null),
('f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000085','f2000000-0000-0000-0000-000000000073','add_on',null,'f2000000-0000-0000-0000-000000000035',40,'reserved',timezone('utc',now()));

insert into public.appointment_products(id,barbershop_id,appointment_id,product_id,quantity,unit_price,status) values
('f2000000-0000-0000-0000-000000000091','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000081','f2000000-0000-0000-0000-000000000051',1,15,'reserved'),
('f2000000-0000-0000-0000-000000000092','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000083','f2000000-0000-0000-0000-000000000051',1,15,'reserved'),
('f2000000-0000-0000-0000-000000000093','f2000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000085','f2000000-0000-0000-0000-000000000051',1,15,'reserved');

update public.appointments set status='completed' where id='f2000000-0000-0000-0000-000000000080';
select is((select count(*) from public.revenues where reference_id='f2000000-0000-0000-0000-000000000080' and source='appointment_service'),1::bigint,'flag-off legacy trigger still creates revenue');
select is((select amount from public.revenues where reference_id='f2000000-0000-0000-0000-000000000080' and source='appointment_service'),40::numeric,'legacy trigger uses amount due');

update public.barbershop_settings set client_subscriptions_settlement_enabled=true
where barbershop_id='f2000000-0000-0000-0000-000000000001';

set local role authenticated;
set local "request.jwt.claim.sub"='f2000000-0000-0000-0000-000000000011';

select lives_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000081','completed','pix')$$,'covered completion settles atomically');
select is((select status from public.appointments where id='f2000000-0000-0000-0000-000000000081'),'completed','appointment is completed');
select is((select status from public.appointment_subscription_allocations where appointment_id='f2000000-0000-0000-0000-000000000081'),'consumed','completion consumes benefit');
select is((select count(*) from public.revenues where source='appointment_service' and reference_id='f2000000-0000-0000-0000-000000000081'),0::bigint,'covered service creates no service revenue');
select is((select count(*) from public.product_sales where appointment_id='f2000000-0000-0000-0000-000000000081'),1::bigint,'completion sells the reserved product');
select is((select count(*) from public.revenues where source='appointment_product' and reference_id in (select id from public.product_sales where appointment_id='f2000000-0000-0000-0000-000000000081')),1::bigint,'product creates one revenue');
select is((select status from public.appointment_products where appointment_id='f2000000-0000-0000-0000-000000000081'),'sold','reserved product becomes sold');
select lives_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000081','completed','pix')$$,'repeated completion is idempotent');
select is((select count(*) from public.product_sales where appointment_id='f2000000-0000-0000-0000-000000000081'),1::bigint,'repeated completion does not duplicate sale');
select is((select count(*) from public.revenues where source='appointment_product' and reference_id in (select id from public.product_sales where appointment_id='f2000000-0000-0000-0000-000000000081')),1::bigint,'repeated completion does not duplicate product revenue');
select throws_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000081','cancelled',null)$$,'P0001','INVALID_STATUS_TRANSITION','terminal state cannot be changed');

select lives_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000082','completed','money')$$,'uncovered completion settles');
select is((select amount from public.revenues where source='appointment_service' and reference_id='f2000000-0000-0000-0000-000000000082'),40::numeric,'service revenue uses amount due');
select is((select payment_method from public.revenues where source='appointment_service' and reference_id='f2000000-0000-0000-0000-000000000082'),'money','service revenue snapshots payment method');

select lives_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000083','cancelled',null)$$,'cancellation settles atomically');
select is((select status from public.appointment_subscription_allocations where appointment_id='f2000000-0000-0000-0000-000000000083'),'released','cancellation releases benefit');
select is((select status from public.appointment_subscription_allocations where appointment_id='f2000000-0000-0000-0000-000000000084'),'reserved','cancellation promotes nearest waiting booking');
select is((select status from public.appointment_products where appointment_id='f2000000-0000-0000-0000-000000000083'),'released','cancellation releases product');
select is((select stock_quantity from public.products where id='f2000000-0000-0000-0000-000000000051'),8,'cancellation restores stock once');

select lives_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000085','no_show',null)$$,'no-show settles atomically');
select is((select status from public.appointment_subscription_allocations where appointment_id='f2000000-0000-0000-0000-000000000085'),'consumed','no-show consumes reserved benefit');
select is((select status from public.appointment_products where appointment_id='f2000000-0000-0000-0000-000000000085'),'released','no-show releases product');
select is((select stock_quantity from public.products where id='f2000000-0000-0000-0000-000000000051'),9,'no-show restores stock once');
select is((select count(*) from public.product_sales where appointment_id='f2000000-0000-0000-0000-000000000085'),0::bigint,'no-show creates no product sale');

select throws_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000086','confirmed','pix')$$,'P0001','INVALID_STATUS_TRANSITION','non-terminal target is rejected');
select throws_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000086','completed','bitcoin')$$,'P0001','INVALID_PAYMENT','invalid payment method is rejected');
select throws_ok($$select public.settle_appointment('f2000000-0000-0000-0000-000000000087','completed','pix')$$,'P0001','APPOINTMENT_NOT_FOUND','cross-tenant appointment is hidden');

reset role;
select ok(has_function_privilege('authenticated','public.settle_appointment(uuid,text,text)','EXECUTE'),'authenticated members can settle');
select ok(not has_function_privilege('anon','public.settle_appointment(uuid,text,text)','EXECUTE'),'anonymous callers cannot settle');
select is((select count(*) from public.revenues where source='appointment_service' and reference_id in ('f2000000-0000-0000-0000-000000000081'::uuid,'f2000000-0000-0000-0000-000000000085'::uuid)),0::bigint,'covered completion and no-show create no service revenue');

select * from finish();
rollback;
