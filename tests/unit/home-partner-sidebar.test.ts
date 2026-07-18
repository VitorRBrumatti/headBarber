import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('home partner banner and sidebar navigation', () => {
  it('shows the official partner banner on the landing page only', () => {
    const landingPage = source('src/app/page.tsx')
    const dashboard = source('src/app/dashboard/page.tsx')

    expect(landingPage).toContain('aria-label="Parceiro Oficial"')
    expect(landingPage).toContain('Parceiro Oficial')
    expect(landingPage).toContain('/brand/partners/hoffmanns-barber.png')
    expect(landingPage).toContain('width={3817}')
    expect(landingPage).toContain('height={2176}')
    expect(dashboard).not.toContain('aria-label="Parceiro Oficial"')
    expect(dashboard).not.toContain('/brand/partners/hoffmanns-barber.png')
  })

  it('places Financeiro after Agenda and removes Admin Master from the sidebar', () => {
    const sidebar = source('src/components/dashboard/sidebar.tsx')
    const agendaIndex = sidebar.indexOf("name: 'Agenda'")
    const financeiroIndex = sidebar.indexOf("name: 'Financeiro'")
    const reservasIndex = sidebar.indexOf("name: 'Reservas'")

    expect(agendaIndex).toBeGreaterThan(-1)
    expect(financeiroIndex).toBeGreaterThan(agendaIndex)
    expect(financeiroIndex).toBeLessThan(reservasIndex)
    expect(sidebar).not.toContain("name: 'Admin Master'")
  })
})
