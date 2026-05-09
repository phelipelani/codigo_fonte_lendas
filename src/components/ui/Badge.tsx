// Arquivo: src/components/ui/Badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accentPrimary focus:ring-offset-2 shadow-sm hover:shadow-md active:scale-95",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-accentPrimary to-accentPrimary/90 text-white hover:from-accentPrimary/90 hover:to-accentPrimary/80",
        secondary:
          "border-transparent bg-gradient-to-r from-accentSecondary to-accentSecondary/90 text-white hover:from-accentSecondary/90 hover:to-accentSecondary/80",
        destructive:
          "border-transparent bg-gradient-to-r from-danger to-danger/90 text-white hover:from-danger/90 hover:to-danger/80",
        outline: 
          "text-textPrimary border-borderLight bg-surface/50 hover:bg-surfaceElevated hover:border-accentPrimary/50",
        success:
          "border-transparent bg-gradient-to-r from-success to-success/90 text-white hover:from-success/90 hover:to-success/80",
        warning:
          "border-transparent bg-gradient-to-r from-warning to-warning/90 text-white hover:from-warning/90 hover:to-warning/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }