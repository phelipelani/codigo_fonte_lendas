// Arquivo: src/components/ui/Button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold uppercase tracking-wide ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentPrimary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-r from-accentPrimary to-accentPrimary/90 text-white shadow-lg hover:shadow-xl hover:from-accentPrimary/90 hover:to-accentPrimary/80",
        destructive: 
          "bg-gradient-to-r from-danger to-danger/90 text-white shadow-lg hover:shadow-xl hover:from-danger/90 hover:to-danger/80",
        outline: 
          "border-2 border-border bg-surface text-textPrimary hover:bg-surfaceElevated hover:border-accentPrimary/50",
        secondary: 
          "bg-surfaceElevated text-textPrimary hover:bg-surfaceHover shadow-md hover:shadow-lg",
        ghost: 
          "hover:bg-surfaceElevated hover:text-textPrimary",
        link: 
          "text-accentPrimary underline-offset-4 hover:underline hover:text-accentPrimary/80",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
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