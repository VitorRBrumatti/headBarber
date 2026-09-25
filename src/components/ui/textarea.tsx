import * as React from 'react'
import { cn } from '@/lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-[#c9c3b9]/80 bg-white px-3 py-2 text-sm text-[#242321]',
          'ring-offset-background placeholder:text-[#8b8379] resize-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C79A4A] focus-visible:border-[#C79A4A]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
