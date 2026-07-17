import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('reserved products in appointment details', () => {
  it('queries and renders reserved products without treating them as paid revenue', () => {
    expect(source('src/app/dashboard/reservas/page.tsx')).toContain('appointment_products')
    expect(source('src/app/dashboard/agenda/actions.ts')).toContain('appointment_products')
    expect(source('src/app/dashboard/reservas/reservas-client.tsx')).toContain('Produtos para retirada')
    expect(source('src/app/dashboard/agenda/agenda-client.tsx')).toContain('Pagamento pendente na barbearia')
  })
})
