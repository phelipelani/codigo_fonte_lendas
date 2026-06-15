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
  min: number // segundos
}
const STAT0: Stat = { passeC: 0, passeE: 0, chuteC: 0, chuteE: 0, gols: 0, assist: 0, min: 0 }

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const x = s % 60
  return `${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}
function pct(a: number, b: number) {
  return a + b ? `${(Math.round((a / (a + b)) * 10000) / 100).toFixed(2)}%` : '0%'
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
  const [timeline, setTimeline] = useState<{ jid: number; nome: string; min: number }[]>([])
  const [subArm, setSubArm] = useState<number | null>(null) // id do reserva armado

  // cronometro
  const [seg, setSeg] = useState(0)
  const [tempo, setTempo] = useState(1)
  const [rodando, setRodando] = useState(false)
  const tituRef = useRef<Jogador[]>([])
  tituRef.current = titulares

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

  function upd(jid: number, campo: keyof Stat, d: number, isGol = false) {
    setStats((prev) => {
      const cur = prev[jid] ?? { ...STAT0 }
      const val = Math.max(0, (cur[campo] as number) + d)
      const next = { ...prev, [jid]: { ...cur, [campo]: val } }
      return next
    })
    if (isGol) {
      const j = titulares.find((x) => x.id === jid)
      if (d > 0 && j) setTimeline((t) => [{ jid, nome: j.nome, min: Math.floor(seg / 60) }, ...t])
      if (d < 0) setTimeline((t) => {
        const i = t.findIndex((e) => e.jid === jid)
        if (i < 0) return t
        const c = [...t]; c.splice(i, 1); return c
      })
    }
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

  const scoreNos = useMemo(
    () => Object.values(stats).reduce((a, s) => a + s.gols, 0),
    [stats],
  )
  const totais = useMemo(() => {
    let cc = 0, ce = 0, pc = 0, pe = 0
    Object.values(stats).forEach((s) => {
      cc += s.chuteC; ce += s.chuteE; pc += s.passeC; pe += s.passeE
    })
    return { cc, ce, pc, pe }
  }, [stats])

  const gkId = useMemo(() => titulares.find((j) => j.tipo === 'gk')?.id ?? null, [titulares])

  async function encerrar() {
    if (!confirm('Encerrar a partida e salvar as estatísticas?')) return
    const temStat = (s: Stat) =>
      s.min > 0 || s.gols || s.assist || s.passeC || s.passeE || s.chuteC || s.chuteE
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
        defesa: j.id === gkId ? defesas : 0,
        gol_sofrido: j.id === gkId ? golsSofridos : 0,
        min_jogados: Math.round(s.min / 60),
      }))
    const eventos = timeline.map((g) => ({ jogador_id: g.jid, tipo: 'gol', minuto: g.min, tempo }))
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
      <div className="mb-4 grid grid-cols-1 gap-4 rounded-2xl border border-night-cyan/20 bg-night-card/60 p-4 lg:grid-cols-[1fr_auto_1fr_1.1fr] lg:items-center">
        {/* nosso time */}
        <div>
          <div className="text-center text-xl font-extrabold text-night-cyan">{user?.clube?.nome ?? 'Nosso time'}</div>
          <div className="text-center text-5xl font-extrabold tabular-nums">{scoreNos}</div>
          <div className="mt-1 space-y-0.5 text-xs text-white/55">
            {timeline.slice(0, 5).map((g, i) => (
              <div key={i}>⚽ {g.nome} — {String(g.min).padStart(2, '0')}:00</div>
            ))}
          </div>
        </div>

        {/* timer */}
        <div className="mx-auto rounded-xl border border-campo-red/40 bg-campo-red/[0.08] px-5 py-2 text-center">
          <div className="text-xs font-bold tracking-wide text-red-300">{tempo}º TEMPO</div>
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
        <div className="space-y-1.5 text-sm">
          <TotRow label="Total de Chutes Certos" n={totais.cc} p={pct(totais.cc, totais.ce)} />
          <TotRow label="Total de Chutes Errados" n={totais.ce} p={pct(totais.ce, totais.cc)} />
          <TotRow label="Total de Passes Certos" n={totais.pc} p={pct(totais.pc, totais.pe)} />
          <TotRow label="Total de Passes Errados" n={totais.pe} p={pct(totais.pe, totais.pc)} />
        </div>
      </div>

      {subArm != null && (
        <div className="mb-3 rounded-lg border border-night-cyan/40 bg-night-cyan/10 px-3 py-2 text-center text-sm font-semibold text-night-cyan">
          Substituição: toque no titular que vai sair.{' '}
          <button onClick={() => setSubArm(null)} className="underline">cancelar</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_220px]">
        {/* ===== GRID DE CARDS ===== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {titulares.map((j) => (
            <Card
              key={j.id}
              j={j}
              st={stats[j.id] ?? STAT0}
              armado={subArm != null}
              onCard={() => subArm != null && substituir(j.id)}
              upd={(c, d, g) => upd(j.id, c, d, g)}
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

          {gkId != null && (
            <>
              <GkPanel titulo="Defesas" v={defesas} on={(d) => setDefesas((x) => Math.max(0, x + d))} />
              <GkPanel
                titulo="Gols Sofridos"
                v={golsSofridos}
                on={(d) => setGolsSofridos((x) => Math.max(0, x + d))}
              />
            </>
          )}

          <button onClick={encerrar} disabled={encerrando} className="btn-primary w-full">
            {encerrando ? 'Salvando…' : '⏹ Encerrar partida'}
          </button>
        </div>
      </div>
    </Layout>
  )
}

function TotRow({ label, n, p }: { label: string; n: number; p: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-night-cyan">▸</span>
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
  upd: (c: keyof Stat, d: number, isGol?: boolean) => void
  armado: boolean
  onCard: () => void
}) {
  const row = (label: string, v: number, c: keyof Stat, isGol = false) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <Step v={v} on={(d) => upd(c, d, isGol)} />
    </div>
  )
  return (
    <div
      onClick={onCard}
      className={`rounded-2xl border bg-night-card/70 p-3 transition ${
        armado ? 'cursor-pointer border-night-cyan/60 hover:bg-night-cyan/5' : 'border-night-cyan/20'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
        <span className="text-2xl font-extrabold tabular-nums text-night-cyan">{j.numero ?? '–'}</span>
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
        {row('Gols', st.gols, 'gols', true)}
        {row('Assist.', st.assist, 'assist')}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs text-white/45">
        <span>Min. Joga</span>
        <span className="rounded bg-white/5 px-2 py-0.5 font-bold tabular-nums text-white/80">{fmt(st.min)}</span>
      </div>
    </div>
  )
}

function GkPanel({ titulo, v, on }: { titulo: string; v: number; on: (d: number) => void }) {
  return (
    <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3 text-center">
      <div className="mb-2 font-extrabold">{titulo}</div>
      <div className="flex items-center justify-center">
        <Step v={v} on={on} />
      </div>
    </div>
  )
}
