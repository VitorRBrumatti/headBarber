import { AlertTriangle, Minus, Package, Plus } from 'lucide-react'
import type { BookingProduct, SelectedProductQuantities } from './booking-types'

interface BookingProductStepProps {
  products: BookingProduct[]
  quantities: SelectedProductQuantities
  unavailableProductIds: Set<string>
  onQuantityChange: (product: BookingProduct, quantity: number) => void
  onSkip: () => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function BookingProductStep({
  products,
  quantities,
  unavailableProductIds,
  onQuantityChange,
  onSkip,
}: BookingProductStepProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
        <Package className="mx-auto h-10 w-10 text-white/25" />
        <h3 className="mt-4 font-montserrat text-lg font-semibold text-white">
          Nenhum produto disponível
        </h3>
        <p className="mt-2 font-inter text-sm text-white/50">
          Você pode continuar normalmente com seu agendamento.
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="mt-6 rounded-lg border border-white/15 px-5 py-3 font-inter text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:border-white/35"
        >
          Continuar sem produtos
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <p className="font-inter text-xs text-white/45">
          Pagamento e retirada na barbearia
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="font-inter text-xs font-semibold text-white/55 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
        >
          Pular produtos
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {products.map((product) => {
          const quantity = quantities[product.id] ?? 0
          const isSoldOut = product.stock_quantity <= 0
          const hasChangedStock = unavailableProductIds.has(product.id)

          return (
            <article
              key={product.id}
              role="group"
              aria-label={product.name}
              className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${
                isSoldOut
                  ? 'border-white/[0.06] bg-white/[0.02] opacity-60'
                  : hasChangedStock
                    ? 'border-red-400/60 bg-red-400/[0.06]'
                    : quantity > 0
                      ? 'border-[#C79A4A] bg-[#C79A4A]/[0.07]'
                      : 'border-white/10 bg-white/[0.035] hover:border-white/25'
              }`}
            >
              <div className="flex gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.06]">
                  {product.image_url ? (
                    // Product URLs are tenant-managed and can come from different storage hosts.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-7 w-7 text-white/25" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-montserrat text-sm font-semibold text-white">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="mt-1 line-clamp-2 font-inter text-xs leading-5 text-white/45">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 font-montserrat text-sm font-semibold text-white">
                      {formatCurrency(product.sale_price)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span
                      className={`font-inter text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        isSoldOut ? 'text-red-300' : product.stock_quantity <= 3 ? 'text-[#C79A4A]' : 'text-white/40'
                      }`}
                    >
                      {isSoldOut ? 'Esgotado' : `${product.stock_quantity} em estoque`}
                    </span>

                    {!isSoldOut && (
                      <div className="flex items-center rounded-lg border border-white/10 bg-black/20 p-1">
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${product.name}`}
                          onClick={() => onQuantityChange(product, quantity - 1)}
                          disabled={quantity === 0}
                          className="grid h-7 w-7 place-items-center rounded-md text-white/65 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <output className="w-7 text-center font-inter text-xs font-semibold text-white">
                          {quantity}
                        </output>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${product.name}`}
                          onClick={() => onQuantityChange(product, quantity + 1)}
                          disabled={quantity >= product.stock_quantity}
                          className="grid h-7 w-7 place-items-center rounded-md bg-[#C79A4A] text-[#1A1A1D] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {hasChangedStock && (
                <p className="mt-3 flex items-center gap-2 border-t border-red-400/20 pt-3 font-inter text-xs text-red-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  O estoque mudou. Ajuste a quantidade para continuar.
                </p>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
