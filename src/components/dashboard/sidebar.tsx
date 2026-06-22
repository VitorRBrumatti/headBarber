'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onLinkClick?: () => void
}

const sidebarItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { name: 'Agenda', href: '/dashboard/agenda', icon: 'calendar_today' },
  { name: 'Reservas', href: '/dashboard/reservas', icon: 'book_online' },
  { name: 'Barbeiros', href: '/dashboard/barbeiros', icon: 'content_cut' },
  { name: 'Serviços', href: '/dashboard/servicos', icon: 'dry_cleaning' },
  { name: 'Adicionais', href: '/dashboard/adicionais', icon: 'add_circle' },
  { name: 'Produtos', href: '/dashboard/produtos', icon: 'inventory_2' },
  { name: 'Clientes', href: '/dashboard/clientes', icon: 'groups' },
  { name: 'Planos Mensais', href: '/dashboard/planos-mensais', icon: 'card_membership' },
  { name: 'Financeiro', href: '/dashboard/financeiro', icon: 'payments' },
  { name: 'Configurações', href: '/dashboard/configuracoes', icon: 'settings' },
  { name: 'Admin Master', href: '/dashboard/admin-master', icon: 'admin_panel_settings' },
]

export function Sidebar({ onLinkClick }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex flex-col h-full bg-[#1b1b1e] py-8 px-4 text-white">
      {/* Logo Section (No text below, just logo image as requested) */}
      <div className="mb-10 px-4 flex items-center justify-center">
        <Link href="/dashboard" className="block hover:opacity-90 transition-opacity">
          <img 
            alt="HB Barber Logo" 
            className="w-full max-w-[160px] h-auto object-contain mx-auto" 
            src="/brand/logo-white.png"
          />
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
        {sidebarItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out group relative ${
                active
                  ? 'text-white font-semibold bg-white/5'
                  : 'text-[#858387] hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ${active ? 'text-[#C79A4A]' : 'text-[#858387] group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="font-body-md text-sm">{item.name}</span>
              {active && <div className="sidebar-active-indicator" />}
            </Link>
          )
        })}
      </nav>

      {/* CTA Action */}
      <div className="mt-6">
        <Link href="/dashboard/agenda" onClick={onLinkClick}>
          <button className="w-full py-4 px-4 bg-[#C79A4A] text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-300 shadow-lg shadow-[#C79A4A]/10 cursor-pointer">
            <span className="material-symbols-outlined text-lg">add</span>
            Nova Reserva
          </button>
        </Link>
      </div>
    </div>
  )
}
