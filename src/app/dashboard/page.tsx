import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { BookingLinkWidget } from './booking-link-widget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id, barbershops(name, slug)')
    .eq('id', user!.id)
    .single()

  const barbershopId = profile?.barbershop_id
  const barbershopSlug = (profile?.barbershops as { slug?: string } | null)?.slug ?? ''

  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  const [servicesRes, barbersRes, clientsRes, addOnsRes, productsRes, appointmentsTodayRes] = await Promise.all([
    supabase.from('services').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('barbers').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!),
    supabase.from('add_ons').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).gte('start_at', startOfDay).lte('start_at', endOfDay).neq('status', 'cancelled'),
  ])

  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select('id, start_at, status, total_price, clients ( name, phone ), services ( name ), barbers ( name, avatar_url )')
    .eq('barbershop_id', barbershopId!)
    .gte('start_at', startOfDay)
    .lte('start_at', endOfDay)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })
    .limit(8)

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)
  const dateLabel = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
  const inventory = [
    { label: 'Serviços ativos', count: servicesRes.count ?? 0, href: '/dashboard/servicos' },
    { label: 'Barbeiros ativos', count: barbersRes.count ?? 0, href: '/dashboard/barbeiros' },
    { label: 'Clientes', count: clientsRes.count ?? 0, href: '/dashboard/clientes' },
    { label: 'Adicionais ativos', count: addOnsRes.count ?? 0, href: '/dashboard/adicionais' },
    { label: 'Produtos ativos', count: productsRes.count ?? 0, href: '/dashboard/produtos' },
  ]

  const appointments = upcomingAppointments ?? []
  const statusLabel: Record<string, string> = {
    pending: 'Pendente', confirmed: 'Confirmado', completed: 'Concluído',
    cancelled: 'Cancelado', no_show: 'Não compareceu',
  }
  const appointmentDetails = (appointment: typeof appointments[number]) => {
    const clientName = (appointment.clients as { name?: string } | null)?.name ?? 'Cliente avulso'
    const serviceName = (appointment.services as { name?: string } | null)?.name ?? 'Serviço'
    const barberName = (appointment.barbers as { name?: string } | null)?.name
    return { clientName, detail: `${serviceName}${barberName ? ` · ${barberName}` : ''}`, time: appointment.start_at?.substring(11, 16) ?? '--:--', status: statusLabel[appointment.status] ?? appointment.status }
  }

  return (
    <div className="hb-overview mx-auto max-w-[1510px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <header className="flex flex-col justify-between gap-5 border-b border-[#dedad2] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold text-[#805820]">{dateLabel}</p>
          <h1 className="font-montserrat text-[26px] font-bold leading-tight tracking-[-0.03em] text-[#242321] sm:text-[32px]">O dia na barbearia</h1>
          <p className="mt-2 text-sm text-[#625f59]">Próximos atendimentos e o que precisa de atenção.</p>
        </div>
        <Link href="/dashboard/agenda" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#c99b4c] px-5 text-xs font-bold text-[#211a10] hover:bg-[#d6aa5b]">
          <span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>
          Nova reserva
        </Link>
      </header>

      <div className="mb-4 mt-7 flex items-baseline justify-between gap-4">
        <h2 id="daily-summary-title" className="font-montserrat text-lg font-bold tracking-[-0.02em] text-[#242321]">Atendimentos de hoje</h2>
        <span className="text-xs text-[#625f59]">{appointmentsTodayRes.count ?? 0} reservas no dia</span>
      </div>
      <section aria-labelledby="daily-summary-title" className="grid gap-6 lg:grid-cols-[minmax(0,1.72fr)_minmax(280px,.85fr)]">
        <div className="min-w-0 overflow-hidden rounded-[10px] border border-[#dedad2] bg-white">
          {appointments.length ? (
            <ol>
              {appointments.map((appointment, index) => {
                const item = appointmentDetails(appointment)
                return (
                  <li key={appointment.id} className={index === 0 ? 'bg-[#2b2926] text-white' : 'border-t border-[#e8e4de]'}>
                    <Link href="/dashboard/agenda" className={`grid min-h-[82px] grid-cols-[78px_minmax(0,1fr)] items-center gap-3 px-5 py-4 transition-colors hover:bg-[#f4f0e9] sm:grid-cols-[105px_minmax(0,1fr)_110px] sm:gap-5 sm:px-7 ${index === 0 ? 'min-h-[110px] hover:!bg-[#36332e]' : ''}`}>
                      <div><time className={`block tabular-nums font-bold ${index === 0 ? 'text-[27px] tracking-[-0.04em] text-[#e4bd78] sm:text-[30px]' : 'text-base text-[#242321]'}`}>{item.time}</time>{index === 0 && <span className="block text-[11px] text-[#d4cfc6]">primeiro da lista</span>}</div>
                      <div className="min-w-0"><strong className={`block truncate ${index === 0 ? 'font-montserrat text-lg' : 'text-sm'}`}>{item.clientName}</strong><span className={`mt-1 block truncate text-xs ${index === 0 ? 'text-[#d9d3c8]' : 'text-[#625f59]'}`}>{item.detail}</span></div>
                      <span className={`col-start-2 text-xs font-semibold sm:col-start-3 sm:text-right ${index === 0 ? 'text-[#f0c782]' : 'text-[#625f59]'}`}>{item.status}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="px-7 py-12"><h3 className="font-semibold">Nenhuma reserva para hoje</h3><p className="mt-2 text-sm text-[#625f59]">Use Nova reserva para preencher um horário ou compartilhe o link de agendamento.</p></div>
          )}
          <div className="flex min-h-14 items-center justify-between gap-3 border-t border-[#e8e4de] px-5 text-xs sm:px-7"><span className="text-[#625f59]">Horários e estados atualizados na agenda</span><Link href="/dashboard/agenda" className="shrink-0 font-bold text-[#795506] hover:underline">Abrir agenda →</Link></div>
        </div>

        <aside className="min-w-0 space-y-4">
          <BookingLinkWidget slug={barbershopSlug} />
          <section className="rounded-[10px] border border-[#dedad2] bg-white p-6">
            <h3 className="text-sm font-bold">Estrutura da barbearia</h3>
            <p className="mt-1 text-xs text-[#625f59]">Cadastros ativos para operar hoje.</p>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2">
              {inventory.map((item) => (
                <Link key={item.href} href={item.href} className="min-h-16 border-t border-[#e5e1da] pt-2 hover:text-[#795506]"><strong className="block text-2xl tabular-nums">{item.count}</strong><span className="text-xs text-[#625f59]">{item.label}</span></Link>
              ))}
            </div>
          </section>
          {((servicesRes.count ?? 0) === 0 || (barbersRes.count ?? 0) === 0) && (
            <div className="rounded-md border border-[#e2ded7] bg-white px-5 py-4">
              <h2 className="text-sm font-bold">Conclua a configuração</h2>
              <p className="mt-1 text-xs text-[#69655f]">Adicione serviços e profissionais para receber reservas.</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#72511f]">
                <Link href="/dashboard/servicos" className="hover:underline">Serviços →</Link>
                <Link href="/dashboard/barbeiros" className="hover:underline">Barbeiros →</Link>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}
