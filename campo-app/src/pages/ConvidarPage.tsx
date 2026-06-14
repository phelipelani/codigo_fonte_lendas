import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../lib/api'
import Layout from '../components/Layout'

interface Jogador {
  id: number
  nome: string
  posicao: string
}

export default function ConvidarPage() {
  const [papel, setPapel] = useState('jogador')
  const [jogadorId, setJogadorId] = useState('')
  const [email, setEmail] = useState('')
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [link, setLink] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    api.get<Jogador[]>('/campo/jogadores').then(setJogadores).catch(() => {})
  }, [])

  async function gerar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setLink('')
    setBusy(true)
    try {
      const r = await api.post<{ link: string }>('/campo/convites', {
        papel,
        jogador_id: papel === 'jogador' ? jogadorId || null : null,
        email: email || null,
      })
      setLink(r.link)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao gerar convite.')
    } finally {
      setBusy(false)
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <Layout active="" title="Convidar">
      <div className="max-w-md">
      <form onSubmit={gerar} className="card space-y-3 p-5">
        <div>
          <label className="mb-1 block text-sm text-white/70">Papel</label>
          <select className="field" value={papel} onChange={(e) => setPapel(e.target.value)}>
            <option value="jogador">Jogador</option>
            <option value="tecnico">Técnico</option>
            <option value="diretor">Diretor</option>
          </select>
        </div>

        {papel === 'jogador' && (
          <div>
            <label className="mb-1 block text-sm text-white/70">Vincular ao jogador (opcional)</label>
            <select className="field" value={jogadorId} onChange={(e) => setJogadorId(e.target.value)}>
              <option value="">— Não vincular —</option>
              {jogadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nome} ({j.posicao})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-white/70">E-mail (opcional)</label>
          <input
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Pré-preenche no convite"
          />
        </div>

        {erro && <div className="rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Gerando…' : 'Gerar link de convite'}
        </button>
      </form>

      {link && (
        <div className="card mt-4 p-4">
          <p className="mb-2 text-sm text-white/70">
            Envie este link para a pessoa (válido por 7 dias):
          </p>
          <div className="flex items-center gap-2">
            <input className="field flex-1 text-xs" value={link} readOnly onFocus={(e) => e.target.select()} />
            <button onClick={copiar} className="btn-primary px-3 py-2 text-sm">
              {copiado ? '✓' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}
