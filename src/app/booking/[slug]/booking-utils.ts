import type {
  BookingProduct,
  SelectedBookingProduct,
  SelectedProductQuantities,
} from './booking-types'

export function setProductQuantity(
  current: SelectedProductQuantities,
  product: BookingProduct,
  requested: number,
): SelectedProductQuantities {
  const quantity = Math.max(
    0,
    Math.min(Math.trunc(requested), product.stock_quantity),
  )
  const next = { ...current }

  if (quantity === 0) {
    delete next[product.id]
  } else {
    next[product.id] = quantity
  }

  return next
}

export function toSelectedProducts(
  selection: SelectedProductQuantities,
): SelectedBookingProduct[] {
  return Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productId, quantity]) => ({ productId, quantity }))
}

export function getBookingTotals(
  servicePrice: number,
  addOnPrices: number[],
  products: BookingProduct[],
  selection: SelectedProductQuantities,
) {
  const serviceSubtotal =
    servicePrice + addOnPrices.reduce((sum, price) => sum + price, 0)
  const productSubtotal = products.reduce(
    (sum, product) =>
      sum + product.sale_price * (selection[product.id] ?? 0),
    0,
  )

  return {
    serviceSubtotal,
    productSubtotal,
    total: serviceSubtotal + productSubtotal,
  }
}
