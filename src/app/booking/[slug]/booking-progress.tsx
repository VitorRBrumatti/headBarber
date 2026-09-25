interface BookingProgressProps {
  steps: readonly { id: number; name: string }[]
  currentStep: number
}

export function BookingProgress({ steps, currentStep }: BookingProgressProps) {
  const progress = Math.min(100, Math.max(0, (currentStep / steps.length) * 100))
  return <div className="py-3">
    <div className="flex items-center justify-between gap-4 text-[11px]">
      <span className="font-semibold uppercase tracking-[.14em] text-[#D6A85B]">{String(currentStep).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span>
      <span className="text-[#DED8CF]">{steps[currentStep - 1]?.name}</span>
    </div>
    <div className="mt-2.5 h-[2px] bg-white/25" role="progressbar" aria-label="Progresso do agendamento" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep}>
      <div className="h-full bg-[#C79A4A] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
    </div>
  </div>
}
