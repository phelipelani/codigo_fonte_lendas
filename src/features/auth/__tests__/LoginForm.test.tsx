import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import { LoginForm } from '../components/LoginForm'

let queryClient: QueryClient

const renderLoginForm = () => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('LoginForm Component', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  it('deve renderizar os campos essenciais do formulário com acessibilidade', () => {
    renderLoginForm()

    // Labels e campos
    expect(screen.getByLabelText(/E-mail ou Usuário/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Senha$/i)).toBeInTheDocument()

    // Botões
    expect(screen.getByRole('button', { name: /^ENTRAR$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar com Google/i })).toBeInTheDocument()

    // Links
    expect(screen.getByRole('link', { name: /Esqueci minha senha/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Criar conta/i })).toBeInTheDocument()
  })

  it('deve alternar a visibilidade da senha ao clicar no botão de olho', () => {
    renderLoginForm()

    const passwordInput = screen.getByLabelText(/^Senha$/i) as HTMLInputElement
    const toggleButton = screen.getByRole('button', { name: /Exibir senha/i })

    expect(passwordInput.type).toBe('password')

    fireEvent.click(toggleButton)
    expect(passwordInput.type).toBe('text')
    expect(screen.getByRole('button', { name: /Ocultar senha/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Ocultar senha/i }))
    expect(passwordInput.type).toBe('password')
  })

  it('deve exibir mensagens de erro ao submeter campos vazios', async () => {
    renderLoginForm()

    const submitBtn = screen.getByRole('button', { name: /^ENTRAR$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Informe seu usuário ou e-mail')).toBeInTheDocument()
      expect(screen.getByText('A senha é obrigatória')).toBeInTheDocument()
    })
  })
})
