import { AlertTriangle, Minus, Package, Plus } from 'lucide-react'
import { ImageWithFallback } from '@/components/ui/image-with-fallback'
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
    return <div className="border-y border-[#3C3D36] px-4 py-12 text-center">
      <Package className="mx-auto size-10 text-[#A59E92]" />
      <h3 className="mt-4 font-montserrat text-lg font-semibold text-[#F6F2E9]">Nenhum produto disponível</h3>
      <p className="mt-2 text-sm text-[#C1BCB2]">Você pode continuar normalmente com seu agendamento.</p>
      <button type="button" onClick={onSkip} className="mt-6 min-h-11 border border-[#B78635] px-5 text-sm font-semibold text-[#D6B475] hover:bg-[#30291D]">Continuar sem produtos</button>
    </div>
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[#C1BCB2]">Escolha os produtos para incluir na sua reserva.</p>
      <button type="button" onClick={onSkip} className="min-h-11 text-sm font-semibold text-[#D6B475] underline underline-offset-4 hover:text-[#F6F2E9]">Pular produtos</button>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      {products.map(product => {
        const quantity = quantities[product.id] ?? 0
        const isSoldOut = product.stock_quantity <= 0
        const hasChangedStock = unavailableProductIds.has(product.id)

        return <article key={product.id} role="group" aria-label={product.name} className={`booking-product-card flex min-w-0 flex-col overflow-hidden rounded-xl border bg-[#191A19] transition-colors ${
          isSoldOut ? 'border-[#3C3D36]' : hasChangedStock ? 'border-red-500' : quantity > 0 ? 'border-[#B78635] ring-1 ring-[#B78635]/30' : 'border-[#3C3D36] hover:border-[#B78635]/70'
        }`}>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-[#3C3D36] bg-[#20211D]">
            <ImageWithFallback src={product.image_url} alt={product.name} className={`h-full w-full object-contain p-4 ${isSoldOut ? 'grayscale' : ''}`} fallback={<div className="flex flex-col items-center gap-3 text-[#A59E92]"><Package className="size-16" strokeWidth={1.1} /><span className="text-xs">Imagem indisponível</span></div>} />
            {isSoldOut && <span className="hb-soldout-badge absolute left-4 top-4 rounded-md bg-[#F6F2E9] px-3 py-1.5 text-xs font-semibold">Esgotado</span>}
            {quantity > 0 && !isSoldOut && <span className="absolute right-4 top-4 rounded-md bg-[#B78635] px-3 py-1.5 text-xs font-semibold text-[#211B12]">Na reserva · {quantity}</span>}
          </div>

          <div className="flex flex-1 flex-col p-5">
            <p className="text-[11px] font-bold uppercase tracking-[.13em] text-[#D6B475]">{product.category || 'Produto'}</p>
            <h3 className="mt-2 font-montserrat text-lg font-semibold leading-snug text-[#F6F2E9]">{product.name}</h3>
            {product.description && <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#C1BCB2]">{product.description}</p>}
            <div className="mt-auto pt-5">
              <p className="font-montserrat text-2xl font-bold tracking-[-.04em] text-[#F6F2E9]">{formatCurrency(product.sale_price)}</p>
              <p className={`mt-1 text-xs ${isSoldOut ? 'text-[#9D4C45]' : product.stock_quantity <= 3 ? 'text-[#D6B475]' : 'text-[#C1BCB2]'}`}>
                {isSoldOut ? 'Indisponível no momento' : product.stock_quantity <= 3 ? `Últimas ${product.stock_quantity} unidades` : `${product.stock_quantity} disponíveis`}
              </p>
              {!isSoldOut && <div className="mt-5 flex h-12 items-center justify-between overflow-hidden rounded-md border border-[#3C3D36] bg-[#0C0D0D]">
                <button type="button" aria-label={`Diminuir quantidade de ${product.name}`} onClick={() => onQuantityChange(product, quantity - 1)} disabled={quantity === 0} className="grid h-full w-12 place-items-center text-[#F6F2E9] hover:bg-[#30291D] disabled:cursor-not-allowed disabled:opacity-30"><Minus className="size-4" /></button>
                <output aria-label={`Quantidade de ${product.name}`} className="text-sm font-bold text-[#F6F2E9]">{quantity}</output>
                <button type="button" aria-label={`Aumentar quantidade de ${product.name}`} onClick={() => onQuantityChange(product, quantity + 1)} disabled={quantity >= product.stock_quantity} className="grid h-full w-12 place-items-center bg-[#B78635] text-[#211B12] hover:bg-[#C79A4A] disabled:cursor-not-allowed disabled:opacity-30"><Plus className="size-4" /></button>
              </div>}
            </div>
            {hasChangedStock && <p className="mt-4 flex items-start gap-2 border-t border-red-200 pt-3 text-xs text-red-700"><AlertTriangle className="size-4 shrink-0" />O estoque mudou. Ajuste a quantidade para continuar.</p>}
          </div>
        </article>
      })}
    </div>
  </div>
}
