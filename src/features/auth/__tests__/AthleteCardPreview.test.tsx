import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AthleteCardPreview } from '../components/AthleteCardPreview'

describe('AthleteCardPreview Component', () => {
  it('deve renderizar os dados principais do atleta e atributos da carta', () => {
    render(
      <AthleteCardPreview
        name="NEYMAR AMADOR"
        position="MEIA ATACANTE"
        number="10"
        rating={96}
        stats={{
          games: 30,
          goals: 25,
          assists: 20,
          winRate: "85%",
        }}
      />
    )

    // Nome e atributos
    expect(screen.getByText('NEYMAR AMADOR')).toBeInTheDocument()
    expect(screen.getByText('MEIA ATACANTE')).toBeInTheDocument()
    expect(screen.getByText('#10')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()

    // Estatísticas
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('deve renderizar a carta colecionável com tags de autenticidade', () => {
    render(<AthleteCardPreview />)

    expect(screen.getByText('FUTLENDAS VERIFIED')).toBeInTheDocument()
    expect(screen.getByText('HOT STREAK')).toBeInTheDocument()
    expect(screen.getByText('CARTA LENDÁRIA')).toBeInTheDocument()
  })
})
