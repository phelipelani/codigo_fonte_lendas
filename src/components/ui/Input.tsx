// Arquivo: src/components/ui/Input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  leftIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, leftIcon, id, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <div
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#ff007f]"
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          id={id}
          className={cn(
            "flex h-12 w-full rounded-xl border bg-[#121218]/90 px-4 py-3 text-sm sm:text-base text-white placeholder:text-slate-500",
            "transition-all duration-200 outline-none",
            leftIcon ? "pl-11" : "pl-4",
            error
              ? "border-[#ff3366] focus:border-[#ff3366] focus:ring-2 focus:ring-[#ff3366]/30 shadow-[0_0_12px_rgba(255,51,102,0.25)]"
              : "border-white/10 hover:border-white/20 focus:border-[#ff007f] focus:ring-2 focus:ring-[#ff007f]/30 focus:shadow-[0_0_15px_rgba(255,0,127,0.2)]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#0d0d14]",
            className
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
