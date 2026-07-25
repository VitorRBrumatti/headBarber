begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(
  has_table_privilege('anon', 'public.barbershops', 'SELECT'),
  'public booking can resolve a barbershop'
);
select ok(
  not has_table_privilege('anon', 'public.barbershops', 'INSERT'),
  'public booking cannot create a barbershop'
);
select ok(
  has_table_privilege('authenticated', 'public.barbershops', 'INSERT'),
  'onboarding can create a barbershop'
);
select ok(
  has_table_privilege('authenticated', 'public.barbershops', 'UPDATE'),
  'members can update their barbershop'
);
select ok(
  has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'owner can associate their own profile during onboarding'
);
select ok(
  has_table_privilege('authenticated', 'public.subscriptions', 'SELECT'),
  'dashboard can check the current subscription'
);
select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.barbershops'::regclass
  ),
  'barbershops remains protected by RLS'
);
select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.profiles'::regclass
  ),
  'profiles remains protected by RLS'
);

select * from finish();
rollback;
