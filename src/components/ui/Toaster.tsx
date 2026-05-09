// Arquivo: src/components/ui/Toaster.tsx
"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-textPrimary group-[.toaster]:border-2 group-[.toaster]:border-borderLight group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4",
          description: "group-[.toast]:text-textMuted group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-accentPrimary group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-semibold group-[.toast]:transition-all group-[.toast]:hover:bg-accentPrimary/90 group-[.toast]:active:scale-95",
          cancelButton:
            "group-[.toast]:bg-surfaceElevated group-[.toast]:text-textMuted group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-semibold group-[.toast]:transition-all group-[.toast]:hover:bg-surfaceHover group-[.toast]:active:scale-95",
          success:
            "group-[.toast]:border-green-500/50 group-[.toast]:bg-green-500/10",
          error:
            "group-[.toast]:border-red-500/50 group-[.toast]:bg-red-500/10",
          warning:
            "group-[.toast]:border-amber-500/50 group-[.toast]:bg-amber-500/10",
          info:
            "group-[.toast]:border-blue-500/50 group-[.toast]:bg-blue-500/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }