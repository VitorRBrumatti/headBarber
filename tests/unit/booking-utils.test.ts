import { describe, expect, it } from 'vitest'
import {
  clampSelectionsToStock,
  getBookingTotals,
  setProductQuantity,
  toSelectedProducts,
} from '@/app/booking/[slug]/booking-utils'

const product = {
  id: 'pomade',
  name: 'Pomada',
  description: null,
  category: null,
  sale_price: 42,
  stock_quantity: 2,
  image_url: null,
}

describe('booking product helpers', () => {
  it('clamps quantity to loaded stock', () => {
    expect(setProductQuantity({}, product, 5)).toEqual({ pomade: 2 })
  })

  it('removes products whose quantity reaches zero', () => {
    expect(setProductQuantity({ pomade: 2 }, product, 0)).toEqual({})
  })

  it('builds a stable RPC payload', () => {
    expect(toSelectedProducts({ pomade: 2, gel: 0 })).toEqual([
      { productId: 'pomade', quantity: 2 },
    ])
  })

  it('keeps service and product subtotals separate', () => {
    expect(getBookingTotals(50, [25], [product], { pomade: 2 })).toEqual({
      serviceSubtotal: 75,
      productSubtotal: 84,
      total: 159,
    })
  })

  it('preserves unaffected products and clamps only changed stock', () => {
    expect(clampSelectionsToStock(
      { pomade: 3, oil: 1 },
      [{ productId: 'pomade', availableQuantity: 1 }],
    )).toEqual({ pomade: 1, oil: 1 })
    expect(clampSelectionsToStock(
      { pomade: 1 },
      [{ productId: 'pomade', availableQuantity: 0 }],
    )).toEqual({})
  })
})
