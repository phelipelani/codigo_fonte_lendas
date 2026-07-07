import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import Layout from '../components/Layout'

interface Jogador {
  id: number
  nome: string
  numero: number | null
  posicao: string
  tipo: 'atk' | 'mid' | 'def' | 'gk'
  titularPadrao: boolean
}
interface Partida {
  id: number
  adversarioNome: string | null
  status: string
}
interface EscItem {
  jogadorId: number
  titular: boolean
}

type Stat = {
  passeC: number
  passeE: number
  chuteC: number
  chuteE: number
  gols: number
  assist: number
  amarelo: number
  vermelho: number
  min: number // segundos
}
const STAT0: Stat = {
  passeC: 0, passeE: 0, chuteC: 0, chuteE: 0, gols: 0, assist: 0, amarelo: 0, vermelho: 0, min: 0,
}

// eventos do historico (linha do tempo da partida)
type EvTipo = 'gol' | 'amarelo' | 'vermelho' | 'defesa' | 'sofrido'
interface Evento {
  key: number
  tipo: EvTipo
  jid: number | null
  nome: string
  seg: number
  tempo: number
}
// qual campo do Stat gera evento no historico
const EV_DE: Partial<Record<keyof Stat, EvTipo>> = {
  gols: 'gol',
  amarelo: 'amarelo',
  vermelho: 'vermelho',
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const x = s % 60
  return `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}
function pct(a: number, b: number) {
  if (!(a + b)) return '0%'
  return `${(Math.round((a / (a + b)) * 10000) / 100).toFixed(2).replace('.', ',')}%`
}

export default function CapturaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [encerrando, setEncerrando] = useState(false)
  const [partida, setPartida] = useState<Partida | null>(null)
  const [titulares, setTitulares] = useState<Jogador[]>([])
  const [reservas, setReservas] = useState<Jogador[]>([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<Record<number, Stat>>({})
  const [defesas, setDefesas] = useState(0)
  const [golsSofridos, setGolsSofridos] = useState(0)
  const [historico, setHistorico] = useState<Evento[]>([])
  const [subArm, setSubArm] = useState<number | null>(null) // id do reserva armado

  // cronometro
  const [seg, setSeg] = useState(0)
  const [tempo, setTempo] = useState(1)
  const [rodando, setRodando] = useState(false)
  const tituRef = useRef<Jogador[]>([])
  tituRef.current = titulares
  const evSeq = useRef(0)

  useEffect(() => {
    Promise.all([
      api.get<Partida>(`/campo/partidas/${id}`).catch(() => null),
      api.get<Jogador[]>('/campo/jogadores'),
      api.get<EscItem[]>(`/campo/partidas/${id}/escalacao`).catch(() => [] as EscItem[]),
    ])
      .then(([p, js, esc]) => {
        setPartida(p)
        const titIds = esc.filter((e) => e.titular).map((e) => e.jogadorId)
        let base: Jogador[]
        if (titIds.length) {
          base = titIds.map((tid) => js.find((j) => j.id === tid)).filter(Boolean) as Jogador[]
        } else {
          const titu = js.filter((j) => j.titularPadrao)
          base = titu.length ? titu : js.slice(0, 11)
        }
        const ids = new Set(base.map((j) => j.id))
        setTitulares(base)
        setReservas(js.filter((j) => !ids.has(j.id)))
        const st: Record<number, Stat> = {}
        js.forEach((j) => (st[j.id] = { ...STAT0 }))
        setStats(st)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!rodando) return
    const t = setInterval(() => {
      setSeg((s) => s + 1)
      setStats((prev) => {
        const next = { ...prev }
        tituRef.current.forEach((j) => {
          if (next[j.id]) next[j.id] = { ...next[j.id], min: next[j.id].min + 1 }
        })
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [rodando])

  // registra/desfaz um evento no historico (d>0 adiciona, d<0 remove o ultimo do tipo)
  function logEvento(tipo: EvTipo, jid: number | null, nome: string, d: number) {
    if (d > 0) {
      setHistorico((h) => [{ key: ++evSeq.current, tipo, jid, nome, seg, tempo }, ...h])
    } else if (d < 0) {
      setHistorico((h) => {
        const i = h.findIndex((e) => e.tipo === tipo && e.jid === jid)
        if (i < 0) return h
        const c = [...h]
        c.splice(i, 1)
        return c
      })
    }
  }

  function upd(jid: number, campo: keyof Stat, d: number) {
    setStats((prev) => {
      const cur = prev[jid] ?? { ...STAT0 }
      const val = Math.max(0, (cur[campo] as number) + d)
      return { ...prev, [jid]: { ...cur, [campo]: val } }
    })
    const evt = EV_DE[campo]
    if (evt) {
      const j = tituRef.current.find((x) => x.id === jid) ?? reservas.find((x) => x.id === jid)
      logEvento(evt, jid, j?.nome ?? '', d)
    }
  }

  function onDefesa(d: number) {
    setDefesas((x) => Math.max(0, x + d))
    logEvento('defesa', gkId, gk?.nome ?? 'Goleiro', d)
  }
  function onSofrido(d: number) {
    setGolsSofridos((x) => Math.max(0, x + d))
    logEvento('sofrido', null, partida?.adversarioNome ?? 'Adversário', d)
  }

  function substituir(titularId: number) {
    if (subArm == null) return
    const res = reservas.find((r) => r.id === subArm)
    const tit = titulares.find((t) => t.id === titularId)
    if (!res || !tit) return
    setTitulares((ts) => ts.map((t) => (t.id === titularId ? res : t)))
    setReservas((rs) => rs.map((r) => (r.id === subArm ? tit : r)))
    setStats((prev) => ({ ...prev, [res.id]: prev[res.id] ?? { ...STAT0 } }))
    setSubArm(null)
  }

  const scoreNos = useMemo(() => Object.values(stats).reduce((a, s) => a + s.gols, 0), [stats])
  const totais = useMemo(() => {
    let cc = 0, ce = 0, pc = 0, pe = 0
    Object.values(stats).forEach((s) => {
      cc += s.chuteC; ce += s.chuteE; pc += s.passeC; pe += s.passeE
    })
    return { cc, ce, pc, pe }
  }, [stats])

  const gk = useMemo(() => titulares.find((j) => j.tipo === 'gk') ?? null, [titulares])
  const gkId = gk?.id ?? null

  // o grid mostra SO os jogadores de linha; o goleiro fica no painel da direita
  const cards = useMemo(() => titulares.filter((j) => j.tipo !== 'gk'), [titulares])

  // gols do nosso time pro cabecalho (ordem crescente de tempo)
  const golsNossos = useMemo(
    () => historico.filter((e) => e.tipo === 'gol').slice().sort((a, b) => a.seg - b.seg),
    [historico],
  )

  async function encerrar() {
    if (!confirm('Encerrar a partida e salvar as estatísticas?')) return
    const temStat = (s: Stat) =>
      s.min > 0 || s.gols || s.assist || s.passeC || s.passeE || s.chuteC || s.chuteE || s.amarelo || s.vermelho
    const all = [...titulares, ...reservas]
    const tituIds = new Set(titulares.map((j) => j.id))
    const jogadores = all
      .map((j) => ({ j, s: stats[j.id] ?? STAT0 }))
      .filter(({ j, s }) => tituIds.has(j.id) || temStat(s))
      .map(({ j, s }) => ({
        jogador_id: j.id,
        passe_certo: s.passeC,
        passe_errado: s.passeE,
        chute_certo: s.chuteC,
        chute_errado: s.chuteE,
        gols: s.gols,
        assist: s.assist,
        amarelo: s.amarelo,
        vermelho: s.vermelho,
        defesa: j.id === gkId ? defesas : 0,
        gol_sofrido: j.id === gkId ? golsSofridos : 0,
        min_jogados: Math.round(s.min / 60),
      }))
    const eventos = historico.map((e) => ({
      jogador_id: e.jid,
      tipo: e.tipo === 'sofrido' ? 'gol_sofrido' : e.tipo,
      minuto: Math.floor(e.seg / 60),
      tempo: e.tempo,
    }))
    setEncerrando(true)
    setErro('')
    try {
      await api.post(`/campo/partidas/${id}/finalizar`, {
        placar_nos: scoreNos,
        placar_eles: golsSofridos,
        jogadores,
        eventos,
      })
      navigate('/partidas')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao encerrar.')
      setEncerrando(false)
    }
  }

  if (loading) {
    return (
      <Layout active="partidas" title="Captura ao vivo">
        <p className="text-white/60">Carregando…</p>
      </Layout>
    )
  }

  return (
    <Layout active="partidas" bare>
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {/* ===== PLACAR / TOPO ===== */}
      <div className="mb-4 grid grid-cols-1 gap-4 rounded-2xl border border-night-cyan/20 bg-night-card/60 bg-gradient-to-b from-white/[0.03] to-transparent p-4 lg:grid-cols-[1fr_auto_1fr_1.2fr] lg:items-center">
        {/* nosso time */}
        <div>
          <div className="text-center text-xl font-extrabold text-night-cyan">{user?.clube?.nome ?? 'Nosso time'}</div>
          <div className="text-center text-5xl font-extrabold tabular-nums">{scoreNos}</div>
          <div className="mt-1 space-y-0.5 text-xs text-white/55">
            {golsNossos.map((g) => (
              <div key={g.key} className="flex items-center gap-1.5">
                <span className="text-night-cyan">⚽</span>
                <span className="truncate">{g.nome}</span>
                <span className="tabular-nums text-white/40">— {fmt(g.seg)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* timer */}
        <div className="mx-auto rounded-xl border border-campo-red/40 bg-campo-red/[0.08] px-5 py-2 text-center">
          <div className="text-xs font-bold tracking-wide text-red-300">{tempo}º - TEMPO</div>
          <div className="text-3xl font-extrabold tabular-nums text-red-200">{fmt(seg)}</div>
          <div className="mt-1 flex gap-1">
            <button onClick={() => setRodando((r) => !r)} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold hover:bg-white/15">
              {rodando ? '⏸' : '▶'}
            </button>
            <button onClick={() => setTempo((t) => (t === 1 ? 2 : 1))} className="flex-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-bold hover:bg-white/15">
              {tempo === 1 ? '2ºT' : '1ºT'}
            </button>
          </div>
        </div>

        {/* adversario */}
        <div>
          <div className="text-center text-xl font-extrabold">{partida?.adversarioNome ?? 'Adversário'}</div>
          <div className="text-center text-5xl font-extrabold tabular-nums">{golsSofridos}</div>
        </div>

        {/* totais */}
        <div className="space-y-2 text-sm">
          <TotRow ic="alvo" label="Total de Chutes Certos" n={totais.cc} p={pct(totais.cc, totais.ce)} />
          <TotRow ic="escudo" label="Total de Chutes Errados" n={totais.ce} p={pct(totais.ce, totais.cc)} />
          <TotRow ic="passe" label="Total de Passes Certos" n={totais.pc} p={pct(totais.pc, totais.pe)} />
          <TotRow ic="erro" label="Total de Passes Errados" n={totais.pe} p={pct(totais.pe, totais.pc)} />
        </div>
      </div>

      {subArm != null && (
        <div className="mb-3 rounded-lg border border-night-cyan/40 bg-night-cyan/10 px-3 py-2 text-center text-sm font-semibold text-night-cyan">
          Substituição: toque no titular que vai sair.{' '}
          <button onClick={() => setSubArm(null)} className="underline">cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_248px]">
        {/* ===== GRID DE CARDS (10 de linha + GK por ultimo) ===== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {cards.map((j) => (
            <Card
              key={j.id}
              j={j}
              st={stats[j.id] ?? STAT0}
              armado={subArm != null}
              onCard={() => subArm != null && substituir(j.id)}
              upd={(c, d) => upd(j.id, c, d)}
            />
          ))}
        </div>

        {/* ===== COLUNA DIREITA ===== */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
            <div className="mb-2 border-b border-night-cyan/30 pb-1 text-center font-extrabold text-night-cyan">Reservas</div>
            {reservas.length === 0 ? (
              <p className="py-3 text-center text-xs text-white/40">Sem reservas</p>
            ) : (
              <ul className="space-y-1.5">
                {reservas.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => setSubArm(subArm === r.id ? null : r.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      subArm === r.id ? 'bg-night-cyan/15 ring-1 ring-night-cyan' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="w-9 text-xs font-bold text-night-cyan">{r.posicao}</span>
                    <span className="truncate">{r.nome}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {gk && (
            <>
              {/* Goleiro: nome em cima (clique p/ substituir) + Defesas */}
              <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
                <button
                  onClick={() => subArm != null && substituir(gk.id)}
                  title={subArm != null ? 'Trocar pelo reserva selecionado' : 'Goleiro em campo'}
                  className={`mb-3 flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                    subArm != null
                      ? 'cursor-pointer border-night-cyan/60 bg-night-cyan/5 hover:bg-night-cyan/10'
                      : 'border-white/10'
                  }`}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-night-cyan/50 text-xs font-extrabold text-night-cyan">
                    {gk.numero ?? 'GK'}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold leading-tight">{gk.nome}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-night-cyan">Goleiro</span>
                  </span>
                </button>
                <div className="mb-1 flex items-center justify-center gap-2 font-extrabold">
                  <span className="text-night-cyan"><Icone nome="luva" className="h-5 w-5" /></span>
                  Defesas
                </div>
                <div className="flex items-center justify-center">
                  <Step v={defesas} on={onDefesa} />
                </div>
              </div>
              <GkPanel titulo="Gols Sofridos" ic="rede" v={golsSofridos} on={onSofrido} />
            </>
          )}

          <Historico eventos={historico} />

          <button onClick={encerrar} disabled={encerrando} className="btn-primary w-full">
            {encerrando ? 'Salvando…' : '⏹ Encerrar partida'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

/* ---------- icones (line-art, no estilo do print) ---------- */
function Icone({ nome, className = 'h-4 w-4' }: { nome: string; className?: string }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const paths: Record<string, JSX.Element> = {
    alvo: (<><circle cx="12" cy="12" r="8" {...p} /><circle cx="12" cy="12" r="3.2" {...p} /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" {...p} /></>),
    escudo: (<path d="M12 3l7 2.6v5.4c0 4.3-3 7.3-7 9-4-1.7-7-4.7-7-9V5.6z" {...p} />),
    passe: (<><path d="M4 8.5h11l-3-3M20 15.5H9l3 3" {...p} /></>),
    erro: (<><circle cx="12" cy="12" r="8.5" {...p} /><path d="M9 9l6 6M15 9l-6 6" {...p} /></>),
    luva: (<path d="M8 12V6.5a1.8 1.8 0 0 1 3.6 0V11m0-1V5a1.8 1.8 0 0 1 3.6 0v6.5c0 4-2.4 6.5-5.4 6.5S4.6 16 4.6 12.5V11a1.8 1.8 0 0 1 3.4-.8" {...p} />),
    rede: (<><rect x="3.5" y="6" width="17" height="12" rx="1" {...p} /><path d="M8 6v12M12 6v12M16 6v12M3.5 10h17M3.5 14h17" {...p} /></>),
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{paths[nome] ?? null}</svg>
  )
}

function TotRow({ ic, label, n, p }: { ic: string; label: string; n: number; p: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-night-cyan/30 bg-night-cyan/10 text-night-cyan">
        <Icone nome={ic} className="h-4 w-4" />
      </span>
      <span className="flex-1 text-white/75">{label}</span>
      <span className="w-7 text-right font-bold tabular-nums">{String(n).padStart(2, '0')}</span>
      <span className="w-16 text-right font-bold tabular-nums text-night-cyan">{p}</span>
    </div>
  )
}

function Step({ v, on }: { v: number; on: (d: number) => void }) {
  const btn = 'flex h-6 w-6 items-center justify-center rounded-full border border-night-cyan/45 text-night-cyan transition hover:bg-night-cyan/15 active:scale-90'
  return (
    <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button className={btn} onClick={() => on(1)}>+</button>
      <span className="w-5 text-center text-sm font-bold tabular-nums">{v}</span>
      <button className={btn} onClick={() => on(-1)}>−</button>
    </span>
  )
}

function Card({
  j,
  st,
  upd,
  armado,
  onCard,
}: {
  j: Jogador
  st: Stat
  upd: (c: keyof Stat, d: number) => void
  armado: boolean
  onCard: () => void
}) {
  const row = (label: string, v: number, c: keyof Stat) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <Step v={v} on={(d) => upd(c, d)} />
    </div>
  )
  return (
    <div
      onClick={onCard}
      className={`rounded-2xl border bg-night-card/70 bg-gradient-to-b from-white/[0.03] to-transparent p-3 transition ${
        armado ? 'cursor-pointer border-night-cyan/60 hover:bg-night-cyan/5' : 'border-night-cyan/20'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <span className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-night-cyan/40 px-1 text-lg font-extrabold tabular-nums text-night-cyan">
          {j.numero ?? '–'}
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-night-cyan">P-{j.posicao}</div>
          <div className="truncate font-bold leading-tight">{j.nome}</div>
        </div>
      </div>

      <div className="mb-0.5 flex items-center justify-between">
        <span className="font-bold">Passe</span>
        <span className="text-sm font-bold text-night-cyan">{st.passeC + st.passeE}</span>
      </div>
      {row('Certos', st.passeC, 'passeC')}
      {row('Errados', st.passeE, 'passeE')}

      <div className="mb-0.5 mt-1.5 flex items-center justify-between">
        <span className="font-bold">Chutes</span>
        <span className="text-sm font-bold text-night-cyan">{st.chuteC + st.chuteE}</span>
      </div>
      {row('Certos', st.chuteC, 'chuteC')}
      {row('Errados', st.chuteE, 'chuteE')}

      <div className="mt-1.5 space-y-0.5">
        {row('Gols', st.gols, 'gols')}
        {row('Assist.', st.assist, 'assist')}
      </div>

      <div className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-white/60">
            <span className="inline-block h-3 w-2.5 rounded-[2px] bg-yellow-400" /> Amarelo
          </span>
          <Step v={st.amarelo} on={(d) => upd('amarelo', d)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm text-white/60">
            <span className="inline-block h-3 w-2.5 rounded-[2px] bg-campo-red" /> Vermelho
          </span>
          <Step v={st.vermelho} on={(d) => upd('vermelho', d)} />
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-white/45">
        <span>Min. Joga</span>
        <span className="rounded bg-white/5 px-2 py-0.5 font-bold tabular-nums text-white/80">{fmt(st.min)}</span>
      </div>
    </div>
  )
}

function GkPanel({ titulo, ic, v, on }: { titulo: string; ic: string; v: number; on: (d: number) => void }) {
  return (
    <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3 text-center">
      <div className="mb-2 flex items-center justify-center gap-2 font-extrabold">
        <span className="text-night-cyan"><Icone nome={ic} className="h-5 w-5" /></span>
        {titulo}
      </div>
      <div className="flex items-center justify-center">
        <Step v={v} on={on} />
      </div>
    </div>
  )
}

const EV_INFO: Record<EvTipo, { icon: string; rotulo: (nome: string) => string }> = {
  gol: { icon: '⚽', rotulo: (n) => `Gol — ${n}` },
  amarelo: { icon: '🟨', rotulo: (n) => `Amarelo — ${n}` },
  vermelho: { icon: '🟥', rotulo: (n) => `Vermelho — ${n}` },
  defesa: { icon: '🧤', rotulo: (n) => `Defesa — ${n}` },
  sofrido: { icon: '🥅', rotulo: (n) => `Gol sofrido (${n})` },
}

function Historico({ eventos }: { eventos: Evento[] }) {
  return (
    <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
      <div className="mb-2 border-b border-night-cyan/30 pb-1 text-center font-extrabold text-night-cyan">Histórico</div>
      {eventos.length === 0 ? (
        <p className="py-3 text-center text-xs text-white/40">Sem eventos ainda</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-auto pr-0.5">
          {eventos.map((e) => (
            <li key={e.key} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-white/5">
              <span>{EV_INFO[e.tipo].icon}</span>
              <span className="min-w-0 flex-1 truncate text-white/80">{EV_INFO[e.tipo].rotulo(e.nome)}</span>
              <span className="tabular-nums text-xs text-white/45">{e.tempo}ºT {fmt(e.seg)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
