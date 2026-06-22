'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  confirmVariant?: 'default' | 'destructive'
  loading?: boolean
}

export function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmVariant = 'default',
  loading = false,
}: DialogProps) {
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Dialog Box */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-xl bg-white border border-[#eceef4] text-[#181c21] shadow-2xl p-6',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        <h2 className="font-montserrat text-base font-bold text-[#181c21]">{title}</h2>
        {description && (
          <p className="mt-2 text-xs text-[#47464b] font-medium leading-normal">{description}</p>
        )}
        <div className="mt-6 flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading} className="cursor-pointer">
            Cancelar
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading} className="cursor-pointer">
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
