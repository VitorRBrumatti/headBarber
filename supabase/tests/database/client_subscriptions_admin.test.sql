begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

select function_returns(
  'public', 'save_subscription_plan',
  array['uuid','text','text','numeric','jsonb'], 'uuid',
  'plan mutation RPC has stable signature'
);
select function_returns(
  'public', 'create_client_subscription',
  array['uuid','uuid','date','text'], 'uuid',
  'subscription creation RPC has stable signature'
);
select function_returns(
  'public', 'set_client_subscription_status',
  array['uuid','text'], 'jsonb',
  'subscription status RPC has stable signature'
);
select function_returns(
  'public', 'schedule_client_subscription_plan',
  array['uuid','uuid'], 'jsonb',
  'plan scheduling RPC has stable signature'
);

insert into public.barbershops(id,name,slug) values
('d1000000-0000-0000-0000-000000000001','Subscriptions A','subscriptions-a'),
('d1000000-0000-0000-0000-000000000002','Subscriptions B','subscriptions-b');

insert into auth.users(id,email) values
('d1000000-0000-0000-0000-000000000011','subscriptions-a@test.local'),
('d1000000-0000-0000-0000-000000000012','subscriptions-b@test.local');

insert into public.subscriptions(user_id,status) values
('d1000000-0000-0000-0000-000000000011','active'),
('d1000000-0000-0000-0000-000000000012','active');

update public.profiles
set barbershop_id='d1000000-0000-0000-0000-000000000001', role='owner'
where id='d1000000-0000-0000-0000-000000000011';
update public.profiles
set barbershop_id='d1000000-0000-0000-0000-000000000002', role='owner'
where id='d1000000-0000-0000-0000-000000000012';

insert into public.services(id,barbershop_id,name,price,duration_minutes) values
('d1000000-0000-0000-0000-000000000021','d1000000-0000-0000-0000-000000000001','Corte',50,30),
('d1000000-0000-0000-0000-000000000022','d1000000-0000-0000-0000-000000000002','Serviço externo',80,30);

insert into public.add_ons(id,barbershop_id,name,price) values
('d1000000-0000-0000-0000-000000000031','d1000000-0000-0000-0000-000000000001','Hidratação',20);

insert into public.clients(id,barbershop_id,name,phone) values
('d1000000-0000-0000-0000-000000000041','d1000000-0000-0000-0000-000000000001','Cliente A','11911111111'),
('d1000000-0000-0000-0000-000000000042','d1000000-0000-0000-0000-000000000002','Cliente B','11922222222');

set local role authenticated;
set local "request.jwt.claim.sub"='d1000000-0000-0000-0000-000000000011';

select lives_ok(
  $$select public.save_subscription_plan(
    'd1000000-0000-0000-0000-000000000051',
    'Premium', 'Plano principal', 149,
    '[
      {"itemType":"service","serviceId":"d1000000-0000-0000-0000-000000000021","monthlyLimit":null},
      {"itemType":"add_on","addOnId":"d1000000-0000-0000-0000-000000000031","monthlyLimit":2}
    ]'::jsonb
  )$$,
  'member creates a plan with service and add-on benefits'
);
select is(
  (select name from public.subscription_plans where id='d1000000-0000-0000-0000-000000000051'),
  'Premium',
  'plan belongs to the authenticated tenant'
);
select is(
  (select count(*) from public.subscription_plan_items where plan_id='d1000000-0000-0000-0000-000000000051'),
  2::bigint,
  'plan benefits are replaced atomically'
);
select is(
  (select monthly_limit from public.subscription_plan_items where service_id='d1000000-0000-0000-0000-000000000021'),
  null,
  'null monthly limit represents unlimited use'
);
select throws_ok(
  $$select public.save_subscription_plan(null,'',null,149,'[]'::jsonb)$$,
  'P0001','INVALID_PLAN','empty plan name is rejected'
);
select throws_ok(
  $$select public.save_subscription_plan(
    null,'Externo',null,99,
    '[{"itemType":"service","serviceId":"d1000000-0000-0000-0000-000000000022","monthlyLimit":1}]'::jsonb
  )$$,
  'P0001','INVALID_PLAN_ITEM','cross-tenant benefit is rejected'
);
select throws_ok(
  $$select public.save_subscription_plan(
    null,'Duplicado',null,99,
    '[
      {"itemType":"service","serviceId":"d1000000-0000-0000-0000-000000000021","monthlyLimit":1},
      {"itemType":"service","serviceId":"d1000000-0000-0000-0000-000000000021","monthlyLimit":2}
    ]'::jsonb
  )$$,
  'P0001','INVALID_PLAN_ITEM','duplicate benefit is rejected'
);
select throws_ok(
  $$select public.save_subscription_plan(
    null,'Limite inválido',null,99,
    '[{"itemType":"add_on","addOnId":"d1000000-0000-0000-0000-000000000031","monthlyLimit":0}]'::jsonb
  )$$,
  'P0001','INVALID_PLAN_ITEM','zero benefit limit is rejected'
);
select lives_ok(
  $$select public.save_subscription_plan(
    'd1000000-0000-0000-0000-000000000052',
    'Essencial', null, 89,
    '[{"itemType":"service","serviceId":"d1000000-0000-0000-0000-000000000021","monthlyLimit":1}]'::jsonb
  )$$,
  'member creates a second plan for a future change'
);
select lives_ok(
  $$select public.create_client_subscription(
    'd1000000-0000-0000-0000-000000000041',
    'd1000000-0000-0000-0000-000000000051',
    date '2026-08-10', 'Primeira adesão'
  )$$,
  'member enrolls a tenant client'
);
select is(
  (select status from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'active',
  'new subscription starts active'
);
select is(
  (select next_billing_date from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  date '2026-08-10',
  'first billing date matches the chosen start date'
);
select throws_ok(
  $$select public.create_client_subscription(
    'd1000000-0000-0000-0000-000000000041',
    'd1000000-0000-0000-0000-000000000052',
    date '2026-08-10', null
  )$$,
  'P0001','SUBSCRIPTION_ALREADY_EXISTS','second open subscription is rejected'
);
select throws_ok(
  $$select public.create_client_subscription(
    'd1000000-0000-0000-0000-000000000042',
    'd1000000-0000-0000-0000-000000000051',
    date '2026-08-10', null
  )$$,
  'P0001','INVALID_CLIENT','cross-tenant client is rejected'
);
select lives_ok(
  $$select public.set_client_subscription_status(
    (select id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
    'paused'
  )$$,
  'active subscription can be paused'
);
select is(
  (select status from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'paused',
  'pause persists'
);
select throws_ok(
  $$select public.create_client_subscription(
    'd1000000-0000-0000-0000-000000000041',
    'd1000000-0000-0000-0000-000000000052',
    date '2026-08-10', null
  )$$,
  'P0001','SUBSCRIPTION_ALREADY_EXISTS','paused subscription still blocks a second open link'
);
select lives_ok(
  $$select public.set_client_subscription_status(
    (select id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
    'active'
  )$$,
  'paused subscription can be reactivated'
);
select lives_ok(
  $$select public.schedule_client_subscription_plan(
    (select id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
    'd1000000-0000-0000-0000-000000000052'
  )$$,
  'plan change can be scheduled'
);
select is(
  (select plan_id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'd1000000-0000-0000-0000-000000000051'::uuid,
  'scheduled change does not replace the current plan'
);
select is(
  (select pending_plan_id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'd1000000-0000-0000-0000-000000000052'::uuid,
  'scheduled plan is stored separately'
);
select lives_ok(
  $$select public.set_client_subscription_status(
    (select id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
    'cancelled'
  )$$,
  'active subscription can be cancelled'
);
select is(
  (select status from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'cancelled',
  'cancellation is terminal'
);
select ok(
  (select cancelled_at is not null from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
  'cancellation records its timestamp'
);
select throws_ok(
  $$select public.set_client_subscription_status(
    (select id from public.client_subscriptions where client_id='d1000000-0000-0000-0000-000000000041'),
    'active'
  )$$,
  'P0001','INVALID_STATUS_TRANSITION','cancelled subscription cannot be reopened'
);

reset role;

select ok(
  has_function_privilege(
    'authenticated',
    'public.save_subscription_plan(uuid,text,text,numeric,jsonb)',
    'EXECUTE'
  ),
  'authenticated members can execute plan RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.save_subscription_plan(uuid,text,text,numeric,jsonb)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute plan RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_client_subscription(uuid,uuid,date,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot create subscriptions'
);

select * from finish();
rollback;
