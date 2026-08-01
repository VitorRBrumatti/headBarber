begin;

create extension if not exists pgtap with schema extensions;
select plan(42);

select function_returns(
  'public', 'register_client_subscription_payment',
  array['uuid','date','text'], 'jsonb',
  'payment RPC has stable signature'
);
select function_returns(
  'private', 'recalculate_appointment_subscription_totals',
  array['uuid'], 'void',
  'appointment recalculation helper has stable signature'
);
select function_returns(
  'private', 'reconcile_subscription_cycle',
  array['uuid'], 'void',
  'cycle reconciliation helper has stable signature'
);
select function_returns(
  'private', 'promote_waiting_subscription_allocation',
  array['uuid'], 'uuid',
  'waiting-list promotion helper has stable signature'
);

insert into public.barbershops(id,name,slug) values
('d2000000-0000-0000-0000-000000000001','Cycles A','cycles-a'),
('d2000000-0000-0000-0000-000000000002','Cycles B','cycles-b');

insert into auth.users(id,email) values
('d2000000-0000-0000-0000-000000000011','cycles-a@test.local'),
('d2000000-0000-0000-0000-000000000012','cycles-b@test.local');

insert into public.subscriptions(user_id,status) values
('d2000000-0000-0000-0000-000000000011','active'),
('d2000000-0000-0000-0000-000000000012','active');

update public.profiles
set barbershop_id='d2000000-0000-0000-0000-000000000001', role='owner'
where id='d2000000-0000-0000-0000-000000000011';
update public.profiles
set barbershop_id='d2000000-0000-0000-0000-000000000002', role='owner'
where id='d2000000-0000-0000-0000-000000000012';

insert into public.barbers(id,barbershop_id,name,commission_percentage) values
('d2000000-0000-0000-0000-000000000021','d2000000-0000-0000-0000-000000000001','Barber A',40),
('d2000000-0000-0000-0000-000000000022','d2000000-0000-0000-0000-000000000002','Barber B',40);

insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('d2000000-0000-0000-0000-000000000031','d2000000-0000-0000-0000-000000000001','Corte A',50,30),
('d2000000-0000-0000-0000-000000000032','d2000000-0000-0000-0000-000000000002','Corte B',60,30);

insert into public.barber_services(
  id,barbershop_id,barber_id,service_id,price,duration_minutes
) values
('d2000000-0000-0000-0000-000000000035','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000021','d2000000-0000-0000-0000-000000000031',50,30),
('d2000000-0000-0000-0000-000000000036','d2000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000022','d2000000-0000-0000-0000-000000000032',60,30);

insert into public.barber_work_hours(
  barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time
)
select
  'd2000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000021',
  day_of_week,'08:00','20:00','12:00','13:00'
from generate_series(0,6) as day_of_week;

insert into public.clients(id,barbershop_id,name,phone) values
('d2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000001','Cliente A','11911111111'),
('d2000000-0000-0000-0000-000000000042','d2000000-0000-0000-0000-000000000002','Cliente B','11922222222');

insert into public.subscription_plans(id,barbershop_id,name,monthly_price) values
('d2000000-0000-0000-0000-000000000051','d2000000-0000-0000-0000-000000000001','Essencial',60),
('d2000000-0000-0000-0000-000000000052','d2000000-0000-0000-0000-000000000001','Premium',100),
('d2000000-0000-0000-0000-000000000053','d2000000-0000-0000-0000-000000000002','Plano B',120);

insert into public.subscription_plan_items(
  id,barbershop_id,plan_id,item_type,service_id,monthly_limit
) values
('d2000000-0000-0000-0000-000000000061','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000051','service','d2000000-0000-0000-0000-000000000031',1),
('d2000000-0000-0000-0000-000000000062','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000052','service','d2000000-0000-0000-0000-000000000031',2),
('d2000000-0000-0000-0000-000000000063','d2000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000053','service','d2000000-0000-0000-0000-000000000032',1);

insert into public.client_subscriptions(
  id,barbershop_id,client_id,plan_id,pending_plan_id,status,started_on,next_billing_date
) values
('d2000000-0000-0000-0000-000000000071','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000051','d2000000-0000-0000-0000-000000000052','active','2030-08-01','2030-08-01'),
('d2000000-0000-0000-0000-000000000072','d2000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000042','d2000000-0000-0000-0000-000000000053',null,'active','2030-08-01','2030-08-01');

insert into public.appointments(
  id,barbershop_id,client_id,barber_id,service_id,barber_service_id,start_at,end_at,status,
  service_price,service_duration_minutes,total_price,subscription_coverage_status
) values
('d2000000-0000-0000-0000-000000000081','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000021','d2000000-0000-0000-0000-000000000031','d2000000-0000-0000-0000-000000000035','2030-08-05 10:00:00+00','2030-08-05 10:30:00+00','confirmed',50,30,50,'awaiting_cycle'),
('d2000000-0000-0000-0000-000000000082','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000021','d2000000-0000-0000-0000-000000000031','d2000000-0000-0000-0000-000000000035','2030-08-12 10:00:00+00','2030-08-12 10:30:00+00','confirmed',50,30,50,'awaiting_cycle'),
('d2000000-0000-0000-0000-000000000083','d2000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000021','d2000000-0000-0000-0000-000000000031','d2000000-0000-0000-0000-000000000035','2030-08-20 10:00:00+00','2030-08-20 10:30:00+00','confirmed',50,30,50,'awaiting_cycle');

set local role authenticated;
set local "request.jwt.claim.sub"='d2000000-0000-0000-0000-000000000011';

select lives_ok(
  $$select public.register_client_subscription_payment(
    'd2000000-0000-0000-0000-000000000071', date '2030-08-01', 'pix'
  )$$,
  'payment creates and reconciles a paid cycle'
);
select is(
  (select count(*) from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  1::bigint, 'one cycle is created'
);
select is(
  (select status from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  'paid', 'cycle is immediately paid'
);
select is(
  (select plan_id_snapshot from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  'd2000000-0000-0000-0000-000000000052'::uuid, 'pending plan is snapshotted'
);
select is(
  (select plan_name_snapshot from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  'Premium', 'plan name is frozen in the cycle'
);
select is(
  (select price_snapshot from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  100::numeric, 'plan price is frozen in the cycle'
);
select is(
  (select period_end from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  date '2030-09-01', 'cycle uses a half-open monthly period'
);
select is(
  (select count(*) from public.revenues where source='subscription_cycle'),
  1::bigint, 'payment creates one subscription revenue'
);
select is(
  (select amount from public.revenues where source='subscription_cycle'),
  100::numeric, 'revenue uses the cycle price snapshot'
);
select is(
  (select count(*) from public.subscription_cycle_entitlements),
  1::bigint, 'cycle receives a benefit snapshot'
);
select is(
  (select monthly_limit from public.subscription_cycle_entitlements),
  2, 'benefit quota is frozen in the cycle'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000081'),
  'reserved', 'earliest appointment receives coverage'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000082'),
  'reserved', 'second appointment receives the remaining quota'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000083'),
  'waiting', 'later appointment waits when quota is exhausted'
);
select is(
  (select amount_due from public.appointments where id='d2000000-0000-0000-0000-000000000081'),
  0::numeric, 'covered appointment has no amount due'
);
select is(
  (select amount_due from public.appointments where id='d2000000-0000-0000-0000-000000000083'),
  50::numeric, 'waiting appointment remains at normal price'
);
select is(
  (select subscription_coverage_status from public.appointments where id='d2000000-0000-0000-0000-000000000083'),
  'waiting', 'waiting coverage state is explicit'
);
select is(
  (select plan_id from public.client_subscriptions where id='d2000000-0000-0000-0000-000000000071'),
  'd2000000-0000-0000-0000-000000000052'::uuid, 'pending plan becomes current at payment'
);
select is(
  (select pending_plan_id from public.client_subscriptions where id='d2000000-0000-0000-0000-000000000071'),
  null, 'pending plan is cleared atomically'
);
select is(
  (select next_billing_date from public.client_subscriptions where id='d2000000-0000-0000-0000-000000000071'),
  date '2030-09-01', 'next billing date advances to period end'
);

select lives_ok(
  $$select public.register_client_subscription_payment(
    'd2000000-0000-0000-0000-000000000071', date '2030-08-01', 'pix'
  )$$,
  'duplicate payment returns the existing receipt'
);
select is(
  (select count(*) from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071'),
  1::bigint, 'duplicate payment does not create a second cycle'
);
select is(
  (select count(*) from public.revenues where source='subscription_cycle'),
  1::bigint, 'duplicate payment does not duplicate revenue'
);
select is(
  (select count(*) from public.appointment_subscription_allocations),
  3::bigint, 'duplicate payment does not duplicate allocations'
);

reset role;

insert into public.appointments(
  id,barbershop_id,client_id,barber_id,service_id,barber_service_id,start_at,end_at,status,
  service_price,service_duration_minutes,total_price,subscription_coverage_status
) values (
  'd2000000-0000-0000-0000-000000000084','d2000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000041','d2000000-0000-0000-0000-000000000021',
  'd2000000-0000-0000-0000-000000000031','d2000000-0000-0000-0000-000000000035','2030-08-03 10:00:00+00','2030-08-03 10:30:00+00',
  'confirmed',50,30,50,'awaiting_cycle'
);

select lives_ok(
  $$select private.reconcile_subscription_cycle(
    (select id from public.subscription_cycles where client_subscription_id='d2000000-0000-0000-0000-000000000071')
  )$$,
  'reconciliation can safely run again'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000084'),
  'waiting', 'new earlier appointment cannot steal confirmed coverage'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000081'),
  'reserved', 'existing coverage remains locked'
);

update public.appointment_subscription_allocations
set status='released', released_at=timezone('utc',now()), reserved_at=null
where appointment_id='d2000000-0000-0000-0000-000000000081';
select private.recalculate_appointment_subscription_totals('d2000000-0000-0000-0000-000000000081');

select is(
  private.promote_waiting_subscription_allocation(
    (select id from public.subscription_cycle_entitlements limit 1)
  ),
  'd2000000-0000-0000-0000-000000000084'::uuid,
  'released quota promotes the nearest waiting appointment'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000084'),
  'reserved', 'promoted appointment becomes covered'
);
select is(
  (select status from public.appointment_subscription_allocations where appointment_id='d2000000-0000-0000-0000-000000000083'),
  'waiting', 'later waiting appointment remains queued'
);
select is(
  (select amount_due from public.appointments where id='d2000000-0000-0000-0000-000000000081'),
  50::numeric, 'released appointment returns to normal price'
);
select is(
  (select amount_due from public.appointments where id='d2000000-0000-0000-0000-000000000084'),
  0::numeric, 'promoted appointment receives subscription pricing'
);

set local role authenticated;
set local "request.jwt.claim.sub"='d2000000-0000-0000-0000-000000000011';

select throws_ok(
  $$select public.register_client_subscription_payment(
    'd2000000-0000-0000-0000-000000000072', date '2030-08-01', 'pix'
  )$$,
  'P0001', 'INVALID_SUBSCRIPTION', 'cross-tenant subscription is rejected'
);
select throws_ok(
  $$select public.register_client_subscription_payment(
    'd2000000-0000-0000-0000-000000000071', date '2030-10-01', 'pix'
  )$$,
  'P0001', 'PAYMENT_CONFLICT', 'billing periods cannot be skipped'
);
select throws_ok(
  $$select public.register_client_subscription_payment(
    'd2000000-0000-0000-0000-000000000071', date '2030-09-01', 'bitcoin'
  )$$,
  'P0001', 'INVALID_PAYMENT', 'unsupported payment method is rejected'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.register_client_subscription_payment(uuid,date,text)',
    'EXECUTE'
  ),
  'authenticated members can execute payment RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_client_subscription_payment(uuid,date,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot register payments'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.reconcile_subscription_cycle(uuid)',
    'EXECUTE'
  ),
  'private reconciliation helper is not exposed'
);

select * from finish();
rollback;
