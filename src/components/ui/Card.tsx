// Arquivo: src/components/ui/Card.tsx — Game UI Cards
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Base: card escuro com borda sutil
      "relative rounded-xl text-textPrimary transition-all duration-300",
      "bg-[rgba(6,16,30,0.92)] border border-[rgba(0,195,255,0.13)]",
      "shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
      // Linha brilhante no topo (FIFA card style)
      "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:rounded-t-xl",
      "before:bg-gradient-to-r before:from-transparent before:via-[rgba(0,195,255,0.7)] before:to-transparent",
      // Hover: glow + lift
      "hover:border-[rgba(0,195,255,0.25)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(0,195,255,0.08)]",
      "hover:-translate-y-0.5",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-2 p-5 sm:p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-display font-bold uppercase tracking-wide leading-tight text-textPrimary",
      "text-xl sm:text-2xl",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm sm:text-base text-textMuted leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5 sm:p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-5 sm:p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
