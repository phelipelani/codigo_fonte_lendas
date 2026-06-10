import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadFoto } from '../lib/api'

interface Adversario {
  id: number
  nome: string
  escudoUrl: string | null
}

export default function AdversariosPage() {
  const [lista, setLista] = useState<Adversario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [escudoUrl, setEscudoUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      setLista(await api.get<Adversario[]>('/campo/adversarios'))
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
    setNome('')
    setEscudoUrl('')
    setAberto(true)
  }
  function editar(a: Adversario) {
    setEditId(a.id)
    setNome(a.nome)
    setEscudoUrl(a.escudoUrl ?? '')
    setAberto(true)
  }

  async function onEscudo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviando(true)
    setErro('')
    try {
      setEscudoUrl(await uploadFoto(file))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar escudo.')
    } finally {
      setEnviando(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const payload = { nome, escudo_url: escudoUrl || null }
    try {
      if (editId) await api.put(`/campo/adversarios/${editId}`, payload)
      else await api.post('/campo/adversarios', payload)
      setAberto(false)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(a: Adversario) {
    if (!confirm(`Remover ${a.nome}?`)) return
    try {
      await api.del(`/campo/adversarios/${a.id}`)
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
          <h1 className="text-2xl font-extrabold">Adversários</h1>
        </div>
        <button onClick={novo} className="btn-primary text-sm">
          + Adversário
        </button>
      </header>

      {erro && (
        <div className="mb-3 rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="card p-8 text-center text-white/60">
          Nenhum adversário ainda. Toque em <b>+ Adversário</b>.
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((a) => (
            <li key={a.id} className="card flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/10">
                {a.escudoUrl ? (
                  <img src={a.escudoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-lg">🛡️</span>
                )}
              </div>
              <span className="flex-1 truncate font-bold">{a.nome}</span>
              <button onClick={() => editar(a)} className="btn-ghost px-3 py-1.5 text-sm">
                Editar
              </button>
              <button
                onClick={() => excluir(a)}
                className="btn px-3 py-1.5 text-sm text-red-300 hover:bg-campo-red/20"
              >
                ✕
              </button>
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
            <h2 className="mb-4 text-lg font-extrabold">
              {editId ? 'Editar adversário' : 'Novo adversário'}
            </h2>
            <form onSubmit={salvar} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-white/10">
                  {escudoUrl ? (
                    <img src={escudoUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-2xl">🛡️</span>
                  )}
                </div>
                <label className="btn-ghost cursor-pointer text-sm">
                  {enviando ? 'Enviando…' : 'Escolher escudo'}
                  <input type="file" accept="image/*" className="hidden" onChange={onEscudo} />
                </label>
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">Nome do time</label>
                <input
                  className="field"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                  required
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
