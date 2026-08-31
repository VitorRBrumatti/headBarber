import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.DEMO_ACCOUNT_EMAIL
const password = process.env.DEMO_ACCOUNT_PASSWORD
const slug = process.env.DEMO_BOOKING_SLUG || 'headbarber-demo'

if (!url || !serviceRoleKey || !email || !password) {
  throw new Error(
    'Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_ACCOUNT_EMAIL e DEMO_ACCOUNT_PASSWORD.',
  )
}

if (password.length < 10) {
  throw new Error('DEMO_ACCOUNT_PASSWORD deve ter pelo menos 10 caracteres.')
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function must(label, promise) {
  const result = await promise
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

const users = await must(
  'Não foi possível consultar usuários',
  supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
)
let user = users.users.find((candidate) => candidate.email === email)

if (!user) {
  const created = await must(
    'Não foi possível criar a conta demo',
    supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Visitante Demo' },
    }),
  )
  user = created.user
} else {
  const updated = await must(
    'Não foi possível atualizar a conta demo',
    supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    }),
  )
  user = updated.user
}

if (!user) throw new Error('A conta demo não foi encontrada após o provisionamento.')

let shop = await must(
  'Não foi possível consultar a barbearia demo',
  supabase.from('barbershops').select('id, slug').eq('slug', slug).maybeSingle(),
)

if (!shop) {
  shop = await must(
    'Não foi possível criar a barbearia demo',
    supabase
      .from('barbershops')
      .insert({ name: 'Barbearia Aurora — Demo', slug })
      .select('id, slug')
      .single(),
  )
}

await must(
  'Não foi possível marcar o perfil como demo',
  supabase
    .from('profiles')
    .update({
      barbershop_id: shop.id,
      full_name: 'Visitante Demo',
      role: 'owner',
      demo_mode: true,
    })
    .eq('id', user.id),
)

await must(
  'Não foi possível liberar o acesso da conta demo',
  supabase.from('subscriptions').upsert(
    {
      user_id: user.id,
      status: 'active',
      plan_interval: 'month',
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'user_id' },
  ),
)

await must(
  'Não foi possível configurar a barbearia demo',
  supabase.from('barbershop_settings').upsert(
    {
      barbershop_id: shop.id,
      slot_interval_minutes: 30,
      default_start_time: '09:00:00',
      default_end_time: '19:00:00',
      default_lunch_start: '12:00:00',
      default_lunch_end: '13:00:00',
      client_subscriptions_booking_enabled: false,
      client_subscriptions_settlement_enabled: false,
    },
    { onConflict: 'barbershop_id' },
  ),
)

const services = [
  {
    id: 'd0000000-0000-4000-8000-000000000201',
    barbershop_id: shop.id,
    name: 'Corte tradicional',
    description: 'Corte clássico com acabamento.',
    price: 45,
    duration_minutes: 40,
    is_active: true,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000202',
    barbershop_id: shop.id,
    name: 'Barba',
    description: 'Modelagem e acabamento com toalha quente.',
    price: 35,
    duration_minutes: 30,
    is_active: true,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000203',
    barbershop_id: shop.id,
    name: 'Corte + barba',
    description: 'Experiência completa de corte e barba.',
    price: 70,
    duration_minutes: 60,
    is_active: true,
  },
]

const barbers = [
  {
    id: 'd0000000-0000-4000-8000-000000000301',
    barbershop_id: shop.id,
    name: 'Lucas Rocha',
    bio: 'Especialista em cortes clássicos e degradê.',
    commission_percentage: 40,
    is_active: true,
  },
  {
    id: 'd0000000-0000-4000-8000-000000000302',
    barbershop_id: shop.id,
    name: 'Marcos Silva',
    bio: 'Barbeiro com foco em visagismo e barba.',
    commission_percentage: 40,
    is_active: true,
  },
]

await must(
  'Não foi possível criar os serviços demo',
  supabase.from('services').upsert(services, { onConflict: 'id' }),
)
await must(
  'Não foi possível criar os barbeiros demo',
  supabase.from('barbers').upsert(barbers, { onConflict: 'id' }),
)

const assignments = barbers.flatMap((barber) =>
  services.map((service) => ({
    barbershop_id: shop.id,
    barber_id: barber.id,
    service_id: service.id,
    price: service.price,
    duration_minutes: service.duration_minutes,
    is_available: true,
  })),
)

await must(
  'Não foi possível relacionar profissionais e serviços',
  supabase
    .from('barber_services')
    .upsert(assignments, { onConflict: 'barber_id,service_id' }),
)

for (const barber of barbers) {
  const existingHours = await must(
    'Não foi possível consultar os expedientes demo',
    supabase
      .from('barber_work_hours')
      .select('id')
      .eq('barbershop_id', shop.id)
      .eq('barber_id', barber.id)
      .limit(1),
  )
  if ((existingHours ?? []).length === 0) {
    const shifts = Array.from({ length: 7 }, (_, day) => ({
      barbershop_id: shop.id,
      barber_id: barber.id,
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '19:00:00',
      lunch_start_time: '12:00:00',
      lunch_end_time: '13:00:00',
      is_active: day !== 0,
    }))
    await must(
      'Não foi possível criar os expedientes demo',
      supabase.from('barber_work_hours').insert(shifts),
    )
  }
}

await must(
  'Não foi possível restaurar os dados demo',
  supabase.rpc('reset_demo_activity', { p_barbershop_id: shop.id }),
)

console.log(`Demo pronta: /demo (agendamento público em /booking/${slug})`)
