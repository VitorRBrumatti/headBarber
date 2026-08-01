begin;

create extension if not exists pgtap with schema extensions;
select plan(51);

select has_table('public', 'subscription_plans', 'subscription plans exist');
select has_table('public', 'subscription_plan_items', 'subscription plan items exist');
select has_table('public', 'client_subscriptions', 'client subscriptions exist');
select has_table('public', 'subscription_cycles', 'subscription cycles exist');
select has_table('public', 'subscription_cycle_entitlements', 'cycle entitlements exist');
select has_table('public', 'appointment_subscription_allocations', 'appointment allocations exist');

select has_column('public', 'barbershop_settings', 'client_subscriptions_admin_enabled', 'admin feature flag exists');
select has_column('public', 'barbershop_settings', 'client_subscriptions_booking_enabled', 'booking feature flag exists');
select has_column('public', 'barbershop_settings', 'client_subscriptions_settlement_enabled', 'settlement feature flag exists');
select col_default_is('public', 'barbershop_settings', 'client_subscriptions_admin_enabled', 'false', 'admin flag defaults off');
select col_default_is('public', 'barbershop_settings', 'client_subscriptions_booking_enabled', 'false', 'booking flag defaults off');
select col_default_is('public', 'barbershop_settings', 'client_subscriptions_settlement_enabled', 'false', 'settlement flag defaults off');

select has_column('public', 'appointments', 'subscription_coverage_status', 'appointment coverage status exists');
select has_column('public', 'appointments', 'subscription_covered_total', 'appointment covered total exists');
select has_column('public', 'appointments', 'amount_due', 'appointment amount due exists');
select has_column('public', 'appointments', 'commissionable_total', 'appointment commission base exists');
select has_column('public', 'appointments', 'commission_percentage_snapshot', 'commission percentage snapshot exists');
select has_column('public', 'appointments', 'commission_amount', 'commission amount exists');
select col_not_null('public', 'appointments', 'subscription_covered_total', 'covered total is required');
select col_not_null('public', 'appointments', 'amount_due', 'amount due is required');
select col_not_null('public', 'appointments', 'commissionable_total', 'commission base is required');
select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.appointments')
      and conname = 'appointments_subscription_amounts_check'
      and contype = 'c'
  ),
  'appointment amount invariant is constrained'
);

select has_column('public', 'revenues', 'source', 'revenue source exists');
select col_not_null('public', 'revenues', 'source', 'revenue source is required');
select has_index('public', 'revenues', 'revenues_automatic_origin_uq', 'automatic revenue origin is unique');
select has_column('public', 'product_sales', 'appointment_id', 'product sale links to appointment');
select has_column('public', 'product_sales', 'appointment_product_id', 'product sale links to reservation');
select has_index('public', 'product_sales', 'product_sales_appointment_product_uq', 'reservation is sold once');
select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.appointment_products')
      and pg_get_constraintdef(oid) ilike '%sold%'
  ),
  'appointment products accept sold status'
);

select has_index('public', 'client_subscriptions', 'client_subscriptions_one_open_per_client_uq', 'one open subscription per client is enforced');
select has_index('public', 'subscription_cycles', 'subscription_cycles_period_uq', 'cycle payment period is idempotent');
select has_index('public', 'subscription_plan_items', 'subscription_plan_items_plan_id_idx', 'plan item lookup is indexed');
select has_index('public', 'subscription_cycles', 'subscription_cycles_subscription_period_idx', 'cycle period lookup is indexed');
select has_index('public', 'subscription_cycle_entitlements', 'subscription_cycle_entitlements_cycle_id_idx', 'entitlement lookup is indexed');
select has_index('public', 'appointment_subscription_allocations', 'appointment_subscription_allocations_entitlement_status_idx', 'quota lookup is indexed');
select has_index('public', 'appointment_subscription_allocations', 'appointment_subscription_allocations_appointment_id_idx', 'appointment allocation lookup is indexed');

select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.subscription_plans')), 'subscription plans use RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.subscription_plan_items')), 'subscription plan items use RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.client_subscriptions')), 'client subscriptions use RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.subscription_cycles')), 'subscription cycles use RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.subscription_cycle_entitlements')), 'cycle entitlements use RLS');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.appointment_subscription_allocations')), 'appointment allocations use RLS');

select results_eq(
  $$select count(*) from information_schema.role_table_grants where table_schema='public' and table_name in (
    'subscription_plans','subscription_plan_items','client_subscriptions','subscription_cycles',
    'subscription_cycle_entitlements','appointment_subscription_allocations'
  ) and grantee='anon'$$,
  $$values (0::bigint)$$,
  'anonymous role has no direct subscription table grants'
);
select results_eq(
  $$select count(*) from information_schema.role_table_grants where table_schema='public' and table_name in (
    'subscription_plans','subscription_plan_items','client_subscriptions','subscription_cycles',
    'subscription_cycle_entitlements','appointment_subscription_allocations'
  ) and grantee='authenticated' and privilege_type <> 'SELECT'$$,
  $$values (0::bigint)$$,
  'authenticated role cannot mutate subscription tables directly'
);
select results_eq(
  $$select count(*) from information_schema.role_table_grants where table_schema='public' and table_name in (
    'subscription_plans','subscription_plan_items','client_subscriptions','subscription_cycles',
    'subscription_cycle_entitlements','appointment_subscription_allocations'
  ) and grantee='authenticated' and privilege_type = 'SELECT'$$,
  $$values (6::bigint)$$,
  'authenticated role receives explicit read grants'
);

select results_eq(
  $$select count(*) from pg_catalog.pg_policies where schemaname='public' and tablename in (
    'subscription_plans','subscription_plan_items','client_subscriptions','subscription_cycles',
    'subscription_cycle_entitlements','appointment_subscription_allocations'
  ) and policyname='subscription_required_for_authenticated_access'$$,
  $$values (6::bigint)$$,
  'all subscription tables require an active HeadBarber SaaS subscription'
);
select results_eq(
  $$select count(*) from pg_catalog.pg_policies where schemaname='public' and tablename in (
    'subscription_plans','subscription_plan_items','client_subscriptions','subscription_cycles',
    'subscription_cycle_entitlements','appointment_subscription_allocations'
  ) and policyname like '%members can view own barbershop%'$$,
  $$values (6::bigint)$$,
  'all subscription tables isolate reads by barbershop'
);

select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.subscription_plan_items')
      and conname = 'subscription_plan_items_target_check'
  ),
  'plan item service/add-on target is exclusive'
);
select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.subscription_cycle_entitlements')
      and conname = 'subscription_cycle_entitlements_target_check'
  ),
  'entitlement service/add-on target is exclusive'
);
select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.appointment_subscription_allocations')
      and conname = 'appointment_subscription_allocations_target_check'
  ),
  'allocation service/add-on target is exclusive'
);
select ok(
  exists(
    select 1 from pg_catalog.pg_constraint
    where conrelid = to_regclass('public.subscription_cycles')
      and conname = 'subscription_cycles_period_check'
  ),
  'cycle end must follow cycle start'
);

select * from finish();
rollback;
