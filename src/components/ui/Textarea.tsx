// Arquivo: src/components/ui/Textarea.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] sm:min-h-[150px] w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-sm sm:text-base text-textPrimary ring-offset-background",
          "placeholder:text-textMuted placeholder:font-normal",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentPrimary focus-visible:ring-offset-2 focus-visible:border-accentPrimary",
          "hover:border-borderLight",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surfaceElevated",
          "resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }