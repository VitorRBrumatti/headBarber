import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-[#e2ded7] pb-5 md:flex-row md:items-end md:justify-between", className)} {...props}>
      <div className="space-y-1">
        <h1 className="font-montserrat text-[25px] font-bold leading-tight tracking-tight text-[#242321]">{title}</h1>
        {description && <p className="text-sm text-[#625e58]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
