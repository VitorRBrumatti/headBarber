'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
}

export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  // Fechar com Escape
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Bloquear scroll do body quando aberto
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative ml-auto h-full w-full max-w-md border-l border-[#e2ded7] bg-white text-[#242321] shadow-lg',
          'flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e2ded7] p-5">
          <div>
            {title && <h2 className="text-base font-montserrat font-bold text-[#242321]">{title}</h2>}
            {description && <p className="mt-1 text-xs text-[#625f59] font-medium leading-normal">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex min-h-10 min-w-10 items-center justify-center rounded text-[#625f59] transition-colors hover:bg-[#f4f1ec] hover:text-black focus-visible:outline-2 focus-visible:outline-[#8a641f]"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
