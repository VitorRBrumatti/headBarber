import { Check } from 'lucide-react'

interface BookingProgressProps {
  steps: readonly { id: number; name: string }[]
  currentStep: number
}

export function BookingProgress({ steps, currentStep }: BookingProgressProps) {
  return (
    <>
      <div className="mb-8 flex items-center justify-between border-b border-white/10 bg-[#1A1A1D] px-1 pb-4 sm:hidden">
        <div>
          <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C79A4A]">
            Etapa {currentStep} de {steps.length}
          </p>
          <p className="mt-1 font-montserrat text-base font-semibold text-white">
            {steps[currentStep - 1]?.name}
          </p>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#C79A4A] transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mb-10 hidden items-start sm:flex" aria-label="Progresso do agendamento">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start last:flex-none">
              <div className="flex min-w-[58px] flex-col items-center text-center">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={`grid h-8 w-8 place-items-center rounded-full border font-inter text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-[#C79A4A] bg-[#C79A4A] text-[#1A1A1D]'
                      : isCompleted
                        ? 'border-[#C79A4A]/60 bg-[#C79A4A]/10 text-[#C79A4A]'
                        : 'border-white/15 bg-[#1A1A1D] text-white/40'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" strokeWidth={2.5} /> : step.id}
                </span>
                <span
                  className={`mt-2 max-w-[88px] font-inter text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isActive ? 'text-[#C79A4A]' : isCompleted ? 'text-white/70' : 'text-white/35'
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mt-4 h-px flex-1 ${isCompleted ? 'bg-[#C79A4A]/50' : 'bg-white/10'}`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </>
  )
}
