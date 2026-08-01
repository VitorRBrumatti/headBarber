begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table(
  'public',
  'image_upload_attempts',
  'image upload attempts table exists'
);
select ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'public.image_upload_attempts'::regclass
  ),
  'RLS is enabled'
);
select has_index(
  'public',
  'image_upload_attempts',
  'image_upload_attempts_user_created_idx',
  'quota lookup index exists'
);
select ok(
  not has_table_privilege('anon', 'public.image_upload_attempts', 'SELECT'),
  'anon cannot read attempts'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.image_upload_attempts',
    'SELECT'
  ),
  'authenticated cannot read attempts directly'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.image_upload_attempts',
    'INSERT'
  ),
  'authenticated cannot insert attempts directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.consume_image_upload_quota(uuid)',
    'EXECUTE'
  ),
  'anon cannot consume quota'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.consume_image_upload_quota(uuid)',
    'EXECUTE'
  ),
  'authenticated can consume quota'
);

insert into public.barbershops (id, name, slug)
values
  (
    'd0000000-0000-0000-0000-000000000001',
    'Upload quota A',
    'upload-quota-a'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'Upload quota B',
    'upload-quota-b'
  );

insert into auth.users (id, email)
values
  (
    'd0000000-0000-0000-0000-000000000011',
    'upload-quota-a@test.local'
  ),
  (
    'd0000000-0000-0000-0000-000000000012',
    'upload-quota-b@test.local'
  );

insert into public.subscriptions (user_id, status)
values
  ('d0000000-0000-0000-0000-000000000011', 'active'),
  ('d0000000-0000-0000-0000-000000000012', 'active');

update public.profiles
set
  barbershop_id = 'd0000000-0000-0000-0000-000000000001',
  role = 'owner'
where id = 'd0000000-0000-0000-0000-000000000011';

update public.profiles
set
  barbershop_id = 'd0000000-0000-0000-0000-000000000002',
  role = 'owner'
where id = 'd0000000-0000-0000-0000-000000000012';

set local role authenticated;
set local "request.jwt.claim.sub" =
  'd0000000-0000-0000-0000-000000000011';

select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 1 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 2 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 3 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 4 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 5 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 6 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 7 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 8 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 9 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'attempt 10 is allowed'
);
select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  false,
  'attempt 11 is blocked'
);
select ok(
  (
    select retry_after_seconds > 0
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  'blocked attempt has a retry delay'
);
select throws_ok(
  $$
    select *
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'FORBIDDEN',
  'user cannot consume quota for another barbershop'
);

reset role;
update public.image_upload_attempts
set created_at = created_at - interval '11 minutes'
where user_id = 'd0000000-0000-0000-0000-000000000011';

set local role authenticated;
set local "request.jwt.claim.sub" =
  'd0000000-0000-0000-0000-000000000011';

select is(
  (
    select allowed
    from public.consume_image_upload_quota(
      'd0000000-0000-0000-0000-000000000001'
    )
  ),
  true,
  'an expired window allows a new attempt'
);

reset role;
select * from finish();
rollback;
