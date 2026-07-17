-- Product reservations linked to public appointments.
-- Products stay financially pending until pickup at the barbershop.

create table public.appointment_products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'released')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (appointment_id, product_id)
);

create index appointment_products_barbershop_id_idx
  on public.appointment_products(barbershop_id);
create index appointment_products_appointment_id_idx
  on public.appointment_products(appointment_id);
create index appointment_products_product_id_idx
  on public.appointment_products(product_id);

alter table public.appointment_products enable row level security;

create policy "Appointment products: members can view own barbershop"
on public.appointment_products for select to authenticated
using (
  barbershop_id = (
    select barbershop_id
    from public.profiles
    where id = (select auth.uid())
  )
);

grant select on public.appointment_products to authenticated;
grant all on public.appointment_products to service_role;
revoke all on public.appointment_products from anon;

drop policy if exists "Products: public can view active" on public.products;
create policy "Products: public can view active"
on public.products for select to anon
using (is_active = true);
grant select on public.products to anon;

create or replace function public.create_public_appointment_with_products(
  p_barbershop_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_barber_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_notes text,
  p_add_on_ids uuid[],
  p_products jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment_id uuid;
  v_products jsonb := coalesce(p_products, '[]'::jsonb);
  v_unavailable jsonb;
begin
  if jsonb_typeof(v_products) <> 'array' then
    raise exception using
      message = 'INVALID_PRODUCTS',
      detail = 'A seleção de produtos deve ser uma lista.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_products)
      as item("productId" uuid, quantity integer)
    where item."productId" is null
       or item.quantity is null
       or item.quantity <= 0
  ) then
    raise exception using
      message = 'INVALID_PRODUCTS',
      detail = 'Produto ou quantidade inválida.';
  end if;

  if exists (
    select item."productId"
    from jsonb_to_recordset(v_products)
      as item("productId" uuid, quantity integer)
    group by item."productId"
    having count(*) > 1
  ) then
    raise exception using
      message = 'INVALID_PRODUCTS',
      detail = 'Produtos duplicados não são permitidos.';
  end if;

  -- Consistent order prevents deadlocks when two bookings reserve the same set.
  perform product.id
  from public.products as product
  join jsonb_to_recordset(v_products)
    as item("productId" uuid, quantity integer)
    on item."productId" = product.id
  order by product.id
  for update;

  select jsonb_agg(
    jsonb_build_object(
      'productId', item."productId",
      'availableQuantity', coalesce(product.stock_quantity, 0)
    )
  )
  into v_unavailable
  from jsonb_to_recordset(v_products)
    as item("productId" uuid, quantity integer)
  left join public.products as product
    on product.id = item."productId"
   and product.barbershop_id = p_barbershop_id
   and product.is_active = true
  where product.id is null
     or product.stock_quantity < item.quantity;

  if v_unavailable is not null then
    raise exception using
      message = 'INSUFFICIENT_STOCK',
      detail = v_unavailable::text;
  end if;

  v_appointment_id := public.create_public_appointment_with_client(
    p_barbershop_id,
    p_client_name,
    p_client_phone,
    p_client_email,
    p_barber_id,
    p_service_id,
    p_start_at,
    p_notes,
    p_add_on_ids
  );

  insert into public.appointment_products (
    barbershop_id,
    appointment_id,
    product_id,
    quantity,
    unit_price
  )
  select
    p_barbershop_id,
    v_appointment_id,
    product.id,
    item.quantity,
    product.sale_price
  from jsonb_to_recordset(v_products)
    as item("productId" uuid, quantity integer)
  join public.products as product on product.id = item."productId";

  update public.products as product
  set stock_quantity = product.stock_quantity - item.quantity,
      updated_at = timezone('utc', now())
  from jsonb_to_recordset(v_products)
    as item("productId" uuid, quantity integer)
  where product.id = item."productId";

  return v_appointment_id;
end;
$$;

revoke execute on function public.create_public_appointment_with_client(
  uuid, text, text, text, uuid, uuid, timestamptz, text, uuid[]
) from public;

revoke execute on function public.create_public_appointment_with_products(
  uuid, text, text, text, uuid, uuid, timestamptz, text, uuid[], jsonb
) from public;
grant execute on function public.create_public_appointment_with_products(
  uuid, text, text, text, uuid, uuid, timestamptz, text, uuid[], jsonb
) to anon, authenticated;

create schema if not exists private;

create or replace function private.release_cancelled_appointment_products()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.products as product
    set stock_quantity = product.stock_quantity + released.quantity,
        updated_at = timezone('utc', now())
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.appointment_products
      where appointment_id = new.id and status = 'reserved'
      group by product_id
    ) as released
    where product.id = released.product_id;

    update public.appointment_products
    set status = 'released',
        updated_at = timezone('utc', now())
    where appointment_id = new.id and status = 'reserved';
  end if;

  return new;
end;
$$;

drop trigger if exists release_products_on_appointment_cancel
  on public.appointments;
create trigger release_products_on_appointment_cancel
after update of status on public.appointments
for each row
execute function private.release_cancelled_appointment_products();

revoke execute on function private.release_cancelled_appointment_products()
  from public, anon, authenticated;
