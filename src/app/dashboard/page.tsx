import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Users, Scissors, Briefcase, Calendar, PlusCircle, ShoppingBag } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Buscar barbershop_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id, barbershops(name)')
    .eq('id', user!.id)
    .single()

  const barbershopId = profile?.barbershop_id

  // Buscar contagens em paralelo
  const [
    { count: servicesCount },
    { count: barbersCount },
    { count: clientsCount },
    { count: addOnsCount },
    { count: productsCount },
  ] = await Promise.all([
    supabase.from('services').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('barbers').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!),
    supabase.from('add_ons').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('barbershop_id', barbershopId!).eq('is_active', true),
  ])

  // @ts-ignore
  const shopName = profile?.barbershops?.name ?? 'Sua Barbearia'

  const stats = [
    {
      title: 'Serviços Ativos',
      value: servicesCount ?? 0,
      icon: Briefcase,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      href: '/dashboard/servicos',
    },
    {
      title: 'Barbeiros Ativos',
      value: barbersCount ?? 0,
      icon: Scissors,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      href: '/dashboard/barbeiros',
    },
    {
      title: 'Clientes Cadastrados',
      value: clientsCount ?? 0,
      icon: Users,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      href: '/dashboard/clientes',
    },
    {
      title: 'Adicionais Ativos',
      value: addOnsCount ?? 0,
      icon: PlusCircle,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      href: '/dashboard/adicionais',
    },
    {
      title: 'Produtos Ativos',
      value: productsCount ?? 0,
      icon: ShoppingBag,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      href: '/dashboard/produtos',
    },
    {
      title: 'Agendamentos Hoje',
      value: 0,
      icon: Calendar,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      href: '/dashboard/agenda',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Bem-vindo, ${shopName}!`}
        description="Aqui está um resumo do que está acontecendo na sua barbearia."
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <a key={stat.title} href={stat.href} className="block transition-transform hover:-translate-y-0.5">
            <Card className="hover:shadow-md transition-shadow dark:bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Empty state call-to-action */}
      {(servicesCount === 0 || barbersCount === 0) && (
        <Card className="border-dashed dark:bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Scissors className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configure sua barbearia</h3>
            <p className="text-zinc-500 text-sm max-w-sm">
              Comece adicionando seus serviços e barbeiros para estar pronto para os agendamentos.
            </p>
            <div className="flex gap-3 mt-6">
              <a href="/dashboard/servicos">
                <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold rounded-lg transition-colors">
                  Adicionar Serviços
                </button>
              </a>
              <a href="/dashboard/barbeiros">
                <button className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium rounded-lg transition-colors">
                  Adicionar Barbeiros
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}