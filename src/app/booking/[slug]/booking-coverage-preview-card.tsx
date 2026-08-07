import type { BookingCoveragePreview } from './booking-types'
import { formatCurrency } from './booking-utils'

export function hasEligibleSubscriptionPreview(
  preview: BookingCoveragePreview | null,
) {
  return Boolean(preview && preview.subscriptionCoverageStatus !== 'none')
}

export function BookingCoveragePreviewCard({
  preview,
}: {
  preview: BookingCoveragePreview | null
}) {
  if (!hasEligibleSubscriptionPreview(preview) || !preview) return null

  const coverageLabel =
    preview.subscriptionCoverageStatus === 'waiting'
      ? 'Aguardando disponibilidade'
      : preview.subscriptionCoverageStatus === 'awaiting_cycle'
        ? 'Aguardando pagamento'
        : 'Benefício disponível'

  return (
    <div className="rounded-xl border border-[#C79A4A]/25 bg-[#C79A4A]/10 p-3">
      <div className="flex justify-between text-sm font-semibold text-[#C79A4A]">
        <span>
          {preview.subscriptionPlanName
            ? `Assinatura ${preview.subscriptionPlanName}`
            : 'Assinatura'}
        </span>
        <span>{coverageLabel}</span>
      </div>
      <div className="mt-2 flex justify-between text-sm text-emerald-300">
        <span>Coberto</span>
        <span>
          - {formatCurrency(Number(preview.subscriptionCoveredTotal))}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-sm font-semibold">
        <span>A pagar</span>
        <span>{formatCurrency(Number(preview.amountDue))}</span>
      </div>
    </div>
  )
}
