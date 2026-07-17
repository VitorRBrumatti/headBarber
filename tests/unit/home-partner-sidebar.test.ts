import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('home partner banner and sidebar navigation', () => {
  it('shows the official partner banner with the provided logo', () => {
    const home = source('src/app/dashboard/page.tsx')

    expect(home).toContain("import Image from 'next/image'")
    expect(home).toContain('aria-label="Parceiro Oficial"')
    expect(home).toContain('Parceiro Oficial')
    expect(home).toContain('/brand/partners/hoffmanns-barber.png')
    expect(home).toContain('width={3817}')
    expect(home).toContain('height={2176}')
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
