import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, uploadFoto } from '../lib/api'

interface Jogador {
  id: number
  nome: string
  numero: number | null
  posicao: string
  tipo: 'atk' | 'mid' | 'def' | 'gk'
  pe: string | null
  fotoUrl: string | null
  titularPadrao: boolean
  ativo: boolean
}

const POSICOES = ['GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MEI', 'ATA']
const TIPO_LABEL: Record<string, string> = { gk: 'Goleiro', def: 'Defesa', mid: 'Meio', atk: 'Ataque' }
const TIPO_COR: Record<string, string> = {
  gk: 'bg-yellow-700',
  def: 'bg-blue-700',
  mid: 'bg-green-700',
  atk: 'bg-red-700',
}

type Form = {
  nome: string
  numero: string
  posicao: string
  pe: string
  fotoUrl: string
  titularPadrao: boolean
}

const FORM_VAZIO: Form = { nome: '', numero: '', posicao: 'MEI', pe: '', fotoUrl: '', titularPadrao: false }

export default function ElencoPage() {
  const [lista, setLista] = useState<Jogador[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [aberto, setAberto] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      setLista(await api.get<Jogador[]>('/campo/jogadores'))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar elenco.')
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

  function editar(j: Jogador) {
    setEditId(j.id)
    setForm({
      nome: j.nome,
      numero: j.numero?.toString() ?? '',
      posicao: j.posicao,
      pe: j.pe ?? '',
      fotoUrl: j.fotoUrl ?? '',
      titularPadrao: j.titularPadrao,
    })
    setAberto(true)
  }

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setEnviandoFoto(true)
    setErro('')
    try {
      const url = await uploadFoto(file)
      setForm((f) => ({ ...f, fotoUrl: url }))
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')
    const payload = {
      nome: form.nome,
      numero: form.numero,
      posicao: form.posicao,
      pe: form.pe || null,
      foto_url: form.fotoUrl || null,
      titular_padrao: form.titularPadrao,
    }
    try {
      if (editId) await api.put(`/campo/jogadores/${editId}`, payload)
      else await api.post('/campo/jogadores', payload)
      setAberto(false)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(j: Jogador) {
    if (!confirm(`Remover ${j.nome} do elenco?`)) return
    try {
      await api.del(`/campo/jogadores/${j.id}`)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  function iniciais(nome: string) {
    return nome
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-ghost px-3 py-1.5 text-sm">
            ←
          </Link>
          <h1 className="text-2xl font-extrabold">Elenco</h1>
        </div>
        <button onClick={novo} className="btn-primary text-sm">
          + Jogador
        </button>
      </header>

      {erro && (
        <div className="mb-3 rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="card p-8 text-center text-white/60">
          Nenhum jogador ainda. Toque em <b>+ Jogador</b> para começar.
        </div>
      ) : (
        <ul className="space-y-2">
          {lista.map((j) => (
            <li key={j.id} className="card flex items-center gap-3 p-3">
              <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
                {j.fotoUrl ? (
                  <img src={j.fotoUrl} alt={j.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/70">
                    {iniciais(j.nome)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-bold">{j.nome}</span>
                  {j.numero != null && <span className="text-sm text-white/50">#{j.numero}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <span className={`rounded px-1.5 py-0.5 font-bold text-white ${TIPO_COR[j.tipo]}`}>
                    {j.posicao}
                  </span>
                  <span>{TIPO_LABEL[j.tipo]}</span>
                  {j.titularPadrao && <span className="text-campo-accent">Titular</span>}
                </div>
              </div>
              <button onClick={() => editar(j)} className="btn-ghost px-3 py-1.5 text-sm">
                Editar
              </button>
              <button
                onClick={() => excluir(j)}
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
              {editId ? 'Editar jogador' : 'Novo jogador'}
            </h2>

            <form onSubmit={salvar} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
                  {form.fotoUrl ? (
                    <img src={form.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                      foto
                    </div>
                  )}
                </div>
                <label className="btn-ghost cursor-pointer text-sm">
                  {enviandoFoto ? 'Enviando…' : 'Escolher foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Nome</label>
                <input
                  className="field"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Número</label>
                  <input
                    type="number"
                    className="field"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Posição</label>
                  <select
                    className="field"
                    value={form.posicao}
                    onChange={(e) => setForm({ ...form, posicao: e.target.value })}
                  >
                    {POSICOES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Pé</label>
                  <select
                    className="field"
                    value={form.pe}
                    onChange={(e) => setForm({ ...form, pe: e.target.value })}
                  >
                    <option value="">—</option>
                    <option value="D">Direito</option>
                    <option value="E">Esquerdo</option>
                    <option value="Ambi">Ambidestro</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 pb-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.titularPadrao}
                    onChange={(e) => setForm({ ...form, titularPadrao: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Titular padrão
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="btn-ghost flex-1"
                >
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
