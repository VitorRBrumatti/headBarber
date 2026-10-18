import {
  ArrowLeft,
  FileText,
  CirclePlus,
  CalendarDays,
  Check,
  Clock,
  Package,
  Scissors,
  UserRound,
} from 'lucide-react'
import Link from 'next/link'
import styles from './receipt.module.css'
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
  const coverageLabel =
    receipt.subscriptionCoverageStatus === 'waiting'
      ? 'Aguardando disponibilidade'
      : receipt.subscriptionCoverageStatus === 'awaiting_cycle'
        ? 'Aguardando pagamento da assinatura'
        : receipt.subscriptionCoverageStatus === 'partial'
          ? 'Cobertura parcial'
          : receipt.subscriptionCoverageStatus === 'covered'
            ? 'Coberto pela assinatura'
            : null

  return (
    <main className={`${styles.success} relative flex min-h-dvh w-full flex-col items-center justify-center text-[#F6F2E9]`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(199,154,74,0.12),transparent_68%)]"
      />

      <div className={`${styles.successIntro} relative z-10`}>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[#B78635] bg-[#30291D]">
          <Check className="h-8 w-8 text-[#D6B475]" strokeWidth={2.5} />
        </div>
        <h1 className="mt-7 text-2xl font-bold text-[#F6F2E9]">
          Agendamento confirmado
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#C1BCB2]">
          Sua reserva na {barbershopName} foi criada. Este comprovante contém os
          valores confirmados pela barbearia.
        </p>
      </div>

      <section className={`${styles.receipt} relative z-10`}>
        <h2>Detalhes do agendamento</h2>
        <div>
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

        {(receipt.subscriptionPlanName || coverageLabel) && (
          <div className="mt-5 border-l-2 border-[#B78635] bg-[#30291D] px-3 py-2 text-left">
            <p className="text-xs font-bold text-[#D6B475]">
              {receipt.subscriptionPlanName
                ? `Assinatura ${receipt.subscriptionPlanName}`
                : 'Assinatura'}
            </p>
            {coverageLabel && (
              <p className="mt-1 text-xs text-[#C1BCB2]">{coverageLabel}</p>
            )}
          </div>
        )}

        <div className={styles.payment}>
          <h2>Resumo do pagamento</h2>
          <MoneyRow
            icon={FileText}
            label="Serviço"
            value={formatReceiptMoney(receipt.servicePrice)}
          />
          <MoneyRow
            icon={CirclePlus}
            label="Adicionais"
            value={formatReceiptMoney(receipt.addOnTotal)}
          />
          <MoneyRow
            label="Total do atendimento"
            value={formatReceiptMoney(receipt.attendanceTotal)}
          />
          <MoneyRow
            label="Coberto pela assinatura"
            value={`- ${formatReceiptMoney(receipt.subscriptionCoveredTotal)}`}
          />
          <MoneyRow
            label="A pagar pelo atendimento"
            value={formatReceiptMoney(receipt.amountDue)}
          />
          <MoneyRow
            icon={Package}
            label="Produtos reservados"
            value={formatReceiptMoney(receipt.productSubtotal)}
          />
          <div className={`${styles.total} flex justify-between gap-4`}>
            <span className="text-xs font-semibold text-[#C1BCB2]">
              Total a pagar na barbearia
            </span>
            <span className="text-xl font-bold text-[#D6B475]">
              {formatReceiptMoney(receipt.totalAtShop)}
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onReset}
        className={`${styles.receiptButton} ${styles.primary}`}
      >
        <CalendarDays aria-hidden="true" /> Fazer outro agendamento
      </button>
      <Link href="/" className={`${styles.receiptButton} ${styles.secondary}`}><ArrowLeft aria-hidden="true" />Voltar para o início</Link>
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
      <span className="flex items-center gap-2 text-xs text-[#C1BCB2]">
        <Icon className="h-4 w-4 text-[#C79A4A]" />
        {label}
      </span>
      <span
        className={`text-right text-sm font-semibold ${
          accent ? 'text-[#D6B475]' : 'text-[#F6F2E9]'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function MoneyRow({
  icon: Icon = FileText,
  label,
  value,
}: {
  icon?: typeof Package
  label: string
  value: string
}) {
  return (
    <div className="flex justify-between gap-4 text-xs text-[#C1BCB2]">
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#C79A4A]" />}
        {label}
      </span>
      <span>{value}</span>
    </div>
  )
}
