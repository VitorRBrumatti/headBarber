import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('appointment settlement UI', () => {
  it('shows authoritative financial values and payment method', () => {
    const rendered = read('src/app/dashboard/agenda/settlement-dialog.tsx')
    expect(rendered).toContain('Finalizar atendimento')
    expect(rendered).toContain('Valor bruto')
    expect(rendered).toContain('Valor coberto')
    expect(rendered).toContain('Valor a receber')
    expect(rendered).toContain('Forma de pagamento')
    expect(rendered).toContain('appointment.amountDue')
  })

  it('keeps cancellation and no-show consequences explicit', () => {
    const rendered = read('src/app/dashboard/agenda/settlement-dialog.tsx')
    expect(rendered).toContain('libera os benefícios reservados')
    expect(rendered).toContain('consome os benefícios reservados')
    expect(rendered).toContain('disabled={isPending')
    const agenda = read('src/app/dashboard/agenda/agenda-client.tsx')
    expect(agenda).toContain('selectedAppointment && !settlementTarget')
  })
})
