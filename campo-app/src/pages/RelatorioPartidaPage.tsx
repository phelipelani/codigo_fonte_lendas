import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import Layout from '../components/Layout'

interface Partida {
  id: number
  dataHora: string | null
  local: string
  localNome: string | null
  localBairro: string | null
  competicao: string | null
  status: string
  placarNos: number
  placarEles: number
  adversarioNome: string | null
}
interface JogStat {
  jogadorId: number
  nome: string
  numero: number | null
  posicao: string
  tipo: 'atk' | 'mid' | 'def' | 'gk'
  passeCerto: number
  passeErrado: number
  chuteCerto: number
  chuteErrado: number
  gols: number
  assist: number
  defesa: number
  golSofrido: number
  amarelo: number
  vermelho: number
  minJogados: number
}
interface Evento {
  tipo: string
  minuto: number | null
  tempo: number
  jogadorId: number | null
  nome: string | null
}
interface Totais {
  chuteCerto: number
  chuteErrado: number
  passeCerto: number
  passeErrado: number
  defesas: number
  gols: number
  assist: number
}
interface Relatorio {
  partida: Partida
  jogadores: JogStat[]
  eventos: Evento[]
  totais: Totais
}

const LOCAL_LABEL: Record<string, string> = { casa: 'Casa', fora: 'Fora', neutro: 'Neutro' }
const EV_ICON: Record<string, string> = { gol: '⚽', amarelo: '🟨', vermelho: '🟥', defesa: '🧤', gol_sofrido: '🥅' }

function pct(a: number, b: number) {
  if (!(a + b)) return '0%'
  return `${(Math.round((a / (a + b)) * 1000) / 10).toFixed(1).replace('.', ',')}%`
}
function fmtData(dh: string | null) {
  if (!dh) return 'Data a definir'
  const d = new Date(dh.replace(' ', 'T'))
  return isNaN(d.getTime()) ? dh : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RelatorioPartidaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rel, setRel] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api
      .get<Relatorio>(`/campo/partidas/${id}/relatorio`)
      .then(setRel)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false))
  }, [id])

  const nosso = user?.clube?.nome ?? 'Nosso time'
  const p = rel?.partida
  const t = rel?.totais

  return (
    <Layout
      active="partidas"
      title="Relatório da partida"
      subtitle={p ? `${nosso} ${p.placarNos}–${p.placarEles} ${p.adversarioNome ?? 'Adversário'}` : undefined}
      hideNotif
      actions={
        <button onClick={() => navigate('/partidas')} className="btn-ghost h-11 text-sm">← Partidas</button>
      }
    >
      {erro && (
        <div className="mb-3 rounded-lg border border-campo-red/40 bg-campo-red/15 px-3 py-2 text-sm text-red-200">{erro}</div>
      )}

      {loading ? (
        <p className="text-white/60">Carregando…</p>
      ) : !rel || !p ? (
        <div className="card p-8 text-center text-white/60">Relatório indisponível.</div>
      ) : (
        <div className="space-y-4">
          {/* ===== PLACAR ===== */}
          <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 bg-gradient-to-b from-white/[0.03] to-transparent p-5">
            <div className="flex items-center justify-center gap-6">
              <div className="flex-1 text-right">
                <div className="text-lg font-extrabold text-night-cyan">{nosso}</div>
              </div>
              <div className="text-4xl font-extrabold tabular-nums">
                {p.placarNos} <span className="text-white/40">–</span> {p.placarEles}
              </div>
              <div className="flex-1 text-left">
                <div className="text-lg font-extrabold">{p.adversarioNome ?? 'Adversário'}</div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-white/55">
              <span>{fmtData(p.dataHora)}</span>
              <span>· {LOCAL_LABEL[p.local] ?? p.local}</span>
              {p.localNome && <span>· 📍 {p.localNome}{p.localBairro ? ` — ${p.localBairro}` : ''}</span>}
              {p.competicao && <span>· {p.competicao}</span>}
            </div>
          </div>

          {/* ===== TOTAIS ===== */}
          {t && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Tot label="Chutes certos" n={t.chuteCerto} p={pct(t.chuteCerto, t.chuteErrado)} />
              <Tot label="Chutes errados" n={t.chuteErrado} p={pct(t.chuteErrado, t.chuteCerto)} />
              <Tot label="Passes certos" n={t.passeCerto} p={pct(t.passeCerto, t.passeErrado)} />
              <Tot label="Passes errados" n={t.passeErrado} p={pct(t.passeErrado, t.passeCerto)} />
              <Tot label="Defesas do goleiro" n={t.defesas} />
            </div>
          )}

          {/* ===== JOGADORES ===== */}
          <div className="overflow-x-auto rounded-2xl border border-night-cyan/20 bg-night-card/60">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-white/45">
                  <th className="px-3 py-2 text-left font-bold">Jogador</th>
                  <th className="px-2 py-2 text-center font-bold">Min</th>
                  <th className="px-2 py-2 text-center font-bold">Passe C/E</th>
                  <th className="px-2 py-2 text-center font-bold">Chute C/E</th>
                  <th className="px-2 py-2 text-center font-bold">G</th>
                  <th className="px-2 py-2 text-center font-bold">A</th>
                  <th className="px-2 py-2 text-center font-bold">🟨</th>
                  <th className="px-2 py-2 text-center font-bold">🟥</th>
                  <th className="px-2 py-2 text-center font-bold">Def</th>
                </tr>
              </thead>
              <tbody>
                {rel.jogadores.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-white/40">Sem estatísticas registradas.</td></tr>
                ) : (
                  rel.jogadores.map((j) => (
                    <tr key={j.jogadorId} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-right text-xs font-bold tabular-nums text-night-cyan">{j.numero ?? '–'}</span>
                          <span className="font-semibold">{j.nome}</span>
                          <span className="text-[10px] font-bold uppercase text-white/40">{j.posicao}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums text-white/70">{j.minJogados}'</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.passeCerto}/{j.passeErrado}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.chuteCerto}/{j.chuteErrado}</td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums text-night-cyan">{j.gols || ''}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.assist || ''}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.amarelo || ''}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.vermelho || ''}</td>
                      <td className="px-2 py-2 text-center tabular-nums">{j.tipo === 'gk' ? j.defesa : ''}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ===== EVENTOS ===== */}
          <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">Linha do tempo</div>
            {rel.eventos.length === 0 ? (
              <p className="py-2 text-center text-xs text-white/40">Nenhum evento registrado.</p>
            ) : (
              <ul className="space-y-1">
                {rel.eventos.map((e, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-white/5">
                    <span>{EV_ICON[e.tipo] ?? '•'}</span>
                    <span className="min-w-0 flex-1 truncate text-white/80">
                      {e.nome ?? (e.tipo === 'gol_sofrido' ? 'Gol sofrido' : '—')}
                    </span>
                    <span className="text-xs tabular-nums text-white/45">
                      {e.tempo}ºT{e.minuto != null ? ` ${e.minuto}'` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

function Tot({ label, n, p }: { label: string; n: number; p?: string }) {
  return (
    <div className="rounded-2xl border border-night-cyan/20 bg-night-card/60 p-3 text-center">
      <div className="text-2xl font-extrabold tabular-nums">{n}</div>
      {p && <div className="text-xs font-bold text-night-cyan">{p}</div>}
      <div className="mt-0.5 text-[11px] text-white/55">{label}</div>
    </div>
  )
}
