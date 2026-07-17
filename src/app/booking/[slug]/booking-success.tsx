import { CalendarDays, Check, Clock, Package, Scissors, UserRound } from 'lucide-react'
import type { BookingProduct, SelectedProductQuantities } from './booking-types'

interface BookingSuccessProps {
  barbershopName: string
  serviceName: string
  barberName: string
  addOnNames: string[]
  products: BookingProduct[]
  productQuantities: SelectedProductQuantities
  selectedDate: string
  selectedTime: string
  serviceSubtotal: number
  productSubtotal: number
  total: number
  onReset: () => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export function BookingSuccess({
  barbershopName,
  serviceName,
  barberName,
  addOnNames,
  products,
  productQuantities,
  selectedDate,
  selectedTime,
  serviceSubtotal,
  productSubtotal,
  total,
  onReset,
}: BookingSuccessProps) {
  const selectedProducts = products.filter((product) => (productQuantities[product.id] ?? 0) > 0)

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(199,154,74,0.18),transparent_68%)]"
      />

      <div className="relative z-10 w-full text-center motion-safe:animate-[fadeIn_.5s_ease-out]">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#C79A4A] bg-[#C79A4A]/10">
          <Check className="h-9 w-9 text-[#C79A4A]" strokeWidth={2.5} />
        </div>
        <h1 className="mt-7 font-montserrat text-2xl font-bold tracking-[-0.02em] text-white">
          Agendamento confirmado
        </h1>
        <p className="mx-auto mt-2 max-w-sm font-inter text-sm leading-6 text-white/50">
          Sua reserva na {barbershopName} foi criada. Enviamos os detalhes para o seu WhatsApp.
        </p>
      </div>

      <section className="relative z-10 mt-8 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl">
        <div className="space-y-4">
          <SummaryRow icon={Scissors} label="Serviço" value={serviceName} />
          <SummaryRow icon={UserRound} label="Profissional" value={barberName} />
          <SummaryRow
            icon={CalendarDays}
            label="Data"
            value={new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')}
          />
          <SummaryRow icon={Clock} label="Horário" value={selectedTime} accent />
        </div>

        {addOnNames.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4 text-left">
            <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
              Adicionais
            </p>
            <p className="mt-2 font-inter text-sm text-white/75">{addOnNames.join(', ')}</p>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4 text-left">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#C79A4A]" />
              <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C79A4A]">
                Produtos para retirada
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex justify-between gap-4 font-inter text-sm">
                  <span className="text-white/65">
                    {productQuantities[product.id]}x {product.name}
                  </span>
                  <span className="font-semibold text-white">
                    {formatCurrency(product.sale_price * productQuantities[product.id])}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 font-inter text-xs text-white/40">
              Pagamento e retirada na barbearia.
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex justify-between font-inter text-xs text-white/45">
            <span>Atendimento</span>
            <span>{formatCurrency(serviceSubtotal)}</span>
          </div>
          {productSubtotal > 0 && (
            <div className="mt-2 flex justify-between font-inter text-xs text-white/45">
              <span>Produtos</span>
              <span>{formatCurrency(productSubtotal)}</span>
            </div>
          )}
          <div className="mt-4 flex items-end justify-between gap-4">
            <span className="font-inter text-xs font-semibold text-white/60">
              Total a pagar na barbearia
            </span>
            <span className="font-montserrat text-xl font-bold text-[#C79A4A]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onReset}
        className="relative z-10 mt-5 w-full rounded-lg border border-white/15 px-5 py-3.5 font-inter text-xs font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:border-white/35 hover:bg-white/[0.03]"
      >
        Agendar outro serviço
      </button>
    </main>
  )
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Scissors
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 font-inter text-xs text-white/40">
        <Icon className="h-4 w-4 text-[#C79A4A]" />
        {label}
      </span>
      <span className={`text-right font-inter text-sm font-semibold ${accent ? 'text-[#C79A4A]' : 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}
