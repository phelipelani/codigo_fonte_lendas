// Arquivo: src/features/auth/schemas/login.schema.ts
import { z } from "zod"

export const loginSchema = z.object({
  login: z
    .string()
    .min(1, "Informe seu usuário ou e-mail")
    .min(3, "Mínimo de 3 caracteres"),
  password: z
    .string()
    .min(1, "A senha é obrigatória")
    .min(6, "A senha deve possuir no mínimo 6 caracteres"),
  rememberMe: z.boolean().default(false),
})

export type LoginFormData = z.infer<typeof loginSchema>
