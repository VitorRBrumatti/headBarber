import {
  CalendarDays,
  Check,
  Clock,
  Package,
  Scissors,
  UserRound,
} from 'lucide-react'
import type { CreatedBookingReceipt } from './booking-types'

interface BookingSuccessProps {
  barbershopName: string
  receipt: CreatedBookingReceipt
  onReset: () => void
}

const formatReceiptMoney = (value: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value))

const formatReceiptDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))

const formatReceiptTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(new Date(value))

export function BookingSuccess({
  barbershopName,
  receipt,
  onReset,
}: BookingSuccessProps) {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(199,154,74,0.18),transparent_68%)]"
      />

      <div className="relative z-10 w-full text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-[#C79A4A] bg-[#C79A4A]/10">
          <Check className="h-9 w-9 text-[#C79A4A]" strokeWidth={2.5} />
        </div>
        <h1 className="mt-7 text-2xl font-bold text-white">
          Agendamento confirmado
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/50">
          Sua reserva na {barbershopName} foi criada. Este comprovante contém
          os valores confirmados pela barbearia.
        </p>
      </div>

      <section className="relative z-10 mt-8 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] p-5">
        <div className="space-y-4">
          <SummaryRow
            icon={Scissors}
            label="Serviço"
            value={receipt.serviceName}
          />
          <SummaryRow
            icon={UserRound}
            label="Profissional"
            value={receipt.barberName}
          />
          <SummaryRow
            icon={Clock}
            label="Duração"
            value={`${receipt.serviceDurationMinutes + receipt.addOnDurationMinutes} min`}
          />
          <SummaryRow
            icon={CalendarDays}
            label="Data"
            value={formatReceiptDate(receipt.startAt)}
          />
          <SummaryRow
            icon={Clock}
            label="Horário"
            value={`${formatReceiptTime(receipt.startAt)}–${formatReceiptTime(receipt.endAt)}`}
            accent
          />
        </div>

        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          <MoneyRow
            label="Serviço"
            value={formatReceiptMoney(receipt.servicePrice)}
          />
          <MoneyRow
            label="Adicionais"
            value={formatReceiptMoney(receipt.addOnTotal)}
          />
          <MoneyRow
            label="Total do atendimento"
            value={formatReceiptMoney(receipt.attendanceTotal)}
          />
          <MoneyRow
            icon={Package}
            label="Produtos reservados"
            value={formatReceiptMoney(receipt.productSubtotal)}
          />
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-xs font-semibold text-white/60">
              Total a pagar na barbearia
            </span>
            <span className="text-xl font-bold text-[#C79A4A]">
              {formatReceiptMoney(receipt.totalAtShop)}
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onReset}
        className="relative z-10 mt-5 w-full rounded-lg border border-white/15 px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
      >
        Fazer outro agendamento
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
      <span className="flex items-center gap-2 text-xs text-white/40">
        <Icon className="h-4 w-4 text-[#C79A4A]" />
        {label}
      </span>
      <span
        className={`text-right text-sm font-semibold ${
          accent ? 'text-[#C79A4A]' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function MoneyRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Package
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-4 text-xs text-white/45">
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#C79A4A]" />}
        {label}
      </span>
      <span>{value}</span>
    </div>
  )
}
