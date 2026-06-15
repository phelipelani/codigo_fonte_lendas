import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, uploadFoto } from '../lib/api'
import Layout from '../components/Layout'

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
const POS_LABEL: Record<string, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LD: 'Lateral Dir.',
  LE: 'Lateral Esq.',
  VOL: 'Volante',
  MEI: 'Meia',
  ATA: 'Atacante',
}
const POS_COR: Record<string, string> = {
  GOL: 'text-purple-300 border-purple-400/40 bg-purple-500/10',
  ZAG: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10',
  LD: 'text-sky-300 border-sky-400/40 bg-sky-500/10',
  LE: 'text-sky-300 border-sky-400/40 bg-sky-500/10',
  VOL: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
  MEI: 'text-amber-300 border-amber-400/40 bg-amber-500/10',
  ATA: 'text-red-300 border-red-400/40 bg-red-500/10',
}
const PE_LABEL: Record<string, string> = { D: 'Direito', E: 'Esquerdo', Ambi: 'Ambidestro' }

function Foot() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-night-cyan" fill="currentColor" aria-hidden>
      <path d="M8.5 2c1.4 0 2.5 1.6 2.5 4s-1.1 4-2.5 4S6 8.4 6 6s1.1-4 2.5-4Zm5 1c1 0 1.8 1.2 1.8 2.8S14.5 8.6 13.5 8.6 11.7 7.4 11.7 5.8 12.5 3 13.5 3Zm3.6 1.4c.8 0 1.4 1 1.4 2.2s-.6 2.2-1.4 2.2-1.4-1-1.4-2.2.6-2.2 1.4-2.2ZM7 12c3 0 4 1.4 7 1.4 1.7 0 3 1 3 2.7 0 2.2-1.8 3.9-4.5 3.9-1.6 0-2.4-.6-3.8-.6-1.2 0-2 .6-3.2.6C3.4 20 2 18.3 2 16.1 2 13.5 4 12 7 12Z" />
    </svg>
  )
}

type Form = {
  nome: string
  numero: string
  posicao: string
  pe: string
  fotoUrl: string
  titularPadrao: boolean
  ativo: boolean
}
const FORM_VAZIO: Form = { nome: '', numero: '', posicao: 'MEI', pe: '', fotoUrl: '', titularPadrao: false, ativo: true }

export default function ElencoPage() {
  const [lista, setLista] = useState<Jogador[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [selId, setSelId] = useState<number | null>(null)

  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [aberto, setAberto] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const l = await api.get<Jogador[]>('/campo/jogadores')
      setLista(l)
      setSelId((s) => s ?? (l[0]?.id ?? null))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar elenco.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    carregar()
  }, [])

  const filtrada = useMemo(
    () => lista.filter((j) => j.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [lista, busca],
  )
  const sel = lista.find((j) => j.id === selId) || filtrada[0] || null

  const contagem = useMemo(() => {
    const c = { total: lista.length, gk: 0, def: 0, mid: 0, atk: 0 }
    lista.forEach((j) => {
      c[j.tipo]++
    })
    return c
  }, [lista])

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
      ativo: j.ativo,
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
      ativo: form.ativo,
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
      if (selId === j.id) setSelId(null)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  const iniciais = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  const posCor = (p: string) => POS_COR[p] ?? 'text-white/70 border-white/20 bg-white/5'

  return (
    <Layout
      active="elenco"
      title="Elenco"
      subtitle="Cadastre e gerencie os jogadores do clube."
      hideNotif
      actions={
        <>
          <div className="relative hidden md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar jogador..."
              className="h-11 w-56 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-night-cyan"
            />
          </div>
          <button className="hidden h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 hover:bg-white/10 sm:flex">
            ⚙ Filtros
          </button>
          <button onClick={novo} className="btn-primary h-11 text-sm">
            + <span className="hidden sm:inline">Adicionar jogador</span>
          </button>
        </>
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">
          {erro}
        </div>
      )}

      {/* busca no mobile */}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar jogador..."
        className="mb-4 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder-white/40 outline-none focus:border-night-cyan md:hidden"
      />

      {/* ===== CARDS DE CONTAGEM ===== */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard n={contagem.total} label="Jogadores Cadastrados" destaque />
        <StatCard n={contagem.gk} label="Goleiros" />
        <StatCard n={contagem.def} label="Defensores" />
        <StatCard n={contagem.mid} label="Meio-campistas" />
        <StatCard n={contagem.atk} label="Atacantes" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* ===== TABELA ===== */}
        <div className="overflow-hidden rounded-2xl border border-night-cyan/15 bg-night-card/60">
          <div className="grid grid-cols-[1fr_auto_auto_auto_28px] gap-3 border-b border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
            <span>Jogador</span>
            <span className="w-16 text-center">Posição</span>
            <span className="w-10 text-center">Pé</span>
            <span className="w-16 text-center">Nº</span>
            <span />
          </div>
          {loading ? (
            <p className="p-6 text-white/55">Carregando…</p>
          ) : filtrada.length === 0 ? (
            <p className="p-6 text-center text-white/55">Nenhum jogador encontrado.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-auto">
              {filtrada.map((j) => {
                const ativo = sel?.id === j.id
                return (
                  <li
                    key={j.id}
                    onClick={() => setSelId(j.id)}
                    className={`grid cursor-pointer grid-cols-[1fr_auto_auto_auto_28px] items-center gap-3 border-l-2 px-4 py-2.5 transition ${
                      ativo
                        ? 'border-night-cyan bg-night-cyan/[0.07]'
                        : 'border-transparent hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-4 text-sm text-white/40">{j.numero ?? '–'}</span>
                      <Avatar j={j} iniciais={iniciais} />
                      <span className="truncate font-semibold">{j.nome}</span>
                    </div>
                    <span className={`w-16 rounded-md border px-2 py-0.5 text-center text-xs font-bold ${posCor(j.posicao)}`}>
                      {j.posicao}
                    </span>
                    <span className="flex w-10 items-center justify-center gap-1 text-sm text-white/70">
                      {j.pe || '–'} <Foot />
                    </span>
                    <span className="w-16 text-center text-lg font-bold">{j.numero ?? '–'}</span>
                    <span className="text-night-cyan">›</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ===== PAINEL DE DETALHE ===== */}
        <div className="hidden xl:block">
          {sel ? (
            <div className="rounded-2xl border border-night-cyan/20 bg-night-card/70 p-5 shadow-[0_0_50px_-26px_rgba(47,227,218,0.6)]">
              <div className="mb-4 flex justify-end">
                <button
                  onClick={() => editar(sel)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-night-cyan/30 text-night-cyan hover:bg-night-cyan/10"
                >
                  ✎
                </button>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-night-cyan/50 bg-white/10 shadow-[0_0_30px_-8px_rgba(47,227,218,0.6)]">
                  {sel.fotoUrl ? (
                    <img src={sel.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/70">
                      {iniciais(sel.nome)}
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xl font-extrabold">{sel.nome}</div>
                <div className={`text-sm font-semibold ${(POS_COR[sel.posicao] ?? '').split(' ')[0]}`}>
                  {POS_LABEL[sel.posicao] ?? sel.posicao}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <Info label="Nº Camisa" valor={sel.numero != null ? String(sel.numero) : '–'} />
                <Info label="Pé Dominante" valor={sel.pe ? PE_LABEL[sel.pe] : '–'} foot={!!sel.pe} />
                <Info label="Posição" valor={POS_LABEL[sel.posicao] ?? sel.posicao} />
                <Info label="Jogos" valor="0" />
                <Info label="Vitórias" valor="0" />
                <Info label="Derrotas" valor="0" />
              </div>

              <div className="mt-2.5 rounded-xl border border-night-cyan/15 bg-white/[0.03] p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-white/45">Status</div>
                <div className={`mt-1 flex items-center gap-2 font-semibold ${sel.ativo ? 'text-emerald-400' : 'text-white/50'}`}>
                  <span className={`h-2 w-2 rounded-full ${sel.ativo ? 'bg-emerald-400' : 'bg-white/40'}`} />
                  {sel.ativo ? 'Ativo' : 'Inativo'}
                </div>
              </div>

              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-night-cyan/30 bg-night-cyan/[0.06] py-2.5 text-sm font-bold text-night-cyan hover:bg-night-cyan/10">
                📊 Ver estatísticas
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-8 text-center text-white/45">
              Selecione um jogador
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL CADASTRO/EDIÇÃO ===== */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div className="card w-full max-w-md rounded-b-none p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-extrabold">{editId ? 'Editar jogador' : 'Novo jogador'}</h2>
            <form onSubmit={salvar} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-night-cyan/25 bg-white/10">
                  {form.fotoUrl ? (
                    <img src={form.fotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">foto</div>
                  )}
                </div>
                <label className="btn-ghost cursor-pointer text-sm">
                  {enviandoFoto ? 'Enviando…' : 'Escolher foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={onFoto} />
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm text-white/70">Nome</label>
                <input className="field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} autoFocus required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Número</label>
                  <input type="number" className="field" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Posição</label>
                  <select className="field" value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })}>
                    {POSICOES.map((p) => (
                      <option key={p} value={p}>
                        {p} — {POS_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Pé</label>
                  <select className="field" value={form.pe} onChange={(e) => setForm({ ...form, pe: e.target.value })}>
                    <option value="">—</option>
                    <option value="D">Direito</option>
                    <option value="E">Esquerdo</option>
                    <option value="Ambi">Ambidestro</option>
                  </select>
                </div>
                <label className="flex items-end gap-2 pb-2.5 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={form.titularPadrao}
                    onChange={(e) => setForm({ ...form, titularPadrao: e.target.checked })}
                    className="h-4 w-4 accent-night-cyan"
                  />
                  Titular padrão
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAberto(false)} className="btn-ghost flex-1">
                  Cancelar
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={() => {
                      const j = lista.find((x) => x.id === editId)
                      if (j) {
                        setAberto(false)
                        excluir(j)
                      }
                    }}
                    className="btn border border-campo-red/40 px-4 text-sm text-red-300 hover:bg-campo-red/20"
                  >
                    Excluir
                  </button>
                )}
                <button type="submit" className="btn-primary flex-1" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

function StatCard({ n, label, destaque }: { n: number; label: string; destaque?: boolean }) {
  return (
    <div
      className={`rounded-2xl border bg-night-card/60 p-4 ${
        destaque ? 'border-night-cyan/35 shadow-[0_0_30px_-18px_rgba(47,227,218,0.6)]' : 'border-night-cyan/15'
      }`}
    >
      <div className="text-3xl font-extrabold">{n}</div>
      <div className="mt-0.5 text-xs leading-tight text-white/55">{label}</div>
    </div>
  )
}

function Avatar({ j, iniciais }: { j: { nome: string; fotoUrl: string | null }; iniciais: (n: string) => string }) {
  return (
    <span className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-night-cyan/25 bg-white/10">
      {j.fotoUrl ? (
        <img src={j.fotoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/70">
          {iniciais(j.nome)}
        </span>
      )}
    </span>
  )
}

function Info({ label, valor, foot }: { label: string; valor: string; foot?: boolean }) {
  return (
    <div className="rounded-xl border border-night-cyan/15 bg-white/[0.03] p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-white/45">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 font-semibold">
        {foot && <Foot />}
        {valor}
      </div>
    </div>
  )
}
