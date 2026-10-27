// Arquivo: src/components/ui/PasswordInput.tsx
import * as React from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Input, type InputProps } from "./Input"
import { cn } from "@/lib/utils"

export interface PasswordInputProps extends Omit<InputProps, "type" | "leftIcon"> {
  showIcon?: boolean
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showIcon = true, error, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const toggleVisibility = () => {
      setShowPassword((prev) => !prev)
    }

    return (
      <div className="relative w-full">
        <Input
          type={showPassword ? "text" : "password"}
          id={id}
          ref={ref}
          error={error}
          leftIcon={showIcon ? <Lock className="h-4 w-4" /> : undefined}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff007f]/50"
          aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
          tabIndex={0}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
