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
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[#C79A4A] text-black font-bold hover:brightness-105 transition-all shadow-md shadow-[#C79A4A]/10": variant === "default",
            "bg-[#ba1a1a] text-white font-bold hover:opacity-90 transition-all": variant === "destructive",
            "border border-[#c8c5cb] bg-transparent text-[#181c21] hover:bg-[#eceef4] transition-all": variant === "outline",
            "bg-[#1b1b1e] text-white font-semibold hover:bg-neutral-900 transition-all": variant === "secondary",
            "text-[#181c21] hover:bg-[#eceef4] transition-colors": variant === "ghost",
            "text-[#C79A4A] underline-offset-4 hover:underline": variant === "link",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
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
