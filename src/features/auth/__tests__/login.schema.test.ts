import { describe, it, expect } from 'vitest'
import { loginSchema } from '../schemas/login.schema'

describe('loginSchema (Validação Zod)', () => {
  it('deve aprovar credenciais válidas com e-mail', () => {
    const validData = {
      login: 'craque@futlendas.com',
      password: 'senhaSegura123',
      rememberMe: true,
    }

    const result = loginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve aprovar credenciais válidas com username tradicional', () => {
    const validData = {
      login: 'admin',
      password: 'senhaValida123',
    }

    const result = loginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar campo de login vazio', () => {
    const invalidData = {
      login: '',
      password: 'senhaValida123',
    }

    const result = loginSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Informe seu usuário ou e-mail')
    }
  })

  it('deve rejeitar senha com menos de 6 caracteres', () => {
    const invalidData = {
      login: 'craque@futlendas.com',
      password: '12345',
    }

    const result = loginSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('A senha deve possuir no mínimo 6 caracteres')
    }
  })
})
