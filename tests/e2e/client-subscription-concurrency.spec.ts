import { execFile, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'

const execFileAsync = promisify(execFile)
const config = readFileSync(resolve('supabase/config.toml'), 'utf8')
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]

if (!projectId) throw new Error('Supabase project_id is missing')

const databaseContainer = `supabase_db_${projectId}`

function sqlArguments(sql: string) {
  return [
    'exec',
    databaseContainer,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-Atc',
    sql,
  ]
}

function executeSql(sql: string) {
  return execFileSync('docker', sqlArguments(sql), { encoding: 'utf8' }).trim()
}

async function executeSqlConcurrently(sql: string) {
  const { stdout } = await execFileAsync('docker', sqlArguments(sql), {
    encoding: 'utf8',
  })
  return stdout.trim()
}

test('pagamento e promoção concorrentes preservam idempotência e cota', async () => {
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 12)
  const id = (tail: string) => `e2e${suffix.slice(0, 5)}-0000-4000-8000-${tail}`
  const barbershopId = id('000000000001')
  const ownerId = id('000000000002')
  const barberId = id('000000000003')
  const serviceId = id('000000000004')
  const barberServiceId = id('000000000005')
  const clientId = id('000000000006')
  const planId = id('000000000007')
  const planItemId = id('000000000008')
  const subscriptionId = id('000000000009')
  const appointmentIds = [
    id('000000000011'),
    id('000000000012'),
    id('000000000013'),
    id('000000000014'),
  ]

  executeSql(`
    insert into public.barbershops(id,name,slug)
    values('${barbershopId}','Concurrency ${suffix}','concurrency-${suffix}');
    insert into auth.users(id,email)
    values('${ownerId}','concurrency-${suffix}@test.local');
    insert into public.subscriptions(user_id,status)
    values('${ownerId}','active');
    update public.profiles
    set barbershop_id='${barbershopId}',role='owner'
    where id='${ownerId}';
    insert into public.barbers(id,barbershop_id,name,commission_percentage)
    values('${barberId}','${barbershopId}','Barber',40);
    insert into public.services(id,barbershop_id,name,price,duration_minutes)
    values('${serviceId}','${barbershopId}','Corte',50,30);
    insert into public.barber_services(
      id,barbershop_id,barber_id,service_id,price,duration_minutes
    ) values(
      '${barberServiceId}','${barbershopId}','${barberId}','${serviceId}',50,30
    );
    insert into public.barber_work_hours(
      barbershop_id,barber_id,day_of_week,start_time,end_time,
      lunch_start_time,lunch_end_time
    )
    select '${barbershopId}','${barberId}',day_of_week,
      '08:00','20:00','12:00','13:00'
    from generate_series(0,6) as day_of_week;
    insert into public.clients(id,barbershop_id,name,phone)
    values('${clientId}','${barbershopId}','Cliente','11999999999');
    insert into public.subscription_plans(id,barbershop_id,name,monthly_price)
    values('${planId}','${barbershopId}','Premium',100);
    insert into public.subscription_plan_items(
      id,barbershop_id,plan_id,item_type,service_id,monthly_limit
    ) values(
      '${planItemId}','${barbershopId}','${planId}','service','${serviceId}',2
    );
    insert into public.client_subscriptions(
      id,barbershop_id,client_id,plan_id,status,started_on,next_billing_date
    ) values(
      '${subscriptionId}','${barbershopId}','${clientId}','${planId}',
      'active','2031-08-01','2031-08-01'
    );
    insert into public.appointments(
      id,barbershop_id,client_id,barber_id,service_id,barber_service_id,
      start_at,end_at,status,service_price,service_duration_minutes,total_price,
      subscription_coverage_status
    ) values
      ('${appointmentIds[0]}','${barbershopId}','${clientId}','${barberId}',
       '${serviceId}','${barberServiceId}','2031-08-05 10:00+00','2031-08-05 10:30+00',
       'confirmed',50,30,50,'awaiting_cycle'),
      ('${appointmentIds[1]}','${barbershopId}','${clientId}','${barberId}',
       '${serviceId}','${barberServiceId}','2031-08-12 10:00+00','2031-08-12 10:30+00',
       'confirmed',50,30,50,'awaiting_cycle'),
      ('${appointmentIds[2]}','${barbershopId}','${clientId}','${barberId}',
       '${serviceId}','${barberServiceId}','2031-08-20 10:00+00','2031-08-20 10:30+00',
       'confirmed',50,30,50,'awaiting_cycle'),
      ('${appointmentIds[3]}','${barbershopId}','${clientId}','${barberId}',
       '${serviceId}','${barberServiceId}','2031-08-25 10:00+00','2031-08-25 10:30+00',
       'confirmed',50,30,50,'awaiting_cycle');
  `)

  try {
    const paymentSql = `
      begin;
      set local role authenticated;
      set local "request.jwt.claim.sub"='${ownerId}';
      select public.register_client_subscription_payment(
        '${subscriptionId}','2031-08-01','pix'
      );
      commit;
    `

    await Promise.all([
      executeSqlConcurrently(paymentSql),
      executeSqlConcurrently(paymentSql),
    ])

    const paymentCounts = executeSql(`
      select
        (select count(*) from public.subscription_cycles
          where client_subscription_id='${subscriptionId}') || ',' ||
        (select count(*) from public.revenues
          where barbershop_id='${barbershopId}' and source='subscription_cycle') || ',' ||
        (select count(*) from public.appointment_subscription_allocations allocation
          join public.subscription_cycle_entitlements entitlement
            on entitlement.id=allocation.cycle_entitlement_id
          join public.subscription_cycles cycle on cycle.id=entitlement.cycle_id
          where cycle.client_subscription_id='${subscriptionId}'
            and allocation.status='reserved') || ',' ||
        (select count(*) from public.appointment_subscription_allocations allocation
          join public.subscription_cycle_entitlements entitlement
            on entitlement.id=allocation.cycle_entitlement_id
          join public.subscription_cycles cycle on cycle.id=entitlement.cycle_id
          where cycle.client_subscription_id='${subscriptionId}'
            and allocation.status='waiting');
    `)
    expect(paymentCounts).toBe('1,1,2,2')

    executeSql(`
      update public.appointment_subscription_allocations allocation
      set status='released',reserved_at=null,released_at=timezone('utc',now())
      from public.subscription_cycle_entitlements entitlement
      join public.subscription_cycles cycle on cycle.id=entitlement.cycle_id
      where allocation.cycle_entitlement_id=entitlement.id
        and cycle.client_subscription_id='${subscriptionId}'
        and allocation.status='reserved';
    `)

    const entitlementId = executeSql(`
      select entitlement.id
      from public.subscription_cycle_entitlements entitlement
      join public.subscription_cycles cycle on cycle.id=entitlement.cycle_id
      where cycle.client_subscription_id='${subscriptionId}';
    `)
    const promotionSql = `
      select private.promote_waiting_subscription_allocation('${entitlementId}');
    `

    const promoted = await Promise.all([
      executeSqlConcurrently(promotionSql),
      executeSqlConcurrently(promotionSql),
    ])
    expect(new Set(promoted).size).toBe(2)

    const allocationCounts = executeSql(`
      select
        count(*) filter (where allocation.status='reserved') || ',' ||
        count(*) filter (where allocation.status='waiting') || ',' ||
        count(*) filter (where allocation.status='released')
      from public.appointment_subscription_allocations allocation
      join public.subscription_cycle_entitlements entitlement
        on entitlement.id=allocation.cycle_entitlement_id
      join public.subscription_cycles cycle on cycle.id=entitlement.cycle_id
      where cycle.client_subscription_id='${subscriptionId}';
    `)
    expect(allocationCounts).toBe('2,0,2')
  } finally {
    executeSql(`
      delete from public.barbershops where id='${barbershopId}';
      delete from auth.users where id='${ownerId}';
    `)
  }
})
