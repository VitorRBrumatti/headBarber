'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'onChange' | 'type'> {
  className?: string
  onCheckedChange?: (checked: boolean) => void
}

export function Switch({
  checked = false,
  className,
  disabled,
  onCheckedChange,
  ...props
}: SwitchProps) {
  return (
    <span
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <input
        {...props}
        type="checkbox"
        role="switch"
        aria-checked={Boolean(checked)}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 rounded-full bg-[#d8dae0] transition-colors duration-200 ease-out after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 after:ease-out after:content-[''] peer-checked:bg-[#7c5809] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#C79A4A] peer-focus-visible:ring-offset-2 peer-disabled:opacity-50 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </span>
  )
}
