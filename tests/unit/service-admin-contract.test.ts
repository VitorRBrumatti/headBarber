import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('service administration contract', () => {
  it('loads all barbers and nested relationship configuration', () => {
    const source = read('src/app/dashboard/servicos/page.tsx')
    expect(source).toContain(".from('barbers')")
    expect(source).toContain('barber_services')
    expect(source).toContain('price')
    expect(source).toContain('duration_minutes')
    expect(source).toContain('is_available')
  })

  it('saves the catalog and assignments in one transactional RPC call', () => {
    const source = read('src/app/dashboard/servicos/actions.ts')
    expect(source).toContain(".rpc('save_service_with_barbers'")
    expect(source).toContain('p_assignments: parsed.data.assignments')
    expect(source).not.toContain(".from('services').insert")
  })

  it('renders per-barber availability, price, and duration controls', () => {
    const source = read(
      'src/components/dashboard/service-assignments-editor.tsx',
    )
    expect(source).toContain('Disponível para agendamento')
    expect(source).toContain('Preço (R$)')
    expect(source).toContain('Duração (min)')
  })

  it('renders relationship ranges and the zero-available state', () => {
    const source = read(
      'src/app/dashboard/servicos/services-client.tsx',
    )
    expect(source).toContain('formatPriceRange')
    expect(source).toContain('formatDurationRange')
    expect(source).toContain('Sem profissionais')
  })
})
