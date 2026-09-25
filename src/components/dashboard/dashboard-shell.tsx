'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

interface DashboardShellProps {
  children: React.ReactNode
  userEmail: string
  barbershopName: string
  isDemo: boolean
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Visão geral',
  '/dashboard/agenda': 'Agenda',
  '/dashboard/reservas': 'Reservas',
  '/dashboard/clientes': 'Clientes',
  '/dashboard/servicos': 'Serviços',
  '/dashboard/adicionais': 'Adicionais',
  '/dashboard/produtos': 'Produtos',
  '/dashboard/barbeiros': 'Barbeiros',
  '/dashboard/financeiro': 'Financeiro',
  '/dashboard/financeiro/assinaturas': 'Assinaturas de clientes',
  '/dashboard/planos-mensais': 'Assinatura HeadBarber',
  '/dashboard/configuracoes': 'Configurações',
}

export function DashboardShell({ children, userEmail, barbershopName, isDemo }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const pathname = usePathname()
  const pageName = pageNames[pathname] ?? 'Painel'
  const initials = userEmail ? userEmail.split('@')[0].slice(0, 2).toUpperCase() : 'HB'

  useEffect(() => {
    if (!mobileMenuOpen && !profileDropdownOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        setProfileDropdownOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen, profileDropdownOpen])

  return (
    <div className="hb-app flex min-h-screen text-[#242321]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[224px] md:block">
        <Sidebar isDemo={isDemo} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:pl-[224px]">
        <header className="hb-topbar sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir navegação"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="hb-icon-button md:hidden"
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu</span>
            </button>
            <Link href="/dashboard" className="hidden text-xs font-medium text-[#69655f] hover:text-[#242321] sm:block">HeadBarber</Link>
            <span className="hidden text-[#c7c1b8] sm:block" aria-hidden="true">/</span>
            <span className="truncate text-sm font-semibold text-[#242321]">{pageName}</span>
          </div>

          <div className="relative ml-4 flex items-center gap-3">
            <div className="hidden max-w-44 truncate text-right sm:block">
              <span className="block truncate text-xs font-semibold leading-4">{barbershopName}</span>
              <span className="block truncate text-[11px] leading-4 text-[#69655f]">{userEmail}</span>
            </div>
            <button
              type="button"
              aria-label="Abrir menu da conta"
              aria-expanded={profileDropdownOpen}
              onClick={() => setProfileDropdownOpen((open) => !open)}
              className="hb-account-button"
            >
              {initials}
            </button>
            {profileDropdownOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Fechar menu da conta" onClick={() => setProfileDropdownOpen(false)} />
                <div className="hb-account-menu absolute right-0 top-11 z-50 w-56">
                  <div className="border-b border-[#e2ded7] px-4 py-3 sm:hidden">
                    <p className="truncate text-xs font-semibold">{barbershopName}</p>
                    <p className="truncate text-xs text-[#69655f]">{userEmail}</p>
                  </div>
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm hover:bg-[#f5f2ed]">
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">logout</span>
                      Sair do painel
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>

        {isDemo && (
          <div className="flex items-start gap-2 border-b border-[#ead6ad] bg-[#fff8e8] px-4 py-2 text-xs text-[#5f4518] sm:items-center sm:px-6">
            <span className="material-symbols-outlined text-base" aria-hidden="true">visibility</span>
            <p><strong>Modo demonstração.</strong> Dados fictícios; cadastros, preços e configurações protegidos. Agendamentos de teste estão disponíveis.</p>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>

      {mobileMenuOpen && (
        <>
          <button type="button" className="fixed inset-0 z-40 bg-black/50 md:hidden" aria-label="Fechar navegação" onClick={() => setMobileMenuOpen(false)} />
          <aside id="mobile-navigation" className="fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] md:hidden">
            <Sidebar isDemo={isDemo} onLinkClick={() => setMobileMenuOpen(false)} />
            <button type="button" className="absolute right-3 top-3 rounded p-2 text-white md:hidden" aria-label="Fechar navegação" onClick={() => setMobileMenuOpen(false)}>
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </aside>
        </>
      )}
    </div>
  )
}
