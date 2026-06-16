import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import HeroWave from '../components/HeroWave'

const A = import.meta.env.BASE_URL
const PAPEL_LABEL: Record<string, string> = { diretor: 'Diretor', tecnico: 'Técnico', jogador: 'Jogador' }

function Ic({ src, className = '' }: { src: string; className?: string }) {
  return <img src={src} alt="" className={`object-contain ${className}`} />
}

interface Partida {
  id: number
  dataHora: string | null
  status: 'agendada' | 'ao_vivo' | 'finalizada'
  placarNos: number
  placarEles: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jogadoresCount, setJogadoresCount] = useState<number | null>(null)
  const [partidas, setPartidas] = useState<Partida[]>([])

  const podeGerir = user?.papel === 'tecnico' || user?.papel === 'diretor'

  useEffect(() => {
    api.get<unknown[]>('/campo/jogadores').then((l) => setJogadoresCount(l.length)).catch(() => {})
    api.get<Partida[]>('/campo/partidas').then(setPartidas).catch(() => {})
  }, [])

  const resumo = useMemo(() => {
    const agora = Date.now()
    const parse = (dh: string | null) => {
      if (!dh) return null
      const d = new Date(dh.replace(' ', 'T')).getTime()
      return isNaN(d) ? null : d
    }
    const comT = partidas.map((p) => ({ p, t: parse(p.dataHora) })).filter((x) => x.t !== null) as {
      p: Partida
      t: number
    }[]
    const passadas = comT.filter((x) => x.t <= agora).sort((a, b) => b.t - a.t)
    const futuras = comT.filter((x) => x.t > agora).sort((a, b) => a.t - b.t)
    const dias = (t: number) => Math.max(0, Math.round(Math.abs(agora - t) / 86400000))
    const finalizadas = partidas.filter((p) => p.status === 'finalizada')
    const vit = finalizadas.filter((p) => p.placarNos > p.placarEles).length
    return {
      ultima: passadas[0] ? `${dias(passadas[0].t)} dias atrás` : '—',
      proximo: futuras[0] ? `${dias(futuras[0].t)} dias` : '—',
      desempenho: finalizadas.length ? Math.round((vit / finalizadas.length) * 100) + '%' : '—',
    }
  }, [partidas])

  if (!user) return null

  const cards = [
    { label: 'Partidas', desc: 'Gerencie e analise os jogos do time.', icon: A + 'icon_partidas.png', to: '/partidas' },
    ...(podeGerir
      ? [
          { label: 'Elenco', desc: 'Cadastre e gerencie os jogadores.', icon: A + 'icon_elenco.png', to: '/elenco' },
          { label: 'Adversários', desc: 'Conheça os times rivais.', icon: A + 'icon_adversarios.png', to: '/adversarios' },
        ]
      : []),
    { label: 'Relatórios', desc: 'Gere relatórios e insights em breve.', icon: A + 'icon_relatorios.png', disabled: true },
    { label: 'Agenda', desc: 'Veja os próximos compromissos.', icon: A + 'icon_agenda.png', disabled: true },
  ]

  return (
    <Layout active="inicio" title={PAPEL_LABEL[user.papel]} subtitle={user.nome} backdrop={<HeroWave scale={3} />}>
      <h2 className="text-2xl font-extrabold">Painel de Controle</h2>
      <p className="mb-6 mt-1 text-white/50">Acompanhe e gerencie todas as informações do clube.</p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="flex items-start gap-4">
                <Ic src={c.icon} className="h-16 w-14 flex-shrink-0 drop-shadow-[0_0_12px_rgba(47,227,218,0.35)]" />
                <div className="min-w-0 pt-1.5">
                  <div className="text-xl font-extrabold">{c.label}</div>
                  <div className="mt-1 text-sm leading-snug text-white/55">{c.desc}</div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-night-cyan/40">
                  <Ic src={A + 'icon_ir.png'} className="h-4 w-4" />
                </span>
              </div>
            </>
          )
          const cls =
            'rounded-2xl border border-night-cyan/20 bg-night-card/80 p-6 shadow-[0_0_40px_-22px_rgba(47,227,218,0.55)]'
          return c.disabled ? (
            <div key={c.label} className={cls}>
              {inner}
            </div>
          ) : (
            <button
              key={c.label}
              onClick={() => navigate(c.to!)}
              className={`${cls} text-left transition hover:border-night-cyan/45 hover:bg-night-card`}
            >
              {inner}
            </button>
          )
        })}
      </div>

      {/* ===== RESUMO RÁPIDO ===== */}
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-night-cyan/20 bg-night-card/70 p-5">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-lg text-night-cyan">⚡</span>
          <span className="inline-block border-b-2 border-night-cyan pb-1 text-base font-extrabold">Resumo rápido</span>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 lg:pr-48">
          <ResumoItem icon={A + 'icon_ultimas_partidas.png'} label="Última partida" valor={resumo.ultima} />
          <ResumoItem icon={A + 'icon_proximos_jogo.png'} label="Próximo jogo" valor={resumo.proximo} />
          <ResumoItem
            icon={A + 'icon_jogadores.png'}
            label="Jogadores"
            valor={jogadoresCount !== null ? String(jogadoresCount) : '—'}
          />
          <ResumoItem icon={A + 'icon_relatorios.png'} label="Relatórios" valor="Em breve" />
          <ResumoItem icon={A + 'icon_relatorios.png'} label="Desempenho" valor={resumo.desempenho} />
        </div>

        <svg
          viewBox="0 0 240 150"
          className="pointer-events-none absolute -bottom-2 right-3 hidden h-[125%] w-56 text-night-cyan/25 lg:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="6" y="10" width="228" height="130" rx="2" />
          <line x1="120" y1="10" x2="120" y2="140" />
          <circle cx="120" cy="75" r="22" />
          <rect x="6" y="48" width="34" height="54" />
          <rect x="200" y="48" width="34" height="54" />
          <circle cx="70" cy="60" r="2.5" fill="currentColor" />
          <circle cx="160" cy="95" r="2.5" fill="currentColor" />
          <circle cx="95" cy="105" r="2.5" fill="currentColor" />
        </svg>
      </div>
    </Layout>
  )
}

function ResumoItem({ icon, label, valor }: { icon: string; label: string; valor: string }) {
  return (
    <div className="flex items-center gap-3">
      <img src={icon} alt="" className="h-9 w-8 flex-shrink-0 object-contain" />
      <div className="min-w-0">
        <div className="truncate text-sm font-bold">{label}</div>
        <div className="truncate text-sm text-white/55">{valor}</div>
      </div>
    </div>
  )
}
