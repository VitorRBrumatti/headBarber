import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[5px] text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a6c23] disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#C79A4A] text-[#171614] hover:bg-[#d6aa5b]": variant === "default",
            "bg-[#ba1a1a] text-white font-bold hover:opacity-90 transition-all": variant === "destructive",
            "border border-[#c8c1b7] bg-white text-[#242321] hover:bg-[#f4f1ec]": variant === "outline",
            "bg-[#1b1b1e] text-white font-semibold hover:bg-neutral-900 transition-all": variant === "secondary",
            "text-[#242321] hover:bg-[#e8e4de] transition-colors": variant === "ghost",
            "text-[#C79A4A] underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-11 px-6": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
