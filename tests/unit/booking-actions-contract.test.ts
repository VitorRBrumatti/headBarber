import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/booking/[slug]/actions.ts'),
  'utf8',
)

describe('booking actions product contract', () => {
  it('loads active products with stock', () => {
    expect(source).toContain(".from('products')")
    expect(source).toContain(
      ".select('id, name, description, category, sale_price, stock_quantity, image_url')",
    )
    expect(source).toContain(".eq('is_active', true)")
  })

  it('sends products to the transactional wrapper RPC', () => {
    expect(source).toContain("'create_public_appointment_with_products'")
    expect(source).toContain('p_products: input.products || []')
  })

  it('maps stock conflicts to structured client data', () => {
    expect(source).toContain("code: 'INSUFFICIENT_STOCK'")
    expect(source).toContain('unavailableProducts')
  })
})
