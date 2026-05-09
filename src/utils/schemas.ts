import { z } from 'zod';

// Schema atualizado: campo "login" aceita username ou email
export const LoginSchema = z.object({
  login: z.string().min(3, {
    message: 'Informe seu usuário ou email.',
  }),
  password: z.string().min(6, {
    message: 'Senha deve ter pelo menos 6 caracteres.',
  }),
});
