import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { BookingCoveragePreview } from './booking-types'

interface BookingSummaryBarProps {
  currentStep: number
  totalSteps: number
  isSubmitting: boolean
  canContinue: boolean
  serviceSubtotal: number
  productSubtotal: number
  total: number
  coveragePreview: BookingCoveragePreview | null
  onBack: () => void
  onNext: () => void
  onConfirm: () => void
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value,
  )

export function BookingSummaryBar({
  currentStep,
  totalSteps,
  isSubmitting,
  canContinue,
  serviceSubtotal,
  productSubtotal,
  total,
  coveragePreview,
  onBack,
  onNext,
  onConfirm,
}: BookingSummaryBarProps) {
  const isFinalStep = currentStep === totalSteps

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDD7CD] bg-white shadow-[0_-8px_24px_rgba(36,35,33,0.08)]">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="grid h-11 w-11 shrink-0 place-items-center border border-[#D9D4CB] text-[#242321] transition-colors hover:bg-[#F6F5F2] disabled:opacity-40 sm:w-auto sm:px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2 sm:font-inter sm:text-xs sm:font-semibold sm:uppercase sm:tracking-[0.08em]">
              Voltar
            </span>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.1em] text-[#625F59]">
            {productSubtotal > 0
              ? 'Total a pagar na barbearia'
              : 'Total do atendimento'}
          </p>
          <p className="mt-0.5 truncate font-montserrat text-lg font-bold text-[#242321]">
            {formatCurrency(total)}
          </p>
          {coveragePreview &&
            Number(coveragePreview.subscriptionCoveredTotal) > 0 && (
              <p className="font-inter text-[10px] text-emerald-300/80">
                Coberto{' '}
                {formatCurrency(
                  Number(coveragePreview.subscriptionCoveredTotal),
                )}{' '}
                · A pagar {formatCurrency(Number(coveragePreview.amountDue))}
              </p>
            )}
          {productSubtotal > 0 && (
              <p className="hidden font-inter text-[10px] text-[#625F59] sm:block">
              Atendimento {formatCurrency(serviceSubtotal)} · Produtos{' '}
              {formatCurrency(productSubtotal)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={isFinalStep ? onConfirm : onNext}
          disabled={isSubmitting || !canContinue}
          className="flex min-h-11 shrink-0 items-center justify-center gap-2 bg-[#B78635] px-5 font-inter text-xs font-bold uppercase tracking-[0.07em] text-[#211B12] transition-colors hover:bg-[#C79A4A] disabled:cursor-not-allowed disabled:opacity-40 sm:px-7"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1A1D]/30 border-t-[#1A1A1D] motion-reduce:animate-none" />
              Confirmando
            </>
          ) : isFinalStep ? (
            <>
              <Check className="h-4 w-4" />
              Confirmar
            </>
          ) : (
            <>
              Avançar
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
