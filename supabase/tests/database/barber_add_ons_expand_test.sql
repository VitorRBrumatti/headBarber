begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'barber_add_ons', 'barber add-on relation exists');
select has_column('public', 'barber_add_ons', 'barbershop_id', 'tenant column exists');
select has_column('public', 'barber_add_ons', 'barber_id', 'barber column exists');
select has_column('public', 'barber_add_ons', 'add_on_id', 'add-on column exists');
select has_column('public', 'barber_add_ons', 'price', 'price column exists');
select has_column('public', 'barber_add_ons', 'duration_minutes', 'duration column exists');
select has_column('public', 'barber_add_ons', 'is_available', 'availability column exists');
select has_column('public', 'barber_add_ons', 'configuration_version', 'version column exists');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid='public.barber_add_ons'::regclass and conname='barber_add_ons_barber_add_on_key'), 'unique assignment');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid='public.barber_add_ons'::regclass and conname='barber_add_ons_barber_tenant_fkey'), 'barber tenant key');
select ok(exists(select 1 from pg_catalog.pg_constraint where conrelid='public.barber_add_ons'::regclass and conname='barber_add_ons_add_on_tenant_fkey'), 'add-on tenant key');
select ok((select relrowsecurity from pg_catalog.pg_class where oid='public.barber_add_ons'::regclass), 'RLS enabled');
select ok(has_table_privilege('anon','public.barber_add_ons','SELECT'), 'anon reads');
select ok(not has_table_privilege('anon','public.barber_add_ons','INSERT'), 'anon cannot write');
select has_column('public','appointment_add_ons','barber_add_on_id','snapshot relation exists');
select has_column('public','appointment_add_ons','duration_minutes','snapshot duration exists');
select col_not_null('public','appointment_add_ons','duration_minutes','snapshot duration required');
select function_returns('public','save_add_on_with_barbers',array['uuid','text','boolean','jsonb'],'uuid');

insert into public.barbershops(id,name,slug) values
('c0000000-0000-0000-0000-000000000001','Add-on A','addon-a'),
('c0000000-0000-0000-0000-000000000002','Add-on B','addon-b');
insert into auth.users(id,email) values
('c0000000-0000-0000-0000-000000000011','addon-a@test.local'),
('c0000000-0000-0000-0000-000000000012','addon-b@test.local');
insert into public.subscriptions(user_id,status) values
('c0000000-0000-0000-0000-000000000011','active'),
('c0000000-0000-0000-0000-000000000012','active');
update public.profiles set barbershop_id='c0000000-0000-0000-0000-000000000001',role='owner' where id='c0000000-0000-0000-0000-000000000011';
update public.profiles set barbershop_id='c0000000-0000-0000-0000-000000000002',role='owner' where id='c0000000-0000-0000-0000-000000000012';
insert into public.barbers(id,barbershop_id,name) values
('c0000000-0000-0000-0000-000000000021','c0000000-0000-0000-0000-000000000001','Ana'),
('c0000000-0000-0000-0000-000000000022','c0000000-0000-0000-0000-000000000001','Bia'),
('c0000000-0000-0000-0000-000000000023','c0000000-0000-0000-0000-000000000002','Caio');

set local role authenticated;
set local "request.jwt.claim.sub"='c0000000-0000-0000-0000-000000000011';
select throws_ok(
  $$select public.save_add_on_with_barbers(null,'Sem barbeiro',true,'[]')$$,
  'P0001','ADD_ON_REQUIRES_AVAILABLE_BARBER','create requires available barber'
);
select lives_ok(
  $$select public.save_add_on_with_barbers(null,'Finalização',true,
    '[{"barberId":"c0000000-0000-0000-0000-000000000021","price":12,"durationMinutes":5,"isAvailable":true},
      {"barberId":"c0000000-0000-0000-0000-000000000022","price":18,"durationMinutes":10,"isAvailable":true}]')$$,
  'member creates catalog and assignments atomically'
);
select throws_ok(
  $$select public.save_add_on_with_barbers(null,'Externo',true,
    '[{"barberId":"c0000000-0000-0000-0000-000000000023","price":1,"durationMinutes":0,"isAvailable":true}]')$$,
  'P0001','INVALID_ASSIGNMENTS','external barber is rejected'
);
reset role;

select is((select count(*) from public.barber_add_ons where add_on_id=(select id from public.add_ons where name='Finalização')),2::bigint,'both assignments stored');

select * from finish();
rollback;
