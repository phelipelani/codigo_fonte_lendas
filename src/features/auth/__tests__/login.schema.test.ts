import { describe, it, expect } from 'vitest'
import { loginSchema } from '../schemas/login.schema'

describe('loginSchema (Validação Zod)', () => {
  it('deve aprovar credenciais válidas', () => {
    const validData = {
      email: 'craque@futlendas.com',
      password: 'senhaSegura123',
      rememberMe: true,
    }

    const result = loginSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('deve rejeitar e-mail em formato inválido', () => {
    const invalidData = {
      email: 'email_sem_arroba.com',
      password: 'senhaValida123',
    }

    const result = loginSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Informe um endereço de e-mail válido')
    }
  })

  it('deve rejeitar e-mail vazio', () => {
    const invalidData = {
      email: '',
      password: 'senhaValida123',
    }

    const result = loginSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('deve rejeitar senha com menos de 6 caracteres', () => {
    const invalidData = {
      email: 'craque@futlendas.com',
      password: '12345',
    }

    const result = loginSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('A senha deve possuir no mínimo 6 caracteres')
    }
  })
})
