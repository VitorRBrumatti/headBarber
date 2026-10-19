'use client'

import { useState } from 'react'

interface BookingLinkWidgetProps {
  slug: string
}

export function BookingLinkWidget({ slug }: BookingLinkWidgetProps) {
  const [copied, setCopied] = useState(false)

  // Construct absolute URL dynamically on client side, fallback to headbarber.com
  const getBookingUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/booking/${slug}`
    }
    return `headbarber.com/booking/${slug}`
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getBookingUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleShare = async () => {
    const url = getBookingUrl()
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Agende seu corte na HeadBarber',
          text: 'Agende seu horário online no meu perfil do HeadBarber!',
          url: url,
        })
      } catch (err) {
        console.error('Error sharing: ', err)
      }
    } else {
      // Fallback: Copy link
      handleCopy()
    }
  }

  return (
    <div className="rounded-md border border-[#e2ded7] bg-white px-5 py-4">
      <h2 className="text-sm font-bold text-[#242321]">Agendamento online</h2>
      <p className="mt-1 text-xs text-[#69655f]">Link para seus clientes reservarem um horário.</p>

      <div className="mt-4 flex min-w-0 items-center justify-between gap-2 rounded-[5px] border border-[#e2ded7] bg-[#f8f7f5] pl-3">
        <span className="truncate font-mono text-[11px] text-[#403c37]">
          {getBookingUrl().replace(/^https?:\/\//, '')}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Link copiado' : 'Copiar link de agendamento'}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-r-[5px] px-3 text-xs font-semibold text-[#72511f] hover:bg-[#f0ebe3]"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[5px] border border-[#d3cec5] text-xs font-semibold text-[#403c37] hover:bg-[#f4f1ec]"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">share</span>
        Divulgar agora
      </button>
    </div>
  )
}
