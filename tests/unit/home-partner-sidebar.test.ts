import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('home partner banner and sidebar navigation', () => {
  it('shows the official partner banner on the landing page only', () => {
    const landingPage = source('src/app/landing-redesign.tsx')
    const dashboard = source('src/app/dashboard/page.tsx')

    expect(landingPage).toContain('aria-label="Parceiro oficial"')
    expect(landingPage).toContain('Parceiro oficial')
    expect(landingPage).toContain('/brand/partners/hoffmanns-barber.png')
    expect(landingPage).toContain('width={3817}')
    expect(landingPage).toContain('height={2176}')
    expect(dashboard).not.toContain('aria-label="Parceiro oficial"')
    expect(dashboard).not.toContain('/brand/partners/hoffmanns-barber.png')
  })

  it('groups Financeiro under Gestão and removes Admin Master from the sidebar', () => {
    const sidebar = source('src/components/dashboard/sidebar.tsx')
    const agendaIndex = sidebar.indexOf("name: 'Agenda'")
    const financeiroIndex = sidebar.indexOf("name: 'Financeiro'")
    const gestaoIndex = sidebar.indexOf("label: 'Gestão'")

    expect(agendaIndex).toBeGreaterThan(-1)
    expect(gestaoIndex).toBeGreaterThan(agendaIndex)
    expect(financeiroIndex).toBeGreaterThan(gestaoIndex)
    expect(sidebar).not.toContain("name: 'Admin Master'")
  })
})
