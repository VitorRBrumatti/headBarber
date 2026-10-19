import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[5px] border border-[#c8c1b7] bg-white px-3 py-2 text-sm text-[#242321] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#77716a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#9a6c23] disabled:cursor-not-allowed disabled:bg-[#f0eeea] disabled:text-[#77716a]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
