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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative ml-auto h-full w-full max-w-md bg-white text-[#181c21] border-l border-[#eceef4] shadow-2xl',
          'flex flex-col animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#eceef4] p-6">
          <div>
            {title && <h2 className="text-base font-montserrat font-bold text-[#181c21]">{title}</h2>}
            {description && <p className="mt-1 text-xs text-[#47464b] font-medium leading-normal">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[#47464b] hover:bg-[#eceef4] hover:text-black transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
