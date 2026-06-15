import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import Layout from '../components/Layout'

interface Relatorio {
  resumo: { partidas: number; vitorias: number; empates: number; derrotas: number; golsMarcados: number; golsSofridos: number }
  totais: Record<string, number>
  precisaoPasse: number
  medias: { finalizacoes: number; desarmes: number; interceptacoes: number; faltas: number; golsPro: number; golsContra: number }
  partidas: {
    partidaId: number
    data: string | null
    adversario: string | null
    escudoUrl: string | null
    placarNos: number
    placarEles: number
    resultado: 'V' | 'E' | 'D'
    finalizacoes: number
    precisaoPasse: number
  }[]
}

const RES_COR: Record<string, string> = {
  V: 'bg-emerald-600/80 text-white',
  E: 'bg-white/15 text-white/80',
  D: 'bg-red-600/80 text-white',
}

function fmtData(dh: string | null) {
  if (!dh) return '—'
  const d = new Date(dh.replace(' ', 'T'))
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

function Donut({ pct, color = '#2fe3da', children }: { pct: number; color?: string; children?: React.ReactNode }) {
  const size = 170, stroke = 16, r = (size - stroke) / 2, c = 2 * Math.PI * r
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, pct) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

function Radar({ eixos }: { eixos: { label: string; valor: string; n: number }[] }) {
  const size = 230, cx = size / 2, cy = size / 2, R = 80, N = eixos.length
  const pt = (i: number, rr: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]
  }
  const grids = [0.25, 0.5, 0.75, 1].map((k) =>
    eixos.map((_, i) => pt(i, R * k).join(',')).join(' '),
  )
  const dados = eixos.map((e, i) => pt(i, R * Math.max(0.04, Math.min(1, e.n))).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size + 30}`} className="mx-auto w-full max-w-[15rem]">
      {grids.map((g, i) => (
        <polygon key={i} points={g} fill="none" stroke="rgba(47,227,218,0.15)" strokeWidth="1" />
      ))}
      {eixos.map((_, i) => {
        const [x, y] = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(47,227,218,0.12)" />
      })}
      <polygon points={dados} fill="rgba(47,227,218,0.22)" stroke="#2fe3da" strokeWidth="1.5" />
      {eixos.map((e, i) => {
        const [x, y] = pt(i, R + 16)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" className="fill-white/55 text-[8px]">
            <tspan x={x} dy="0">{e.label}</tspan>
            <tspan x={x} dy="9" className="fill-night-cyan font-bold">{e.valor}</tspan>
          </text>
        )
      })}
    </svg>
  )
}

export default function RelatoriosPage() {
  const [aba, setAba] = useState<'geral' | 'partidas'>('geral')
  const [rel, setRel] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .get<Relatorio>('/campo/relatorios')
      .then(setRel)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const r = rel
  const np = r?.resumo.partidas ?? 0
  const pctDe = (n: number) => (np ? `${((n / np) * 100).toFixed(2)}%` : '0%')

  const radar = useMemo(() => {
    if (!r) return []
    return [
      { label: 'Posse', valor: '—', n: 0 },
      { label: 'Finalizações', valor: String(r.medias.finalizacoes), n: r.medias.finalizacoes / 25 },
      { label: 'Precisão Passe', valor: `${r.precisaoPasse}%`, n: r.precisaoPasse / 100 },
      { label: 'Desarmes', valor: String(r.medias.desarmes), n: r.medias.desarmes / 25 },
      { label: 'Faltas', valor: String(r.medias.faltas), n: r.medias.faltas / 20 },
    ]
  }, [r])

  return (
    <Layout
      active="relatorios"
      title="Relatórios"
      subtitle="Análises detalhadas do desempenho da equipe."
      hideNotif
      actions={
        <button className="hidden h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 hover:bg-white/10 sm:flex">
          ⚙ Filtros
        </button>
      }
    >
      {/* abas */}
      <div className="mb-5 flex gap-6 border-b border-white/10">
        {(['geral', 'partidas'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-bold transition ${
              aba === a ? 'border-night-cyan text-night-cyan' : 'border-transparent text-white/55 hover:text-white'
            }`}
          >
            {a === 'geral' ? 'Relatório Geral' : 'Partidas'}
          </button>
        ))}
      </div>

      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}
      {loading || !r ? (
        <p className="text-white/60">Carregando…</p>
      ) : np === 0 ? (
        <div className="card p-10 text-center text-white/55">
          Nenhuma partida finalizada ainda. Os relatórios aparecem depois que você anotar e encerrar um jogo.
        </div>
      ) : aba === 'geral' ? (
        <div className="space-y-5">
          {/* cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat n={r.resumo.partidas} label="Partidas Analisadas" />
            <Stat n={r.resumo.vitorias} sub={pctDe(r.resumo.vitorias)} label="Vitórias" cor="text-emerald-400" />
            <Stat n={r.resumo.empates} sub={pctDe(r.resumo.empates)} label="Empates" />
            <Stat n={r.resumo.derrotas} sub={pctDe(r.resumo.derrotas)} label="Derrotas" cor="text-red-400" />
            <Stat
              n={`${r.resumo.golsMarcados} / ${r.resumo.golsSofridos}`}
              sub={`Média: ${r.medias.golsPro} / ${r.medias.golsContra}`}
              label="Gols Marcados / Sofridos"
            />
          </div>

          {/* gráficos */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-5">
              <div className="mb-3 font-extrabold">Desempenho</div>
              <Radar eixos={radar} />
            </div>

            <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-5">
              <div className="mb-3 font-extrabold">Gols</div>
              <Donut pct={r.resumo.golsMarcados + r.resumo.golsSofridos ? (r.resumo.golsMarcados / (r.resumo.golsMarcados + r.resumo.golsSofridos)) * 100 : 0}>
                <div className="text-3xl font-extrabold">{r.resumo.golsMarcados}</div>
                <div className="text-xs text-white/55">Gols Marcados</div>
              </Donut>
              <div className="mt-3 flex justify-around text-center text-sm">
                <div>
                  <div className="font-bold text-night-cyan">{r.resumo.golsMarcados}</div>
                  <div className="text-xs text-white/50">Marcados</div>
                </div>
                <div>
                  <div className="font-bold text-white/70">{r.resumo.golsSofridos}</div>
                  <div className="text-xs text-white/50">Sofridos</div>
                </div>
                <div>
                  <div className="font-bold">{r.totais.assist ?? 0}</div>
                  <div className="text-xs text-white/50">Assist.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-5">
              <div className="mb-3 font-extrabold">Precisão de Passe</div>
              <Donut pct={r.precisaoPasse}>
                <div className="text-3xl font-extrabold">{r.precisaoPasse}%</div>
                <div className="text-xs text-white/55">Precisão Média</div>
              </Donut>
              <div className="mt-3 flex justify-around text-center text-sm">
                <div>
                  <div className="font-bold text-night-cyan">{r.totais.passe_certo ?? 0}</div>
                  <div className="text-xs text-white/50">Passe Certos</div>
                </div>
                <div>
                  <div className="font-bold text-red-400">{r.totais.passe_errado ?? 0}</div>
                  <div className="text-xs text-white/50">Passe Errados</div>
                </div>
              </div>
            </div>
          </div>

          {/* métricas defensivas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <PartidasTabela partidas={r.partidas.slice(0, 5)} titulo="Últimas Partidas" />
            <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-5">
              <div className="mb-4 font-extrabold">Métricas Defensivas</div>
              <Metrica label="Desarmes por partida" v={r.medias.desarmes} />
              <Metrica label="Interceptações por partida" v={r.medias.interceptacoes} />
              <Metrica label="Faltas cometidas por partida" v={r.medias.faltas} />
              <Metrica label="Cartões Amarelos" v={r.totais.amarelo ?? 0} cor="text-yellow-400" />
              <Metrica label="Cartões Vermelhos" v={r.totais.vermelho ?? 0} cor="text-red-400" />
            </div>
          </div>
        </div>
      ) : (
        <PartidasTabela partidas={r.partidas} titulo={`Todas as partidas (${r.partidas.length})`} />
      )}
    </Layout>
  )
}

function Stat({ n, label, sub, cor }: { n: number | string; label: string; sub?: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-night-cyan/15 bg-night-card/60 p-4">
      <div className={`text-3xl font-extrabold leading-none ${cor ?? ''}`}>{n}</div>
      {sub && <div className="mt-0.5 text-xs font-bold text-white/60">{sub}</div>}
      <div className="mt-0.5 text-xs leading-tight text-white/55">{label}</div>
    </div>
  )
}

function Metrica({ label, v, cor }: { label: string; v: number; cor?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 last:border-0">
      <span className="text-sm text-white/70">{label}</span>
      <span className={`font-bold tabular-nums ${cor ?? 'text-white'}`}>{v}</span>
    </div>
  )
}

function PartidasTabela({ partidas, titulo }: { partidas: Relatorio['partidas']; titulo: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-night-cyan/15 bg-night-card/60">
      <div className="border-b border-white/10 px-5 py-3 font-extrabold">{titulo}</div>
      {partidas.length === 0 ? (
        <p className="p-6 text-center text-white/50">Sem partidas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-white/45">
                <th className="px-4 py-2 font-bold">Data</th>
                <th className="px-4 py-2 font-bold">Adversário</th>
                <th className="px-4 py-2 font-bold">Resultado</th>
                <th className="px-4 py-2 font-bold">Gols (GF/GS)</th>
                <th className="px-4 py-2 font-bold">Finalizações</th>
                <th className="px-4 py-2 font-bold">Precisão</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <tr key={p.partidaId} className="border-t border-white/5">
                  <td className="px-4 py-2.5 text-white/70">{fmtData(p.data)}</td>
                  <td className="px-4 py-2.5 font-semibold">{p.adversario ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${RES_COR[p.resultado]}`}>
                      {p.resultado}
                    </span>{' '}
                    <span className="text-white/70">{p.placarNos}–{p.placarEles}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white/70">{p.placarNos} / {p.placarEles}</td>
                  <td className="px-4 py-2.5 text-white/70">{p.finalizacoes}</td>
                  <td className="px-4 py-2.5 text-white/70">{p.precisaoPasse}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
