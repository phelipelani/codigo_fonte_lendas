// Arquivo: src/components/ui/Button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080c] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Variante Principal: Rosa Neon com Glow Cinematográfico
        neonPink:
          "bg-gradient-to-r from-[#ff007f] via-[#ff1493] to-[#ff2692] text-white shadow-[0_0_20px_rgba(255,0,127,0.45)] hover:shadow-[0_0_30px_rgba(255,0,127,0.7)] hover:brightness-110 focus-visible:ring-[#ff007f]",
        // Variante Secundária: Verde Neon
        neonGreen:
          "bg-gradient-to-r from-[#00ff88] via-[#10b981] to-[#26ff9d] text-[#08080c] shadow-[0_0_20px_rgba(0,255,136,0.45)] hover:shadow-[0_0_30px_rgba(0,255,136,0.7)] hover:brightness-110 focus-visible:ring-[#00ff88]",
        default:
          "bg-gradient-to-r from-[#ff007f] to-[#ff2692] text-white shadow-lg shadow-[#ff007f]/25 hover:shadow-xl hover:shadow-[#ff007f]/40 hover:brightness-110 focus-visible:ring-[#ff007f]",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg hover:shadow-red-500/30 focus-visible:ring-red-500",
        outline:
          "border-2 border-white/10 bg-[#121218]/80 backdrop-blur-sm text-white hover:border-[#ff007f]/50 hover:bg-[#181824] hover:shadow-[0_0_15px_rgba(255,0,127,0.25)] focus-visible:ring-[#ff007f]",
        secondary:
          "bg-[#1c1c28] text-white hover:bg-[#252536] border border-white/10 hover:border-white/20 focus-visible:ring-white/20",
        ghost:
          "text-slate-300 hover:text-white hover:bg-white/5 focus-visible:ring-white/20",
        link:
          "text-[#ff007f] underline-offset-4 hover:underline hover:text-[#ff2692] p-0 h-auto font-medium lowercase tracking-normal",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-xl px-8 text-base tracking-widest",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "neonPink",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2
            className="h-4 w-4 animate-spin text-current"
            aria-hidden="true"
          />
        )}
        {isLoading && loadingText ? loadingText : children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
