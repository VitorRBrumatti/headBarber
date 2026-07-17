import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentPath = resolve(
  process.cwd(),
  'src/app/dashboard/configuracoes/configuracoes-client.tsx',
)
const source = readFileSync(componentPath, 'utf8')

describe('configurações visual contract', () => {
  it('exposes the approved page hierarchy and semantic tabs', () => {
    expect(source).toContain('Configurações</h1>')
    expect(source).toContain('Agenda & Horários')
    expect(source).toContain('Bloqueios Excepcionais')
    expect(source).toContain('role="tablist"')
    expect(source).toContain('role="tab"')
    expect(source).toContain("aria-selected={activeTab === 'agenda'}")
    expect(source).toContain("aria-selected={activeTab === 'blocked'}")
    expect(source).toContain('Regras de Agendamento')
    expect(source).toContain('Horários de Funcionamento')
    expect(source).toContain('Novo Bloqueio')
    expect(source).toContain('Bloqueios Ativos')
  })

  it('preserves the existing settings and exceptional-block actions', () => {
    expect(source).toContain('await updateBarbershopSettingsAction({')
    expect(source).toContain('const blocks = await getBarberBlocks(barberId)')
    expect(source).toContain(
      'await createBarberBlock(selectedBarberBlock, startIso, endIso, blockReason)',
    )
    expect(source).toContain('await deleteBarberBlock(blockId)')
  })

  it('uses the approved light surface instead of the old dark cards', () => {
    expect(source).not.toContain('bg-neutral-900')
    expect(source).not.toContain('bg-neutral-950')
    expect(source).not.toContain('text-white')
    expect(source).toContain('bg-white')
    expect(source).toContain('bg-[#f8f9ff]')
    expect(source).toContain('border-[#e0e2e9]')
    expect(source).toContain('text-[#C79A4A]')
  })
})
