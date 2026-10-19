import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center border-t border-[#e2ded7] px-6 py-10 text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mx-auto flex h-9 w-9 items-center justify-center text-[#77716a]">
          {icon}
        </div>
      )}
      <h3 className="mt-2 text-sm font-semibold text-[#242321]">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs text-[#625e58]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
