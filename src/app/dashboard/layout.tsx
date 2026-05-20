import Link from "next/link"
import { Scissors, Calendar, Users, Briefcase, PlusCircle, ShoppingBag, CreditCard, Settings, UserCircle, Menu, Activity, LogOut } from "lucide-react"
import { createClient } from "@/utils/supabase/server"

const sidebarItems = [
  { name: "Dashboard", href: "/dashboard", icon: Activity },
  { name: "Agenda", href: "/dashboard/agenda", icon: Calendar },
  { name: "Reservas", href: "/dashboard/reservas", icon: Calendar },
  { name: "Barbeiros", href: "/dashboard/barbeiros", icon: Users },
  { name: "Serviços", href: "/dashboard/servicos", icon: Briefcase },
  { name: "Adicionais", href: "/dashboard/adicionais", icon: PlusCircle },
  { name: "Produtos", href: "/dashboard/produtos", icon: ShoppingBag },
  { name: "Clientes", href: "/dashboard/clientes", icon: UserCircle },
  { name: "Planos Mensais", href: "/dashboard/planos-mensais", icon: CreditCard },
  { name: "Financeiro", href: "/dashboard/financeiro", icon: Activity },
  { name: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
  { name: "Admin Master", href: "/dashboard/admin-master", icon: Scissors },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Buscar o perfil do usuário caso necessite futuramente (ex: nome da barbearia associada)
  let barbershopName = "Barbearia X"
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershops(name)')
      .eq('id', user.id)
      .single()
      
    // @ts-ignore
    if (profile?.barbershops?.name) {
      // @ts-ignore
      barbershopName = profile.barbershops.name
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden w-64 flex-col border-r bg-white dark:bg-zinc-900/50 dark:border-zinc-800 md:flex">
        <div className="flex h-16 items-center border-b px-6 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <div className="bg-primary p-1.5 rounded-md">
              <Scissors className="w-4 h-4 text-primary-foreground" />
            </div>
            HeadBarber
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4 text-sm font-medium">
            {sidebarItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t p-4 dark:border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate w-32">{user?.email || 'Usuário'}</span>
              <span className="text-xs text-zinc-500 truncate">{barbershopName}</span>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-zinc-500 hover:text-destructive transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden dark:bg-zinc-900/50 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button className="text-zinc-500">
              <Menu className="h-6 w-6" />
            </button>
            <span className="font-bold">HeadBarber</span>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-zinc-500 hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
