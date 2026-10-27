import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '../Button'

describe('Button Component', () => {
  it('deve renderizar com texto e variante padrão', () => {
    render(<Button>Entrar</Button>)
    const btn = screen.getByRole('button', { name: /Entrar/i })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
  })

  it('deve desabilitar o botão e apresentar estado acessível quando isLoading for verdadeiro', () => {
    render(<Button isLoading loadingText="CARREGANDO...">Entrar</Button>)
    const btn = screen.getByRole('button', { name: /CARREGANDO.../i })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
  })
})
