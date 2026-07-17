export interface BookingProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  sale_price: number
  stock_quantity: number
  image_url: string | null
}

export type SelectedProductQuantities = Record<string, number>
export type ProductSelection = SelectedProductQuantities

export interface SelectedBookingProduct {
  productId: string
  quantity: number
}

export interface UnavailableProduct {
  productId: string
  availableQuantity: number
}

