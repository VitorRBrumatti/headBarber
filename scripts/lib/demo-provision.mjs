export const demoSeedIds = {
  services: [201, 202, 203],
  barbers: [301, 302],
  clients: [101, 102, 103, 104],
}
export const seedId = (suffix) => `d0000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`

export async function must(label, promise) {
  const result = await promise
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

export async function writeDemoRows(supabase, table, rows, keys = ['id']) {
  // A concurrent foreign insert after preflight must never become a cross-tenant
  // upsert. Ignore collisions first, then update only rows owned by this demo.
  await must(`Criar ${table}`, supabase.from(table)
    .upsert(rows, { onConflict: keys.join(','), ignoreDuplicates: true }))
  for (const row of rows) {
    let query = supabase.from(table).update(row).eq('barbershop_id', row.barbershop_id)
    for (const key of keys) query = query.eq(key, row[key])
    await must(`Validar proprietário de ${table}`, query.select('barbershop_id').single())
  }
}

export async function prepareDemoAccount(supabase, { email, password, slug }) {
  const registry = await must('Aplique a migração de segurança antes de provisionar',
    supabase.from('demo_accounts').select('user_id, barbershop_id').eq('singleton', true).maybeSingle())
  let shop = await must('Consultar barbearia',
    supabase.from('barbershops').select('id, slug').eq('slug', slug).maybeSingle())
  let user
  if (registry) {
    const account = await must('Consultar conta registrada', supabase.auth.admin.getUserById(registry.user_id))
    user = account.user
    if (!user || user.email?.toLowerCase() !== email.toLowerCase() || shop?.id !== registry.barbershop_id) {
      throw new Error('A configuração não corresponde à demo registrada. Nenhum dado foi alterado.')
    }
    const profile = await must('Consultar perfil',
      supabase.from('profiles').select('barbershop_id, demo_mode, role').eq('id', user.id).single())
    const members = await must('Consultar membros',
      supabase.from('profiles').select('id').eq('barbershop_id', shop.id))
    const billing = await must('Consultar assinatura', supabase.from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id').eq('user_id', user.id).maybeSingle())
    if (!profile.demo_mode || profile.role !== 'owner' || profile.barbershop_id !== shop.id
      || members.some((member) => member.id !== user.id)
      || billing?.stripe_customer_id || billing?.stripe_subscription_id
      || !user.email_confirmed_at || (user.factors?.length ?? 0) > 0) {
      throw new Error('A demo contém vínculos incompatíveis. Nenhum dado foi alterado.')
    }
  } else {
    // Do not adopt an account by email (including beyond the first 1000 users).
    for (let page = 1; ; page++) {
      const data = await must('Consultar usuários', supabase.auth.admin.listUsers({ page, perPage: 1000 }))
      if (data.users.some((candidate) => candidate.email?.toLowerCase() === email.toLowerCase())) {
        throw new Error('Conta existente não registrada como demo. Faça a revisão manual descrita em docs/DEMO_MODE.md.')
      }
      if (data.users.length < 1000) break
    }
    if (shop) throw new Error('O slug já pertence a uma barbearia não registrada. Nenhum dado foi alterado.')
  }

  // All preflight reads precede every write, even catalog upserts.
  for (const [table, suffixes] of Object.entries(demoSeedIds)) {
    const rows = await must('Validar IDs de demonstração', supabase.from(table)
      .select('id, barbershop_id').in('id', suffixes.map(seedId)))
    if (rows.some((row) => !registry || row.barbershop_id !== registry.barbershop_id)) {
      throw new Error(`Colisão de IDs em ${table}. Nenhum dado foi alterado.`)
    }
  }
  if (!registry) {
    const created = await must('Criar conta demo', supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: 'Visitante Demo' },
    }))
    user = created.user
    if (!user) throw new Error('Conta demo não foi criada')
    shop = await must('Criar barbearia demo', supabase.from('barbershops')
      .insert({ name: 'Barbearia Aurora — Demo', slug }).select('id, slug').single())
    await must('Configurar perfil demo', supabase.from('profiles').update({
      barbershop_id: shop.id, full_name: 'Visitante Demo', role: 'owner', demo_mode: true,
    }).eq('id', user.id).select('id').single())
    await must('Registrar conta descartável', supabase.from('demo_accounts')
      .insert({ user_id: user.id, barbershop_id: shop.id }))
  }
  // Deliberately do not rotate an existing account's password on a rerun.
  return { user, shop }
}
