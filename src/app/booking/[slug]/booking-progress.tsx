import { Check } from 'lucide-react'

interface BookingProgressProps {
  steps: readonly { id: number; name: string }[]
  currentStep: number
}

export function BookingProgress({ steps, currentStep }: BookingProgressProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / steps.length) * 100))

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-4 sm:hidden">
        <div className="min-w-0">
          <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C79A4A]">
            Etapa {currentStep} de {steps.length}
          </p>
          <p className="mt-1 truncate font-montserrat text-sm font-semibold text-white">
            {steps[currentStep - 1]?.name}
          </p>
        </div>
        <div
          className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label="Progresso do agendamento"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={currentStep}
        >
          <div
            className="h-full rounded-full bg-[#C79A4A] transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ol
        className="hidden grid-cols-7 py-5 sm:grid"
        aria-label="Progresso do agendamento"
      >
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <li
              key={step.id}
              className="relative flex min-w-0 flex-col items-center text-center"
            >
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-4 h-px w-full ${
                    isCompleted ? 'bg-[#C79A4A]/50' : 'bg-white/10'
                  }`}
                />
              ) : null}
              <span
                aria-current={isActive ? 'step' : undefined}
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full border font-inter text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-[#C79A4A] bg-[#C79A4A] text-[#1A1A1D]'
                    : isCompleted
                      ? 'border-[#C79A4A]/60 bg-[#332A1D] text-[#C79A4A]'
                      : 'border-white/15 bg-[#1A1A1D] text-white/40'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  step.id
                )}
              </span>
              <span
                className={`mt-2 w-full truncate px-1 font-inter text-[9px] font-semibold uppercase tracking-[0.04em] lg:text-[10px] ${
                  isActive
                    ? 'text-[#C79A4A]'
                    : isCompleted
                      ? 'text-white/70'
                      : 'text-white/35'
                }`}
                title={step.name}
              >
                {step.name}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}
