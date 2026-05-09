// Arquivo: src/components/ui/Input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-border bg-surface px-4 py-2.5",
          "text-sm sm:text-base text-textPrimary font-medium",
          "ring-offset-background transition-all duration-200",
          "placeholder:text-textMuted placeholder:font-normal",
          "hover:border-borderLight",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentPrimary focus-visible:ring-offset-2 focus-visible:border-accentPrimary",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surfaceElevated",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-textPrimary",
          "file:mr-4 file:px-4 file:py-2 file:rounded-lg file:bg-surfaceElevated file:hover:bg-surfaceHover file:cursor-pointer file:transition-colors",
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