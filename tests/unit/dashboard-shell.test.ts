import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

describe('dashboard shell', () => {
  it('does not render a notification action when notifications are unsupported', () => {
    const markup = renderToStaticMarkup(
      createElement(
        DashboardShell,
        {
          userEmail: 'cliente@headbarber.com.br',
          barbershopName: 'Barbearia Teste',
        },
        createElement('p', null, 'Conteúdo'),
      ),
    )

    expect(markup).not.toContain('>notifications<')
    expect(markup).toContain('>help_outline<')
    expect(markup).toContain('cliente')
  })
})