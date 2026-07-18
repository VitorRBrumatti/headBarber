import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { BookingLinkWidget } from './booking-link-widget'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch barbershop profile and details
  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id, barbershops(name, slug)')
    .eq('id', user!.id)
    .single()

  const barbershopId = profile?.barbershop_id
  // @ts-ignore
  const shopName = profile?.barbershops?.name ?? 'Sua Barbearia'
  // @ts-ignore
  const barbershopSlug = profile?.barbershops?.slug ?? ''

  // Compute UTC boundaries for today
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  // Fetch parallel database counts, including today's appointments
  const [
    servicesRes,
    barbersRes,
    clientsRes,
    addOnsRes,
    productsRes,
    appointmentsTodayRes
  ] = await Promise.all([
    supabase.from('services').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('barbers').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!),
    supabase.from('add_ons').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).gte('start_at', startOfDay).lte('start_at', endOfDay).neq('status', 'cancelled'),
  ])

  const servicesCount = servicesRes.count ?? 0
  const barbersCount = barbersRes.count ?? 0
  const clientsCount = clientsRes.count ?? 0
  const addOnsCount = addOnsRes.count ?? 0
  const productsCount = productsRes.count ?? 0
  const appointmentsTodayCount = appointmentsTodayRes.count ?? 0

  // Fetch upcoming scheduled appointments for today
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select(`
      id,
      start_at,
      status,
      total_price,
      clients ( name, phone ),
      services ( name ),
      barbers ( name, avatar_url )
    `)
    .eq('barbershop_id', barbershopId!)
    .gte('start_at', startOfDay)
    .lte('start_at', endOfDay)
    .neq('status', 'cancelled')
    .order('start_at', { ascending: true })
    .limit(3)

  // Get user profile initials fallback
  const getInitials = (name: string) => {
    if (!name) return 'C'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  // Border colors for upcoming schedule list items
  const borderColors = [
    'border-[#C79A4A]',   // Gold
    'border-[#ffdeaa]',   // Secondary Fixed
    'border-[#c8c5cb]',   // Outline Variant
  ]

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Welcome Header */}
      <section className="flex flex-col gap-1">
        <h1 className="font-montserrat text-2xl md:text-3xl font-extrabold text-[#181c21]">
          Bem-vindo, {shopName}
        </h1>
        <p className="text-sm text-[#47464b] font-medium">
          Aqui está o resumo da sua operação hoje.
        </p>
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Metrics & Recommended Actions */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* Metrics Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Serviços Ativos */}
            <Link href="/dashboard/servicos" className="group">
              <div className="bg-white p-6 rounded-xl border border-[#eceef4]/50 shadow-xs metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#47464b] group-hover:text-[#C79A4A] transition-colors text-2xl">
                    dry_cleaning
                  </span>
                  <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">Catalogo</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {servicesCount}
                </div>
                <div className="text-xs text-[#47464b] font-semibold">Serviços ativos</div>
              </div>
            </Link>

            {/* Barbeiros Ativos */}
            <Link href="/dashboard/barbeiros" className="group">
              <div className="bg-white p-6 rounded-xl border border-[#eceef4]/50 shadow-xs metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#47464b] group-hover:text-[#C79A4A] transition-colors text-2xl">
                    content_cut
                  </span>
                  <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">Equipe</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {barbersCount}
                </div>
                <div className="text-xs text-[#47464b] font-semibold">Barbeiros ativos</div>
              </div>
            </Link>

            {/* Clientes Cadastrados */}
            <Link href="/dashboard/clientes" className="group">
              <div className="bg-white p-6 rounded-xl border border-[#eceef4]/50 shadow-xs metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#47464b] group-hover:text-[#C79A4A] transition-colors text-2xl">
                    groups
                  </span>
                  <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">Registros</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {clientsCount}
                </div>
                <div className="text-xs text-[#47464b] font-semibold">Clientes cadastrados</div>
              </div>
            </Link>

            {/* Adicionais Ativos */}
            <Link href="/dashboard/adicionais" className="group">
              <div className="bg-white p-6 rounded-xl border border-[#eceef4]/50 shadow-xs metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#47464b] group-hover:text-[#C79A4A] transition-colors text-2xl">
                    add_circle
                  </span>
                  <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">Extras</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {addOnsCount}
                </div>
                <div className="text-xs text-[#47464b] font-semibold">Adicionais ativos</div>
              </div>
            </Link>

            {/* Produtos Ativos */}
            <Link href="/dashboard/produtos" className="group">
              <div className="bg-white p-6 rounded-xl border border-[#eceef4]/50 shadow-xs metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#47464b] group-hover:text-[#C79A4A] transition-colors text-2xl">
                    inventory_2
                  </span>
                  <span className="text-[10px] text-[#47464b] font-bold tracking-wider uppercase">Estoque</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {productsCount}
                </div>
                <div className="text-xs text-[#47464b] font-semibold">Produtos ativos</div>
              </div>
            </Link>

            {/* Agendamentos Hoje (Premium Dark styling) */}
            <Link href="/dashboard/agenda" className="group">
              <div className="bg-[#1b1b1e] p-6 rounded-xl border border-[#1b1b1e] shadow-lg metric-card-hover">
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-[#C79A4A] text-2xl">
                    calendar_month
                  </span>
                  <span className="text-[10px] text-[#858387] font-bold tracking-wider uppercase">Hoje</span>
                </div>
                <div className="font-montserrat text-2xl font-bold text-[#C79A4A] mb-1">
                  {appointmentsTodayCount}
                </div>
                <div className="text-xs text-white font-semibold">Agendamentos hoje</div>
              </div>
            </Link>

          </div>

          {/* Recommended Action Card */}
          <div className="bg-white border border-[#c8c5cb]/30 rounded-2xl p-8 relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 right-0 w-64 h-full bg-[#f1f3fa] transform skew-x-12 translate-x-32 group-hover:translate-x-28 transition-transform duration-700 opacity-50"></div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="font-montserrat text-lg font-bold text-[#181c21] mb-2">Configure sua barbearia</h3>
              <p className="text-sm text-[#47464b] mb-8 leading-relaxed font-medium">
                Complete o seu perfil para oferecer a melhor experiência aos seus clientes. 
                Barbearias configuradas têm 40% mais chances de converter novos clientes online.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/dashboard/servicos">
                  <button className="px-6 py-3 bg-black hover:bg-[#C79A4A] hover:text-black text-white font-semibold rounded-lg flex items-center gap-2 transition-all duration-300 text-xs cursor-pointer">
                    <span className="material-symbols-outlined text-sm">add_task</span>
                    Adicionar serviços
                  </button>
                </Link>
                <Link href="/dashboard/barbeiros">
                  <button className="px-6 py-3 border-2 border-black text-black font-semibold rounded-lg flex items-center gap-2 hover:bg-black hover:text-white transition-all duration-300 text-xs cursor-pointer">
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Adicionar barbeiros
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/* Booking Share Widget */}
          <BookingLinkWidget slug={barbershopSlug} />

          {/* Live Queue / Next Appointments */}
          <div className="bg-white rounded-2xl p-6 border border-[#c8c5cb]/20 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-montserrat text-sm font-bold text-[#181c21]">Próximos Clientes</h4>
              <Link href="/dashboard/reservas" className="text-[10px] font-bold text-[#C79A4A] hover:underline uppercase tracking-wider">
                Ver todos
              </Link>
            </div>
            
            <div className="space-y-4">
              {upcomingAppointments && upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appt, index) => {
                  const clientName = (appt.clients as any)?.name || 'Cliente Avulso'
                  const serviceName = (appt.services as any)?.name || 'Serviço'
                  const timeStr = appt.start_at ? appt.start_at.substring(11, 16) : '--:--'
                  const barberAvatar = (appt.barbers as any)?.avatar_url
                  const borderClass = borderColors[index % borderColors.length]

                  return (
                    <div 
                      key={appt.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border-l-4 bg-[#f8f9ff] transition-all hover:scale-[1.01] ${borderClass}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-[#eceef4] overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#47464b] border border-[#c8c5cb]/30">
                        {barberAvatar ? (
                          <img src={barberAvatar} alt="Barber avatar" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(clientName)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-[#181c21] truncate">{clientName}</p>
                        <p className="text-[10px] text-[#47464b] font-medium mt-0.5">{timeStr} • {serviceName}</p>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-[#47464b] border border-dashed border-[#c8c5cb]/40 rounded-xl bg-[#f8f9ff] flex flex-col items-center justify-center p-4">
                  <span className="material-symbols-outlined text-2xl text-[#858387] mb-2">calendar_today</span>
                  <p className="text-xs font-semibold">Sem novos clientes hoje</p>
                  <p className="text-[10px] text-[#77767b] mt-0.5 text-center leading-normal">
                    Use o botão &quot;Nova Reserva&quot; para agendar manualmente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}