'use client'

import { useEffect, useRef } from 'react'
import { Check, Clock3 } from 'lucide-react'

export function BookingConfirming({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => onCompleteRef.current(), reducedMotion ? 450 : 3500)
    return () => window.clearTimeout(timer)
  }, [])

  return <main className="grid min-h-dvh place-items-center bg-[#0C0D0D] px-5 text-[#F6F2E9]">
    <div role="status" aria-live="polite" className="w-full max-w-sm text-center">
      <span className="sr-only">Reserva confirmada. Abrindo comprovante.</span>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#D6B475]">HeadBarber · Agendamento</p>
      <div aria-hidden="true" className="relative mx-auto mt-9 size-36">
        <div className="absolute inset-2 rounded-full border border-[#D7C29D]" />
        <div className="hb-confirm-check absolute inset-6 grid place-items-center rounded-full bg-[#30291D] text-[#D6B475]">
          <Check className="size-14" strokeWidth={2.1} />
        </div>
        <div className="hb-confirm-orbit absolute inset-0">
          <span className="absolute left-1/2 top-0 grid size-10 -translate-x-1/2 place-items-center rounded-full border border-[#C6A671] bg-[#191A19] text-[#D6B475] shadow-sm">
            <Clock3 className="size-5" strokeWidth={1.8} />
          </span>
        </div>
      </div>
      <h1 className="mt-8 font-montserrat text-[clamp(2rem,6vw,2.7rem)] font-semibold tracking-[-.05em]">Agendamento concluído</h1>
      <div className="relative mt-4 h-12 text-sm text-[#C1BCB2]">
        <p aria-hidden="true" className="hb-confirm-preparing absolute inset-x-0 top-0">Preparando seu comprovante...</p>
        <p aria-hidden="true" className="hb-confirm-ok absolute inset-x-0 top-0 font-montserrat text-2xl font-bold text-[#D6B475]">OK!</p>
      </div>
    </div>
  </main>
}
