create table public.image_upload_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

create index image_upload_attempts_user_created_idx
on public.image_upload_attempts (user_id, created_at desc);

alter table public.image_upload_attempts enable row level security;

revoke all on public.image_upload_attempts from public, anon, authenticated;
grant all on public.image_upload_attempts to service_role;

create or replace function public.consume_image_upload_quota(
  p_barbershop_id uuid
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_attempt_count integer;
  v_oldest_attempt timestamptz;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'UNAUTHENTICATED';
  end if;

  v_tenant_id := public.get_user_barbershop_id(v_user_id);
  if v_tenant_id is null or v_tenant_id <> p_barbershop_id then
    raise exception using
      errcode = '42501',
      message = 'FORBIDDEN';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_user_id::text),
    pg_catalog.hashtext('image_upload')
  );

  delete from public.image_upload_attempts
  where user_id = v_user_id
    and created_at < v_now - interval '24 hours';

  select pg_catalog.count(*), pg_catalog.min(created_at)
  into v_attempt_count, v_oldest_attempt
  from public.image_upload_attempts
  where user_id = v_user_id
    and created_at >= v_now - interval '10 minutes';

  if v_attempt_count >= 10 then
    return query
    select
      false,
      greatest(
        1,
        pg_catalog.ceil(
          extract(
            epoch from (
              v_oldest_attempt + interval '10 minutes' - v_now
            )
          )
        )::integer
      );
    return;
  end if;

  insert into public.image_upload_attempts (user_id, barbershop_id)
  values (v_user_id, p_barbershop_id);

  return query select true, 0;
end;
$$;

revoke all on function public.consume_image_upload_quota(uuid)
from public, anon;

grant execute on function public.consume_image_upload_quota(uuid)
to authenticated;
