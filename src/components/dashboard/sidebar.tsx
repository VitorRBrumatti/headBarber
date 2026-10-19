'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onLinkClick?: () => void
  isDemo?: boolean
}

const groups = [
  {
    label: 'Operação',
    items: [
      { name: 'Visão geral', href: '/dashboard', icon: 'space_dashboard' },
      { name: 'Agenda', href: '/dashboard/agenda', icon: 'calendar_today' },
      { name: 'Reservas', href: '/dashboard/reservas', icon: 'book_online' },
      { name: 'Clientes', href: '/dashboard/clientes', icon: 'groups' },
    ],
  },
  {
    label: 'Catálogo e equipe',
    items: [
      { name: 'Serviços', href: '/dashboard/servicos', icon: 'content_cut' },
      { name: 'Adicionais', href: '/dashboard/adicionais', icon: 'add_circle' },
      { name: 'Produtos', href: '/dashboard/produtos', icon: 'inventory_2' },
      { name: 'Barbeiros', href: '/dashboard/barbeiros', icon: 'badge' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { name: 'Financeiro', href: '/dashboard/financeiro', icon: 'payments' },
      { name: 'Assinaturas de clientes', href: '/dashboard/financeiro/assinaturas', icon: 'loyalty' },
      { name: 'Assinatura HeadBarber', href: '/dashboard/planos-mensais', icon: 'card_membership' },
      { name: 'Configurações', href: '/dashboard/configuracoes', icon: 'settings' },
    ],
  },
]

const demoHrefs = new Set([
  '/dashboard', '/dashboard/agenda', '/dashboard/financeiro',
  '/dashboard/barbeiros', '/dashboard/servicos', '/dashboard/clientes',
])

export function Sidebar({ onLinkClick, isDemo = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="hb-sidebar flex h-full flex-col">
      <Link href="/dashboard" onClick={onLinkClick} className="hb-sidebar-brand" aria-label="HeadBarber — visão geral">
        <Image
          alt="HeadBarber"
          src="/brand/headbarber_logo_branca_com_texto_transparente.png"
          width={136}
          height={102}
          className="h-auto w-[112px] object-contain"
        />
      </Link>

      <nav className="hb-sidebar-nav flex-1 overflow-y-auto" aria-label="Navegação principal">
        {groups.map((group) => {
          const items = isDemo ? group.items.filter((item) => demoHrefs.has(item.href)) : group.items
          if (!items.length) return null

          return (
            <div className="hb-nav-group" key={group.label}>
              <p className="hb-nav-label">{group.label}</p>
              {items.map((item) => {
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    aria-current={active ? 'page' : undefined}
                    className={`hb-nav-item ${active ? 'hb-nav-item-active' : ''}`}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      <div className="hb-sidebar-action">
        <Link href="/dashboard/agenda" onClick={onLinkClick} className="hb-new-booking">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Nova reserva
        </Link>
      </div>
    </div>
  )
}
