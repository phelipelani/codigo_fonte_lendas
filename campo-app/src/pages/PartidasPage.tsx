import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

interface Adversario {
  id: number
  nome: string
  escudoUrl: string | null
}

interface Partida {
  id: number
  dataHora: string | null
  local: 'casa' | 'fora' | 'neutro'
  localNome: string | null
  localBairro: string | null
  competicao: string | null
  status: 'agendada' | 'ao_vivo' | 'finalizada'
  placarNos: number
  placarEles: number
  adversarioId: number | null
  adversarioNome: string | null
}

const LOCAL_LABEL: Record<string, string> = { casa: 'Casa', fora: 'Fora', neutro: 'Neutro' }
const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada',
  ao_vivo: 'Ao vivo',
  finalizada: 'Finalizada',
}
const STATUS_COR: Record<string, string> = {
  agendada: 'bg-white/15 text-white/80',
  ao_vivo: 'bg-campo-red/30 text-red-200',
  finalizada: 'bg-campo-green/30 text-green-200',
}

type Form = {
  adversarioId: string
  dataHora: string
  local: string
  localNome: string
  localBairro: string
  competicao: string
}
const FORM_VAZIO: Form = {
  adversarioId: '',
  dataHora: '',
  local: 'casa',
  localNome: '',
  localBairro: '',
  competicao: '',
}

function fmtData(dh: string | null): string {
  if (!dh) return 'Data a definir'
  const d = new Date(dh.replace(' ', 'T'))
  if (isNaN(d.getTime())) return dh
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function toInput(dh: string | null): string {
  if (!dh) return ''
  return dh.replace(' ', 'T').slice(0, 16)
}

export default function PartidasPage() {
  const [lista, setLista] = useState<Partida[]>([])
  const [adversarios, setAdversarios] = useState<Adversario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const navigate = useNavigate()

  async function carregar() {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([
        api.get<Partida[]>('/campo/partidas'),
        api.get<Adversario[]>('/campo/adversarios'),
      ])
      setLista(p)
      setAdversarios(a)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function novo() {
    setEditId(null)
    setForm(FORM_VAZIO)
    setAberto(true)
  }
  function editar(p: Partida) {
    setEditId(p.id)
    setForm({
      adversarioId: p.adversarioId?.toString() ?? '',
      dataHora: toInput(p.dataHora),
      local: p.local,
      localNome: p.localNome ?? '',
      localBairro: p.localBairro ?? '',
      competicao: p.competicao ?? '',
    })
    setAberto(true)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const payload = {
      adversario_id: form.adversarioId || null,
      data_hora: form.dataHora || null,
      local: form.local,
      local_nome: form.localNome || null,
      local_bairro: form.localBairro || null,
      competicao: form.competicao || null,
    }
    try {
      if (editId) await api.put(`/campo/partidas/${editId}`, payload)
      else await api.post('/campo/partidas', payload)
      setAberto(false)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(p: Partida) {
    if (!confirm('Remover esta partida?')) return
    try {
      await api.del(`/campo/partidas/${p.id}`)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-ghost px-3 py-1.5 text-sm">
            ←
          </Link>
          <h1 className="text-2xl font-extrabold">Partidas</h1>
        </div>
        <button onClick={novo} className="btn-primary text-sm">
          + Partida
        </button>
      </header>

      {erro && (
        <div className="mb-3 rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="card p-8 text-center text-white/60">
          Nenhuma partida ainda. Toque em <b>+ Partida</b>.
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((p) => (
            <li key={p.id} className="card p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">
                      Caraguatas <span className="text-white/40">x</span>{' '}
                      {p.adversarioNome ?? 'A definir'}
                    </span>
                    {p.status === 'finalizada' && (
                      <span className="text-sm font-bold text-campo-accent">
                        {p.placarNos}–{p.placarEles}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span>{fmtData(p.dataHora)}</span>
                    <span>· {LOCAL_LABEL[p.local]}</span>
                    {p.localNome && (
                      <span>
                        · 📍 {p.localNome}
                        {p.localBairro ? ` — ${p.localBairro}` : ''}
                      </span>
                    )}
                    {p.competicao && <span>· {p.competicao}</span>}
                  </div>
                </div>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${STATUS_COR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {p.status !== 'finalizada' && (
                  <button
                    onClick={() => navigate(`/partidas/${p.id}/anotar`)}
                    className="btn-primary px-3 py-1 text-sm"
                  >
                    {p.status === 'ao_vivo' ? '● Continuar' : '▶ Anotar'}
                  </button>
                )}
                {p.status === 'finalizada' && (
                  <button
                    onClick={() => navigate(`/partidas/${p.id}/relatorio`)}
                    className="btn-ghost px-3 py-1 text-sm"
                  >
                    📊 Relatório
                  </button>
                )}
                <div className="flex-1" />
                <button onClick={() => editar(p)} className="btn-ghost px-3 py-1 text-sm">
                  Editar
                </button>
                <button
                  onClick={() => excluir(p)}
                  className="btn px-3 py-1 text-sm text-red-300 hover:bg-campo-red/20"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="card w-full max-w-md rounded-b-none p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-extrabold">{editId ? 'Editar partida' : 'Nova partida'}</h2>
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-white/70">Adversário</label>
                <select
                  className="field"
                  value={form.adversarioId}
                  onChange={(e) => setForm({ ...form, adversarioId: e.target.value })}
                >
                  <option value="">A definir</option>
                  {adversarios.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
                {adversarios.length === 0 && (
                  <p className="mt-1 text-xs text-white/50">
                    Dica: cadastre adversários na tela Adversários.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Data e hora</label>
                <input
                  type="datetime-local"
                  className="field"
                  value={form.dataHora}
                  onChange={(e) => setForm({ ...form, dataHora: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Mando</label>
                <select
                  className="field"
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                >
                  <option value="casa">Casa</option>
                  <option value="fora">Fora</option>
                  <option value="neutro">Neutro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Nome do campo</label>
                  <input
                    className="field"
                    value={form.localNome}
                    onChange={(e) => setForm({ ...form, localNome: e.target.value })}
                    placeholder="Ex: Arena Litoral"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Bairro</label>
                  <input
                    className="field"
                    value={form.localBairro}
                    onChange={(e) => setForm({ ...form, localBairro: e.target.value })}
                    placeholder="Ex: Centro"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Competição (opcional)</label>
                <input
                  className="field"
                  value={form.competicao}
                  onChange={(e) => setForm({ ...form, competicao: e.target.value })}
                  placeholder="Ex: Amistoso, Copa..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAberto(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
