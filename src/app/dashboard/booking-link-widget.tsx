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
    <div className="bg-[#e6e8ef] rounded-2xl p-6 border border-[#c8c5cb]/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#C79A4A]/20 rounded-xl flex items-center justify-center text-[#C79A4A]">
          <span className="material-symbols-outlined font-fill-1 text-2xl">link</span>
        </div>
        <div>
          <h4 className="text-[#181c21] font-bold text-sm leading-tight">Link de agendamento</h4>
          <p className="text-[10px] text-[#47464b] font-semibold mt-0.5">Agendamento Online</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-[#c8c5cb]/30 flex items-center justify-between gap-3 group mb-4">
        <span className="truncate text-xs font-semibold text-[#47464b]">
          {getBookingUrl().replace(/^https?:\/\//, '')}
        </span>
        <button 
          onClick={handleCopy}
          className="p-2 text-[#47464b] hover:text-[#C79A4A] transition-all cursor-pointer flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-lg">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>

      <p className="text-[11px] text-[#47464b] mb-6 text-center italic font-medium leading-normal">
        &quot;Compartilhe no seu Instagram para aumentar as reservas&quot;
      </p>

      <button 
        onClick={handleShare}
        className="w-full py-3.5 bg-black hover:bg-neutral-900 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">share</span>
        Divulgar agora
      </button>
    </div>
  )
}
