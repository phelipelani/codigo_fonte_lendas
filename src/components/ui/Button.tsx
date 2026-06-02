// Arquivo: src/components/ui/Button.tsx — Game UI Buttons
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap font-display font-bold uppercase tracking-wide",
    "ring-offset-background transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentPrimary focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-95 select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // Azul elétrico — ação principal
        default: [
          "relative overflow-hidden rounded-xl text-white",
          "bg-gradient-to-r from-[#00C3FF] to-[#0070E0]",
          "shadow-[0_4px_16px_rgba(0,195,255,0.35),0_2px_4px_rgba(0,0,0,0.3)]",
          "hover:shadow-[0_6px_24px_rgba(0,195,255,0.55),0_4px_8px_rgba(0,0,0,0.3)]",
          "hover:brightness-110",
          "border border-[#00C3FF]/30",
          // Linha brilhante no topo do botão
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/30",
        ].join(" "),

        // Dourado FIFA — destaque especial
        gold: [
          "relative overflow-hidden rounded-xl text-[#1a0e00]",
          "bg-gradient-to-r from-[#FFD700] to-[#FF8C00]",
          "shadow-[0_4px_16px_rgba(255,215,0,0.35),0_2px_4px_rgba(0,0,0,0.3)]",
          "hover:shadow-[0_6px_24px_rgba(255,215,0,0.55),0_4px_8px_rgba(0,0,0,0.3)]",
          "hover:brightness-110",
          "border border-[#FFD700]/40",
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/40",
        ].join(" "),

        // Destrutivo — perigo
        destructive: [
          "relative overflow-hidden rounded-xl text-white",
          "bg-gradient-to-r from-[#FF1744] to-[#D50000]",
          "shadow-[0_4px_16px_rgba(255,23,68,0.3),0_2px_4px_rgba(0,0,0,0.3)]",
          "hover:shadow-[0_6px_24px_rgba(255,23,68,0.5)]",
          "border border-[#FF1744]/30",
        ].join(" "),

        // Outline
        outline: [
          "rounded-xl border-2 border-accentPrimary/40 bg-transparent text-accentPrimary",
          "hover:bg-accentPrimary/10 hover:border-accentPrimary hover:shadow-glow-cyan",
        ].join(" "),

        // Secundário
        secondary: [
          "rounded-xl bg-surfaceElevated text-textPrimary",
          "border border-white/[0.08]",
          "hover:bg-surfaceHover hover:border-white/[0.12] hover:shadow-card",
        ].join(" "),

        // Ghost
        ghost: [
          "rounded-xl hover:bg-surfaceElevated hover:text-textPrimary",
          "text-textMuted",
        ].join(" "),

        // Link
        link: "text-accentPrimary underline-offset-4 hover:underline hover:text-accentPrimary/80 rounded-none",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-sm",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-13 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
