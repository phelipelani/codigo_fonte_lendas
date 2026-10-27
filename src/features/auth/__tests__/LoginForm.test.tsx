import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { LoginForm } from '../components/LoginForm'

const renderLoginForm = () => {
  return render(
    <BrowserRouter>
      <LoginForm />
    </BrowserRouter>
  )
}

describe('LoginForm Component', () => {
  it('deve renderizar os campos essenciais do formulário com acessibilidade', () => {
    renderLoginForm()

    // Labels e campos
    expect(screen.getByLabelText(/E-mail do Atleta/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha de Acesso/i)).toBeInTheDocument()

    // Links e Botão
    expect(screen.getByRole('button', { name: /ENTRAR NO JOGO/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Esqueceu a senha/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Crie sua lenda agora/i })).toBeInTheDocument()
  })

  it('deve alternar a visibilidade da senha ao clicar no botão de olho', () => {
    renderLoginForm()

    const passwordInput = screen.getByLabelText(/Senha de Acesso/i) as HTMLInputElement
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

    const submitBtn = screen.getByRole('button', { name: /ENTRAR NO JOGO/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('O e-mail é obrigatório')).toBeInTheDocument()
      expect(screen.getByText('A senha é obrigatória')).toBeInTheDocument()
    })
  })

  it('deve submeter credenciais válidas e exibir o status de estruturação da Fase 2', async () => {
    renderLoginForm()

    const emailInput = screen.getByLabelText(/E-mail do Atleta/i)
    const passwordInput = screen.getByLabelText(/Senha de Acesso/i)
    const submitBtn = screen.getByRole('button', { name: /ENTRAR NO JOGO/i })

    fireEvent.change(emailInput, { target: { value: 'camisa10@futlendas.com' } })
    fireEvent.change(passwordInput, { target: { value: 'senhaForte@123' } })
    fireEvent.click(submitBtn)

    await waitFor(
      () => {
        expect(
          screen.getByText(/Aviso de Engenharia: A API de autenticação do backend/i)
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })
})
