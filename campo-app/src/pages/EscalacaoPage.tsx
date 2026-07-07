import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import CampoTatico, { ESQUEMAS, montarFormacao, detectarEsquema, type PosicaoTatica } from '../components/CampoTatico'

interface Jogador {
  id: number
  nome: string
  numero: number | null
  posicao: string
  tipo: 'atk' | 'mid' | 'def' | 'gk'
  fotoUrl: string | null
  titularPadrao: boolean
  ativo?: boolean
}
interface Partida {
  id: number
  adversarioNome: string | null
  formacao: string | null
}
interface EscItem {
  jogadorId: number
  titular: boolean
}
interface Formacao {
  id: number
  nome: string
  esquema: string | null
  posicoes: PosicaoTatica[]
}

const GRUPOS: { tipo: Jogador['tipo']; label: string }[] = [
  { tipo: 'gk', label: 'Goleiros' },
  { tipo: 'def', label: 'Defesa' },
  { tipo: 'mid', label: 'Meio-campo' },
  { tipo: 'atk', label: 'Ataque' },
]

export default function EscalacaoPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [partida, setPartida] = useState<Partida | null>(null)
  const [elenco, setElenco] = useState<Jogador[]>([])
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [formacao, setFormacao] = useState('4-3-3')
  const [posicoes, setPosicoes] = useState<PosicaoTatica[]>([])
  const [salvas, setSalvas] = useState<Formacao[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Partida>(`/campo/partidas/${id}`).catch(() => null),
      api.get<Jogador[]>('/campo/jogadores'),
      api.get<EscItem[]>(`/campo/partidas/${id}/escalacao`).catch(() => [] as EscItem[]),
      api.get<Formacao[]>('/campo/formacoes').catch(() => [] as Formacao[]),
    ])
      .then(([p, js, esc, fs]) => {
        setPartida(p)
        const ativos = js.filter((j) => j.ativo !== false)
        setElenco(ativos)
        setSalvas(fs)
        const f = p?.formacao || '4-3-3'
        setFormacao(f)
        const titulares = esc.filter((e) => e.titular).map((e) => e.jogadorId)
        const ids = titulares.length ? titulares : ativos.filter((j) => j.titularPadrao).map((j) => j.id)
        const set = new Set(ids)
        setSel(set)
        setPosicoes(montarFormacao(f, ativos.filter((j) => set.has(j.id))))
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  const selecionados = useMemo(() => elenco.filter((j) => sel.has(j.id)), [elenco, sel])

  function rearranjar(f: string, ids: Set<number>) {
    setPosicoes(montarFormacao(f, elenco.filter((j) => ids.has(j.id))))
  }

  function aplicarFormacao(f: string) {
    setFormacao(f)
    rearranjar(f, sel)
  }

  // arrastar: atualiza posicoes e re-detecta a formacao (sem re-encaixar)
  function aoMover(next: PosicaoTatica[]) {
    setPosicoes(next)
    const det = detectarEsquema(next, selecionados)
    if (det) setFormacao(det)
  }

  function toggle(jid: number) {
    setSel((s) => {
      const n = new Set(s)
      if (n.has(jid)) n.delete(jid)
      else n.add(jid)
      rearranjar(formacao, n)
      return n
    })
  }

  function carregarEstrategia(fid: number) {
    const f = salvas.find((x) => x.id === fid)
    if (!f) return
    const validas = (f.posicoes ?? []).filter((p) => p.jogadorId == null || elenco.some((j) => j.id === p.jogadorId))
    const ids = new Set(validas.map((p) => p.jogadorId).filter(Boolean) as number[])
    if (f.esquema) setFormacao(f.esquema)
    setSel(ids)
    setPosicoes(validas.length ? validas : montarFormacao(f.esquema ?? formacao, elenco.filter((j) => ids.has(j.id))))
  }

  const qtd = sel.size
  const temGk = useMemo(() => elenco.some((j) => j.tipo === 'gk' && sel.has(j.id)), [elenco, sel])

  async function iniciar() {
    setSalvando(true)
    setErro('')
    try {
      await api.post(`/campo/partidas/${id}/escalacao`, { formacao, titulares: [...sel] })
      navigate(`/partidas/${id}/anotar`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar escalação.')
      setSalvando(false)
    }
  }

  const iniciais = (n: string) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Layout
      active="partidas"
      title="Escalação"
      subtitle={partida ? `Caraguatas x ${partida.adversarioNome ?? 'A definir'}` : undefined}
      hideNotif
      actions={
        <button onClick={iniciar} disabled={salvando || qtd === 0} className="btn-primary h-11 text-sm">
          {salvando ? 'Salvando…' : 'Iniciar partida →'}
        </button>
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">Formação:</span>
          <select value={formacao} onChange={(e) => aplicarFormacao(e.target.value)} className="field w-32">
            {!(ESQUEMAS as readonly string[]).includes(formacao) && (
              <option value={formacao} disabled>{formacao} (livre)</option>
            )}
            {ESQUEMAS.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
        {salvas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Estratégia:</span>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && carregarEstrategia(Number(e.target.value))}
              className="field w-48"
            >
              <option value="">Carregar salva…</option>
              {salvas.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
            </select>
          </div>
        )}
        <div
          className={`rounded-xl border px-4 py-2 text-sm font-bold ${
            qtd === 11 ? 'border-night-cyan/45 bg-night-cyan/10 text-night-cyan' : 'border-white/15 bg-white/5 text-white/70'
          }`}
        >
          {qtd} / 11 titulares {qtd !== 11 && <span className="font-normal text-white/45">(ideal 11)</span>}
        </div>
        {!temGk && qtd > 0 && <span className="text-sm text-amber-300/80">⚠ selecione um goleiro</span>}
      </div>

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : elenco.length === 0 ? (
        <div className="card p-8 text-center text-white/60">Cadastre jogadores no Elenco primeiro.</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,480px)_1fr]">
          {/* ===== CAMPINHO (preleição: arraste pra mostrar a jogada) ===== */}
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-bold text-night-cyan">{formacao}</span>
              <span className="text-xs text-white/45">✋ Arraste os jogadores</span>
            </div>
            <CampoTatico posicoes={posicoes} jogadores={selecionados} onChange={aoMover} />
            {qtd === 0 && <p className="mt-2 text-center text-xs text-white/45">Selecione jogadores ao lado para montar o time.</p>}
          </div>

          {/* ===== SELEÇÃO DO ELENCO ===== */}
          <div className="space-y-5">
            {GRUPOS.map((g) => {
              const jogs = elenco.filter((j) => j.tipo === g.tipo)
              if (!jogs.length) return null
              return (
                <div key={g.tipo}>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">{g.label}</div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {jogs.map((j) => {
                      const on = sel.has(j.id)
                      return (
                        <button
                          key={j.id}
                          onClick={() => toggle(j.id)}
                          className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                            on
                              ? 'border-night-cyan/50 bg-night-cyan/[0.08] shadow-[0_0_20px_-10px_rgba(47,227,218,0.6)]'
                              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-night-cyan/25 bg-white/10 text-xs font-bold text-white/70">
                            {j.fotoUrl ? <img src={j.fotoUrl} alt="" className="h-full w-full object-cover" /> : iniciais(j.nome)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{j.nome}</div>
                            <div className="text-xs text-white/50">
                              {j.posicao}
                              {j.numero != null ? ` · #${j.numero}` : ''}
                            </div>
                          </div>
                          <span
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs ${
                              on ? 'border-night-cyan bg-night-cyan text-[#000407]' : 'border-white/25 text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Layout>
  )
}
