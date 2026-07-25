begin;

create extension if not exists pgtap with schema extensions;
select plan(51);

select has_schema('private', 'private schema exists');
select has_table('public', 'barber_services', 'barber services relation exists');
select has_table('private', 'legacy_booking_rpc_calls', 'legacy RPC telemetry exists');

select has_column('public', 'barber_services', 'id', 'public.barber_services.id exists');
select has_column('public', 'barber_services', 'barbershop_id', 'public.barber_services.barbershop_id exists');
select has_column('public', 'barber_services', 'barber_id', 'public.barber_services.barber_id exists');
select has_column('public', 'barber_services', 'service_id', 'public.barber_services.service_id exists');
select has_column('public', 'barber_services', 'price', 'public.barber_services.price exists');
select has_column('public', 'barber_services', 'duration_minutes', 'public.barber_services.duration_minutes exists');
select has_column('public', 'barber_services', 'is_available', 'public.barber_services.is_available exists');
select has_column('public', 'barber_services', 'configuration_version', 'public.barber_services.configuration_version exists');
select has_column('public', 'barber_services', 'created_at', 'public.barber_services.created_at exists');
select has_column('public', 'barber_services', 'updated_at', 'public.barber_services.updated_at exists');

select col_not_null('public', 'barber_services', 'price', 'public.barber_services.price is required');
select col_not_null('public', 'barber_services', 'duration_minutes', 'public.barber_services.duration_minutes is required');
select col_not_null('public', 'barber_services', 'is_available', 'public.barber_services.is_available is required');
select col_not_null('public', 'barber_services', 'configuration_version', 'public.barber_services.configuration_version is required');

select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_price_check' and contype = 'c'), 'price check exists');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_duration_minutes_check' and contype = 'c'), 'duration check exists');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_barber_service_key' and contype = 'u'), 'barber and service are unique');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_identity_key' and contype = 'u'), 'composite appointment identity is unique');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_barber_tenant_fkey' and contype = 'f'), 'barber tenant foreign key exists');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = to_regclass('public.barber_services') and conname = 'barber_services_service_tenant_fkey' and contype = 'f'), 'service tenant foreign key exists');

select has_index('public', 'barber_services', 'barber_services_barber_available_idx', 'public.barber_services.barber_services_barber_available_idx exists');
select has_index('public', 'barber_services', 'barber_services_service_id_idx', 'public.barber_services.barber_services_service_id_idx exists');
select has_index('public', 'barber_services', 'barber_services_barbershop_id_idx', 'public.barber_services.barber_services_barbershop_id_idx exists');

select ok((select relrowsecurity from pg_catalog.pg_class where oid = to_regclass('public.barber_services')), 'barber_services has RLS enabled');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'barber_services' and grantee = 'anon' and privilege_type = 'SELECT'$$, $$values (1::bigint)$$, 'anon can select barber services');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'barber_services' and grantee = 'anon' and privilege_type <> 'SELECT'$$, $$values (0::bigint)$$, 'anon cannot mutate barber services');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'barber_services' and grantee = 'authenticated' and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')$$, $$values (4::bigint)$$, 'authenticated receives explicit CRUD grants');

select ok(exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'barber_services' and policyname = 'Barber services: public can view available'), 'anon policy exists');
select ok(exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'barber_services' and policyname = 'Barber services: members can view own barbershop'), 'member select policy exists');
select ok(exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'barber_services' and policyname = 'Barber services: members can insert'), 'member insert policy exists');
select ok(exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'barber_services' and policyname = 'Barber services: members can update'), 'member update policy exists');
select ok(exists(select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'barber_services' and policyname = 'Barber services: members can delete'), 'member delete policy exists');

select has_column('public', 'appointments', 'barber_service_id', 'public.appointments.barber_service_id exists');
select col_is_null('public', 'appointments', 'barber_service_id', 'public.appointments.barber_service_id stays nullable');
select has_column('public', 'appointments', 'service_price', 'public.appointments.service_price exists');
select col_is_null('public', 'appointments', 'service_price', 'public.appointments.service_price stays nullable');
select has_column('public', 'appointments', 'service_duration_minutes', 'public.appointments.service_duration_minutes exists');
select col_is_null('public', 'appointments', 'service_duration_minutes', 'public.appointments.service_duration_minutes stays nullable');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = 'public.appointments'::regclass and conname = 'appointments_barber_service_identity_fkey' and contype = 'f'), 'appointment composite identity foreign key exists');
select results_eq(
  $$select array_agg(attribute.attname order by key.ordinality)
    from pg_catalog.pg_constraint constraint_row
    cross join unnest(constraint_row.conkey) with ordinality as key(attnum, ordinality)
    join pg_catalog.pg_attribute attribute on attribute.attrelid = constraint_row.conrelid and attribute.attnum = key.attnum
    where constraint_row.conrelid = 'public.appointments'::regclass and constraint_row.conname = 'appointments_barber_service_identity_fkey'$$,
  $$values (array['barber_service_id', 'barbershop_id', 'barber_id', 'service_id']::name[])$$,
  'appointment foreign key covers the complete relationship identity'
);
select has_index('public', 'appointments', 'appointments_barber_service_id_idx', 'public.appointments.appointments_barber_service_id_idx exists');

select has_column('private', 'legacy_booking_rpc_calls', 'function_name', 'private.legacy_booking_rpc_calls.function_name exists');
select has_column('private', 'legacy_booking_rpc_calls', 'called_at', 'private.legacy_booking_rpc_calls.called_at exists');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'private' and table_name = 'legacy_booking_rpc_calls' and grantee = 'anon'$$, $$values (0::bigint)$$, 'anon has no telemetry privileges');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'private' and table_name = 'legacy_booking_rpc_calls' and grantee = 'authenticated'$$, $$values (0::bigint)$$, 'authenticated has no telemetry privileges');
select results_eq($$select count(*) from information_schema.role_table_grants where table_schema = 'private' and table_name = 'legacy_booking_rpc_calls' and grantee = 'PUBLIC'$$, $$values (0::bigint)$$, 'PUBLIC has no telemetry privileges');

select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = 'public.barbers'::regclass and conname = 'barbers_id_barbershop_id_key' and contype = 'u'), 'barbers expose a same-tenant unique key');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid = 'public.services'::regclass and conname = 'services_id_barbershop_id_key' and contype = 'u'), 'services expose a same-tenant unique key');

select * from finish();
rollback;
