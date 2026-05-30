'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Scissors, Calendar, Users, Briefcase, PlusCircle, ShoppingBag,
  CreditCard, Settings, UserCircle, Menu, Activity, LogOut, X
} from 'lucide-react'

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Activity },
  { name: 'Agenda', href: '/dashboard/agenda', icon: Calendar },
  { name: 'Reservas', href: '/dashboard/reservas', icon: Calendar },
  { name: 'Barbeiros', href: '/dashboard/barbeiros', icon: Users },
  { name: 'Serviços', href: '/dashboard/servicos', icon: Briefcase },
  { name: 'Adicionais', href: '/dashboard/adicionais', icon: PlusCircle },
  { name: 'Produtos', href: '/dashboard/produtos', icon: ShoppingBag },
  { name: 'Clientes', href: '/dashboard/clientes', icon: UserCircle },
  { name: 'Planos Mensais', href: '/dashboard/planos-mensais', icon: CreditCard },
  { name: 'Financeiro', href: '/dashboard/financeiro', icon: Activity },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: Settings },
  { name: 'Admin Master', href: '/dashboard/admin-master', icon: Scissors },
]

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  barbershopName: string
}

export function DashboardShell({ children, userEmail, barbershopName }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {sidebarItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
            isActive(item.href)
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden w-64 flex-col border-r bg-white dark:bg-zinc-900/50 dark:border-zinc-800 md:flex">
        <div className="flex h-16 items-center border-b px-6 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
            <img 
              src="/brand/logo-white.png" 
              alt="HeadBarber Logo" 
              className="h-7 w-auto object-contain dark:block hidden"
            />
            <img 
              src="/brand/logo-horizontal.png" 
              alt="HeadBarber Logo" 
              className="h-7 w-auto object-contain dark:hidden block"
            />
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4">
            <NavItems />
          </nav>
        </div>
        <div className="border-t p-4 dark:border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex flex-col overflow-hidden font-sans">
              <span className="text-sm font-medium truncate w-32">{userEmail}</span>
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

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white dark:bg-zinc-900 border-r dark:border-zinc-800 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-6 dark:border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-95 transition-opacity" onClick={() => setMobileMenuOpen(false)}>
            <img 
              src="/brand/logo-white.png" 
              alt="HeadBarber Logo" 
              className="h-7 w-auto object-contain dark:block hidden"
            />
            <img 
              src="/brand/logo-horizontal.png" 
              alt="HeadBarber Logo" 
              className="h-7 w-auto object-contain dark:hidden block"
            />
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4">
            <NavItems onClick={() => setMobileMenuOpen(false)} />
          </nav>
        </div>
        <div className="border-t p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-medium truncate">{userEmail}</span>
              <span className="text-xs text-zinc-500 truncate">{barbershopName}</span>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-2">
            <button type="submit" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:hidden dark:bg-zinc-900/50 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-90">
              <img 
                src="/brand/logo-symbol-gold.png" 
                alt="HeadBarber Symbol" 
                className="h-6 w-auto object-contain"
              />
              <span className="font-sans font-black tracking-tight text-zinc-900 dark:text-zinc-50 text-base">HeadBarber</span>
            </Link>
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
