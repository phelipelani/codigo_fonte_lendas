import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'

interface Partida {
  id: number
  dataHora: string | null
  local: string
  localNome: string | null
  localBairro: string | null
  status: string
  adversarioNome: string | null
}

export default function CapturaPage() {
  const { id } = useParams()
  const [partida, setPartida] = useState<Partida | null>(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Partida>(`/campo/partidas/${id}`)
      .then(setPartida)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar partida.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <Layout active="partidas" title="Anotar partida">
      <div className="max-w-2xl">
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : partida ? (
        <>
          <div className="card mb-4 p-4">
            <div className="text-lg font-bold">
              Caraguatas <span className="text-white/40">x</span> {partida.adversarioNome ?? 'A definir'}
            </div>
            {partida.localNome && (
              <div className="mt-1 text-sm text-white/60">
                📍 {partida.localNome}
                {partida.localBairro ? ` — ${partida.localBairro}` : ''}
              </div>
            )}
          </div>

          <div className="card p-6 text-center text-white/70">
            <div className="mb-2 text-4xl">⚽</div>
            <p className="font-bold text-white">Tela de captura ao vivo</p>
            <p className="mt-1 text-sm">
              Próximo passo: escalar os 11 e abrir o grid de anotação (passes, chutes,
              desarmes…), com placar e estatísticas ao vivo, e salvar tudo ao encerrar.
            </p>
          </div>
        </>
      ) : null}
      </div>
    </Layout>
  )
}
