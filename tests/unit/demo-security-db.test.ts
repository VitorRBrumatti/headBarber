import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const demoUser = '10000000-0000-4000-8000-000000000001'
const realUser = '10000000-0000-4000-8000-000000000002'
const demoShop = '20000000-0000-4000-8000-000000000001'
const realShop = '20000000-0000-4000-8000-000000000002'
let db: PGlite
const asRole = async (role: string, sub = '') => {
  await db.exec(`set local role ${role}; select set_config('request.jwt.claims', '${JSON.stringify({ role, sub })}', true);`)
}

describe('demo security in PostgreSQL (actual demo migrations, isolated schema fixtures)', () => {
  beforeAll(async () => {
    db = new PGlite()
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create role supabase_auth_admin;
      create schema auth; create schema private;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
      $$;
      create table auth.users (id uuid primary key, email text, encrypted_password text,
        email_confirmed_at timestamptz, last_sign_in_at timestamptz, updated_at timestamptz,
        raw_user_meta_data jsonb, recovery_token text, phone text, last_sign_in_ip inet);
      create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid,
        provider text, identity_data jsonb, last_sign_in_at timestamptz, updated_at timestamptz);
      create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text);
      create table public.barbershops (id uuid primary key, name text, slug text);
      create table public.profiles (id uuid primary key, barbershop_id uuid, full_name text, role text);
      create table public.subscriptions (user_id uuid primary key, stripe_customer_id text, stripe_subscription_id text);
      create table public.image_upload_attempts (user_id uuid, barbershop_id uuid);
      create table public.clients (id uuid primary key default gen_random_uuid(), barbershop_id uuid, name text, phone text, email text, notes text);
      create table public.barber_services (id uuid primary key, barbershop_id uuid, barber_id uuid, service_id uuid,
        price numeric, duration_minutes integer, is_available boolean, created_at timestamptz default now());
      create table public.barber_work_hours (barbershop_id uuid, barber_id uuid, day_of_week integer,
        start_time time, end_time time, lunch_start_time time, lunch_end_time time, is_active boolean);
      create table public.barber_blocked_times (barbershop_id uuid, barber_id uuid, start_at timestamptz, end_at timestamptz);
      create table public.appointments (id uuid primary key default gen_random_uuid(), barbershop_id uuid,
        client_id uuid, barber_id uuid, service_id uuid, barber_service_id uuid, start_at timestamptz,
        end_at timestamptz, status text, total_price numeric, service_price numeric, service_duration_minutes integer, notes text);
      create table public.appointment_subscription_allocations (appointment_id uuid);
      create table public.appointment_products (barbershop_id uuid);
      create table public.appointment_add_ons (barbershop_id uuid);
      create table public.product_sales (barbershop_id uuid);
      create table public.revenues (barbershop_id uuid, category text, description text, amount numeric, date date, payment_method text);
      create table public.expenses (barbershop_id uuid, category text, description text, amount numeric, date date, is_recurring boolean);
      grant usage on schema public, private, auth to anon, authenticated, service_role, supabase_auth_admin;
      grant all on all tables in schema public to authenticated, service_role;
      grant all on all tables in schema auth to supabase_auth_admin;
    `)
    for (const migration of [
      'supabase/migrations/20260817211038_demo_mode.sql',
      'supabase/migrations/20260831170149_harden_demo_security.sql',
      'supabase/migrations/20260831231338_fix_demo_reset_timezone.sql',
      'supabase/migrations/20260901004300_fix_demo_auth_signin.sql',
    ]) {
      try {
        await db.exec(readFileSync(migration, 'utf8'))
      } catch (error) {
        throw new Error(`Failed to apply ${migration}`, { cause: error })
      }
    }
    await db.exec(`
      insert into auth.users(id,email,encrypted_password,email_confirmed_at) values
        ('${demoUser}','demo@example.com','demo-hash',now()), ('${realUser}','real@example.com','real-hash',now());
      insert into public.barbershops(id,name) values ('${demoShop}','Demo'), ('${realShop}','Real');
      insert into public.profiles(id,barbershop_id,role,demo_mode) values
        ('${demoUser}','${demoShop}','owner',true), ('${realUser}','${realShop}','owner',false);
      insert into auth.identities(user_id,provider) values ('${demoUser}','email');
      insert into public.demo_accounts(user_id,barbershop_id) values ('${demoUser}','${demoShop}');
      insert into public.clients(barbershop_id,name) values ('${realShop}','Real customer');
      insert into public.barber_services(id,barbershop_id,barber_id,service_id,price,duration_minutes,is_available)
        values (gen_random_uuid(),'${demoShop}',gen_random_uuid(),gen_random_uuid(),45,40,true);
      insert into public.barber_work_hours(barbershop_id,barber_id,day_of_week,start_time,end_time,lunch_start_time,lunch_end_time,is_active)
        select '${demoShop}', barber_id, days.day_of_week, '09:00', '19:00', '12:00', '13:00', days.day_of_week <> 0
        from public.barber_services cross join generate_series(0, 6) as days(day_of_week);
    `)
  }, 30000)
  beforeEach(async () => { await db.exec('begin') })
  afterEach(async () => { await db.exec('rollback') })
  afterAll(async () => { await db?.close() })

  it('does not let a normal user mark themselves demo', async () => {
    await asRole('authenticated', realUser)
    await expect(db.exec(`update public.profiles set demo_mode = true where id = '${realUser}'`)).rejects.toThrow('DEMO_FLAG_SERVER_ONLY')
  })
  it('keeps normal profile edits working', async () => {
    await asRole('authenticated', realUser)
    await db.exec(`update public.profiles set full_name = 'Updated' where id = '${realUser}'`)
  })
  it('forbids joining the disposable tenant', async () => {
    await asRole('authenticated', realUser)
    await expect(db.exec(`update public.profiles set barbershop_id = '${demoShop}' where id = '${realUser}'`)).rejects.toThrow('DEMO_TENANT_RESERVED')
  })
  it('protects registered identity even from a service-role reassignment', async () => {
    await asRole('service_role')
    await expect(db.exec(`update public.profiles set barbershop_id = '${realShop}' where id = '${demoUser}'`)).rejects.toThrow('DEMO_IDENTITY_LOCKED')
  })
  it.each(['anon', 'authenticated'])('keeps the registry private to %s', async (role) => {
    await asRole(role, realUser)
    await expect(db.exec('select * from public.demo_accounts')).rejects.toThrow('permission denied')
  })
  it.each(['anon', 'authenticated', 'service_role'])('hides the old reset from %s', async (role) => {
    await asRole(role, demoUser)
    await expect(db.exec(`select private.reset_demo_activity('${demoShop}')`)).rejects.toThrow('permission denied')
  })
  it('denies authenticated reset via the public API', async () => {
    await asRole('authenticated', demoUser)
    await expect(db.exec(`select public.reset_demo_activity('${demoShop}')`)).rejects.toThrow('permission denied')
  })
  it('refuses resetting even a demo-marked shop without registry authorization', async () => {
    await asRole('service_role')
    await db.exec(`update public.profiles set demo_mode = true where id = '${realUser}'`)
    await expect(db.exec(`select public.reset_demo_activity('${realShop}')`)).rejects.toThrow('NOT_A_REGISTERED_DEMO_TENANT')
  })
  it('resets only the registered shop and remains repeatable', async () => {
    await asRole('service_role')
    await db.exec(`select public.reset_demo_activity('${demoShop}'); select public.reset_demo_activity('${demoShop}');`)
    expect((await db.query<{ count: number }>('select count(*)::int as count from public.appointments')).rows[0].count).toBe(4)
    expect((await db.query<{ name: string }>(`select name from public.clients where barbershop_id = '${realShop}'`)).rows).toEqual([{ name: 'Real customer' }])
  })
  it('derives seed appointments from active work hours and skips lunch', async () => {
    await asRole('service_role')
    await db.exec(`select public.reset_demo_activity('${demoShop}')`)
    const slots = (await db.query<{ start: string; finish: string }>(`
      select start_at::time::text as start, end_at::time::text as finish
      from public.appointments order by start_at
    `)).rows
    expect(slots).toHaveLength(4)
    expect(slots.every(({ start, finish }) => finish <= '12:00:00' || start >= '13:00:00')).toBe(true)
    expect((await db.query<{ count: number }>(`
      select count(*)::int as count from public.appointments a
      join public.barber_work_hours wh on wh.barber_id = a.barber_id
        and wh.day_of_week = extract(dow from a.start_at)::integer and wh.is_active
      where a.start_at::time >= wh.start_time and a.end_at::time <= wh.end_time
    `)).rows[0].count).toBe(4)
  })
  it('does not update a real client on a seed UUID collision', async () => {
    await asRole('service_role')
    await db.exec(`insert into public.clients(id,barbershop_id) values ('d0000000-0000-4000-8000-000000000101','${realShop}')`)
    await expect(db.exec(`select public.reset_demo_activity('${demoShop}')`)).rejects.toThrow('DEMO_SEED_ID_COLLISION')
  })
  it('also checks ownership atomically inside the seed upsert and rolls back deletions', async () => {
    // Invoke the private implementation as an operator to model a collision
    // appearing AFTER the public wrapper preflight. No API role can do this.
    await db.exec(`select set_config('request.jwt.claims', '{"role":"service_role"}', true);
      insert into public.clients(id,barbershop_id,name) values ('d0000000-0000-4000-8000-000000000101','${realShop}','Keep me');
      insert into public.appointments(barbershop_id,notes) values ('${demoShop}','Existing booking');
      savepoint before_reset;`)
    await expect(db.exec(`select private.reset_demo_activity('${demoShop}')`)).rejects.toThrow('DEMO_SEED_ID_COLLISION')
    await db.exec('rollback to savepoint before_reset')
    expect((await db.query<{ name: string }>("select name from public.clients where id = 'd0000000-0000-4000-8000-000000000101'")).rows).toEqual([{ name: 'Keep me' }])
    expect((await db.query<{ notes: string }>(`select notes from public.appointments where barbershop_id = '${demoShop}'`)).rows).toEqual([{ notes: 'Existing booking' }])
  })
  it.each(["encrypted_password = 'hacked'", "email = 'attacker@example.com'", "phone = '+5511999999999'", "recovery_token = 'reset'", "raw_user_meta_data = '{\"admin\":true}'"])(
    'blocks Auth API identity changes: %s', async (change) => {
      await asRole('supabase_auth_admin')
      await expect(db.exec(`update auth.users set ${change} where id = '${demoUser}'`)).rejects.toThrow('DEMO_AUTH_LOCKED')
    },
  )
  it('allows sign-in timestamps and normal account password changes', async () => {
    await asRole('supabase_auth_admin')
    await db.exec(`update auth.users set last_sign_in_at = now(), updated_at = now(), last_sign_in_ip = '127.0.0.1' where id = '${demoUser}';
      update auth.identities set last_sign_in_at = now(), updated_at = now() where user_id = '${demoUser}';
      update auth.users set encrypted_password = 'new hash' where id = '${realUser}';`)
  })
  it('blocks enrolling MFA', async () => {
    await asRole('supabase_auth_admin')
    await expect(db.exec(`insert into auth.mfa_factors(user_id,status) values ('${demoUser}','unverified')`)).rejects.toThrow('DEMO_AUTH_LOCKED')
  })
  it('blocks Auth account deletion', async () => {
    await asRole('supabase_auth_admin')
    await expect(db.exec(`delete from auth.users where id = '${demoUser}'`)).rejects.toThrow('DEMO_AUTH_LOCKED')
  })
  it('blocks linking an identity', async () => {
    await asRole('supabase_auth_admin')
    await expect(db.exec(`insert into auth.identities(user_id,provider) values ('${demoUser}','github')`)).rejects.toThrow('DEMO_AUTH_LOCKED')
  })
  it('still blocks demo structural edits at database level', async () => {
    await asRole('authenticated', demoUser)
    await expect(db.exec(`update public.barbershops set name = 'Hacked' where id = '${demoShop}'`)).rejects.toThrow('DEMO_MODE_READ_ONLY')
  })
  it('blocks spending image-upload quota for demo sessions', async () => {
    await asRole('authenticated', demoUser)
    await expect(db.exec(`insert into public.image_upload_attempts values ('${demoUser}','${demoShop}')`)).rejects.toThrow('DEMO_MODE_READ_ONLY')
  })
  it('enables RLS on the registry and exposes no private reset to API roles', async () => {
    expect((await db.query<{ enabled: boolean }>("select relrowsecurity as enabled from pg_class where oid = 'public.demo_accounts'::regclass")).rows[0].enabled).toBe(true)
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query<{ allowed: boolean }>(`select has_function_privilege('${role}', 'private.reset_demo_activity(uuid)', 'execute') as allowed`)).rows[0].allowed).toBe(false)
    }
  })
})
