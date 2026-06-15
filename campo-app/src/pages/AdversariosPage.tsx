import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { api, uploadFoto } from '../lib/api'
import Layout from '../components/Layout'

interface Adversario {
  id: number
  nome: string
  competicao: string | null
  escudoUrl: string | null
  confrontos: number
  gf: number
  gs: number
  vitorias: number
  empates: number
  derrotas: number
  ultimos: ('V' | 'E' | 'D')[]
}

const COMPETICOES = ['Série A', 'Série B', 'Série C', 'Série D', 'Estadual', 'Copa', 'Amistoso', 'Outro']
const RES_COR: Record<string, string> = {
  V: 'bg-emerald-600/80 text-white',
  E: 'bg-white/15 text-white/80',
  D: 'bg-red-600/80 text-white',
}

/* ícones cyan dos stat cards */
const IShield = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" strokeLinejoin="round" />
    <path d="M9.5 12l1.8 1.8L15 10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ISwords = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M3 4l9 9M21 4l-9 9M6 21l5-5M18 21l-5-5" strokeLinecap="round" />
    <path d="M3 4h3l11 11v3h-3L3 7V4Z" opacity=".4" />
  </svg>
)
const ITrophy = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" strokeLinejoin="round" />
    <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M10 13.5V17m4-3.5V17M8 20h8M9 17h6" strokeLinecap="round" />
  </svg>
)
const IChart = () => (
  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 19V5M4 19h16M8 16v-4m4 4V8m4 8v-6" strokeLinecap="round" />
  </svg>
)

export default function AdversariosPage() {
  const [lista, setLista] = useState<Adversario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  // form (painel lateral)
  const [editId, setEditId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [competicao, setCompeticao] = useState('')
  const [escudoUrl, setEscudoUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const nomeRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setLoading(true)
    try {
      const data = await api.get<Partial<Adversario>[]>('/campo/adversarios')
      setLista(
        data.map((a) => ({
          id: a.id!,
          nome: a.nome ?? '',
          competicao: a.competicao ?? null,
          escudoUrl: a.escudoUrl ?? null,
          confrontos: a.confrontos ?? 0,
          gf: a.gf ?? 0,
          gs: a.gs ?? 0,
          vitorias: a.vitorias ?? 0,
          empates: a.empates ?? 0,
          derrotas: a.derrotas ?? 0,
          ultimos: a.ultimos ?? [],
        })),
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    carregar()
  }, [])

  const filtrada = useMemo(
    () => lista.filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase())),
    [lista, busca],
  )

  const stats = useMemo(() => {
    return lista.reduce(
      (acc, a) => {
        acc.confrontos += a.confrontos
        acc.vitorias += a.vitorias
        acc.empates += a.empates
        return acc
      },
      { confrontos: 0, vitorias: 0, empates: 0 },
    )
  }, [lista])

  function novo() {
    setEditId(null)
    setNome('')
    setCompeticao('')
    setEscudoUrl('')
    setTimeout(() => nomeRef.current?.focus(), 50)
  }
  function editar(a: Adversario) {
    setEditId(a.id)
    setNome(a.nome)
    setCompeticao(a.competicao ?? '')
    setEscudoUrl(a.escudoUrl ?? '')
    nomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
    const payload = { nome, competicao: competicao || null, escudo_url: escudoUrl || null }
    try {
      if (editId) await api.put(`/campo/adversarios/${editId}`, payload)
      else await api.post('/campo/adversarios', payload)
      novo()
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
      if (editId === a.id) novo()
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover.')
    }
  }

  return (
    <Layout
      active="adversarios"
      title="Adversários"
      subtitle="Cadastre e gerencie os times que serão analisados."
      hideNotif
      actions={
        <>
          <div className="relative hidden md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar time..."
              className="h-11 w-56 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-night-cyan"
            />
          </div>
          <button className="hidden h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 hover:bg-white/10 sm:flex">
            ⚙ Filtros
          </button>
          <button onClick={novo} className="btn-primary h-11 text-sm">
            + <span className="hidden sm:inline">Adicionar time</span>
          </button>
        </>
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* ===== COLUNA ESQUERDA ===== */}
        <div>
          {/* stat cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={<IShield />} n={lista.length} label="Times Cadastrados" />
            <StatCard icon={<ISwords />} n={stats.confrontos} label="Confrontos Registrados" />
            <StatCard icon={<ITrophy />} n={stats.vitorias} label="Vitórias" />
            <StatCard icon={<IChart />} n={stats.empates} label="Empates" />
          </div>

          {/* lista */}
          <div className="overflow-hidden rounded-2xl border border-night-cyan/15 bg-night-card/50">
            <div className="border-b border-white/10 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              Times Cadastrados
            </div>
            {loading ? (
              <p className="p-6 text-white/55">Carregando…</p>
            ) : filtrada.length === 0 ? (
              <p className="p-6 text-center text-white/55">Nenhum adversário ainda.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {filtrada.map((a, i) => (
                  <li
                    key={a.id}
                    onClick={() => editar(a)}
                    className="flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-white/[0.03]"
                  >
                    <span className="w-4 text-center text-sm text-white/40">{i + 1}</span>
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-night-cyan/20 bg-white/10">
                      {a.escudoUrl ? (
                        <img src={a.escudoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-lg">🛡️</span>
                      )}
                    </span>
                    <div className="w-32 min-w-0">
                      <div className="truncate font-bold">{a.nome}</div>
                      <div className="truncate text-xs text-white/45">{a.competicao ?? '—'}</div>
                    </div>

                    <div className="hidden flex-1 sm:block">
                      <div className="mb-1 text-xs text-white/45">Histórico de confrontos</div>
                      <div className="flex gap-1.5">
                        {a.ultimos.length === 0 ? (
                          <span className="text-xs text-white/30">sem confrontos</span>
                        ) : (
                          a.ultimos.map((r, k) => (
                            <span
                              key={k}
                              className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${RES_COR[r]}`}
                            >
                              {r}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="hidden text-center sm:block">
                      <div className="text-lg font-bold">{a.gf}</div>
                      <div className="text-[11px] text-white/45">GF</div>
                    </div>
                    <div className="hidden text-center sm:block">
                      <div className="text-lg font-bold">{a.gs}</div>
                      <div className="text-[11px] text-white/45">GS</div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        excluir(a)
                      }}
                      className="ml-auto text-white/30 hover:text-red-300 sm:ml-0"
                    >
                      ✕
                    </button>
                    <span className="text-night-cyan">›</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== PAINEL LATERAL (cadastro) ===== */}
        <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-5 shadow-[0_0_50px_-26px_rgba(47,227,218,0.6)]">
          <h3 className="text-center text-lg font-extrabold">
            {editId ? 'Editar time' : 'Adicionar novo time'}
          </h3>

          <form onSubmit={salvar} className="mt-4 space-y-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-night-cyan/40 bg-night-cyan/[0.05] text-night-cyan transition hover:bg-night-cyan/10"
              >
                {escudoUrl ? (
                  <img src={escudoUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" strokeLinejoin="round" />
                    <path d="M12 9v6M9 12h6" strokeLinecap="round" />
                  </svg>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-white/50">Preencha as informações do adversário.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Nome do time</label>
              <input
                ref={nomeRef}
                className="field"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Flamengo"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Competição</label>
              <select className="field" value={competicao} onChange={(e) => setCompeticao(e.target.value)}>
                <option value="">Selecione a competição</option>
                {COMPETICOES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">Foto / Escudo</label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-white/50 transition hover:border-night-cyan/40"
              >
                <span className="text-xl">⬆️</span>
                <span className="text-sm font-semibold text-white/70">
                  {enviando ? 'Enviando…' : 'Clique para enviar'}
                </span>
                <span className="text-xs">ou arraste a imagem</span>
                <span className="mt-1 text-[11px] text-white/35">PNG, JPG ou SVG. Máx 2MB</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onEscudo} />
            </div>

            <div className="flex gap-2 pt-1">
              {editId && (
                <button type="button" onClick={novo} className="btn-ghost px-4">
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn-primary flex-1" disabled={salvando}>
                {salvando ? 'Salvando…' : editId ? 'Salvar alterações' : 'Salvar time'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-night-cyan/15 bg-night-card/60 p-4">
      <span className="text-night-cyan">{icon}</span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none">{n}</div>
        <div className="mt-1 text-xs leading-tight text-white/55">{label}</div>
      </div>
    </div>
  )
}
