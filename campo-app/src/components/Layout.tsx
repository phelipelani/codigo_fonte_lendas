import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const A = import.meta.env.BASE_URL
const LOGO = A + 'logo.png'
const PAPEL_LABEL: Record<string, string> = { diretor: 'Diretor', tecnico: 'Técnico', jogador: 'Jogador' }

export type MenuKey = 'inicio' | 'partidas' | 'elenco' | 'adversarios' | 'relatorios' | 'agenda' | 'estrategia' | ''

type MenuItem = { key: MenuKey; label: string; to?: string; icon?: string; emoji?: string; disabled?: boolean }

function Ic({ src, className = '' }: { src: string; className?: string }) {
  return <img src={src} alt="" className={`object-contain ${className}`} />
}

export default function Layout({
  active = '',
  title = '',
  subtitle,
  actions,
  hideNotif = false,
  bare = false,
  backdrop,
  children,
}: {
  active?: MenuKey
  title?: string
  subtitle?: string
  actions?: ReactNode
  hideNotif?: boolean
  bare?: boolean
  backdrop?: ReactNode
  children: ReactNode
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [colapsado, setColapsado] = useState(() => localStorage.getItem('campo_sidebar') === '1')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    localStorage.setItem('campo_sidebar', colapsado ? '1' : '0')
  }, [colapsado])

  if (!user) return null
  const podeGerir = user.papel === 'tecnico' || user.papel === 'diretor'

  const menu: MenuItem[] = [
    { key: 'inicio', label: 'Início', icon: A + 'icon_inicio.png', to: '/' },
    { key: 'partidas', label: 'Partidas', icon: A + 'icon_partidas_sidebar.png', to: '/partidas' },
    ...(podeGerir
      ? [
          { key: 'elenco', label: 'Elenco', icon: A + 'icon_elenco_sidebar.png', to: '/elenco' },
          { key: 'adversarios', label: 'Adversários', icon: A + 'icon_adversarios_sidebar.png', to: '/adversarios' },
        ] as MenuItem[]
      : []),
    { key: 'relatorios', label: 'Relatórios', icon: A + 'icon_relatorios_Sidebar.png', to: '/relatorios' },
    ...(podeGerir ? [{ key: 'estrategia', label: 'Estratégia', emoji: '♟️', to: '/estrategia' }] as MenuItem[] : []),
    { key: 'agenda', label: 'Agenda', icon: A + 'icon_agenda_sidebar.png', to: '/agenda' },
  ]

  const escudo = user.clube?.escudoUrl || LOGO

  return (
    <div
      className="relative flex min-h-screen gap-4 p-3 text-white md:p-4"
      style={{
        background: backdrop
          ? '#05070b'
          : 'radial-gradient(130% 80% at 50% -10%, #0e1622 0%, #080b12 45%, #05070b 100%)',
      }}
    >
      {backdrop && (
        <>
          <div className="pointer-events-none fixed inset-0 z-0">{backdrop}</div>
          <div className="pointer-events-none fixed inset-0 z-0 bg-[#05070b]/55" />
        </>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`relative z-10 hidden flex-shrink-0 flex-col rounded-3xl border border-night-cyan/15 bg-night-panel/70 p-4 shadow-[0_0_60px_-30px_rgba(47,227,218,0.6)] backdrop-blur-sm transition-[width] duration-200 md:flex ${
          colapsado ? 'w-[78px] items-center' : 'w-64'
        }`}
      >
        <button
          onClick={() => setColapsado((v) => !v)}
          title={colapsado ? 'Expandir menu' : 'Minimizar menu'}
          className={`absolute top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-night-panel text-white/60 transition hover:bg-white/10 hover:text-white ${
            colapsado ? 'right-1/2 translate-x-1/2' : 'right-3'
          }`}
        >
          {colapsado ? '»' : '«'}
        </button>

        <div className={`flex flex-col items-center text-center ${colapsado ? 'mb-4 mt-9' : 'mb-6 pt-3'}`}>
          <img
            src={escudo}
            alt=""
            className={`object-contain drop-shadow-[0_8px_28px_rgba(47,227,218,0.3)] ${colapsado ? 'h-12 w-12' : 'mb-3 h-24 w-24'}`}
          />
          {!colapsado && (
            <>
              <div className="text-lg font-extrabold uppercase tracking-wide">{user.clube?.nome}</div>
              <div className="mt-0.5 text-[10px] font-bold tracking-[0.22em] text-night-cyan">ANALISTA DE CAMPO</div>
            </>
          )}
        </div>

        <nav className="flex w-full flex-col gap-1.5">
          {menu.map((m) => {
            const content = (
              <>
                {m.emoji ? (
                  <span className="flex h-6 w-6 items-center justify-center text-lg leading-none">{m.emoji}</span>
                ) : (
                  <Ic src={m.icon!} className="h-6 w-6" />
                )}
                {!colapsado && <span>{m.label}</span>}
              </>
            )
            const base = `flex items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition ${
              colapsado ? 'justify-center px-0' : 'px-4'
            }`
            if (m.disabled)
              return (
                <span key={m.key} title={colapsado ? m.label : undefined} className={`${base} cursor-not-allowed text-white/35`}>
                  {content}
                </span>
              )
            return (
              <Link
                key={m.key}
                to={m.to!}
                title={colapsado ? m.label : undefined}
                className={`${base} ${
                  active === m.key
                    ? 'border border-night-cyan/45 bg-night-cyan/10 text-night-cyan shadow-[0_0_20px_-6px_rgba(47,227,218,0.5)]'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {content}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        <div className="relative w-full space-y-2" ref={menuRef}>
          {menuAberto && podeGerir && (
            <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-night-cyan/25 bg-night-panel shadow-xl">
              <button
                onClick={() => {
                  setMenuAberto(false)
                  navigate('/convidar')
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
              >
                ✉️ Convidar
              </button>
            </div>
          )}
          <button
            onClick={() => setMenuAberto((v) => !v)}
            title={colapsado ? `${PAPEL_LABEL[user.papel]} · ${user.nome}` : undefined}
            className={`flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-left ${
              colapsado ? 'justify-center px-0' : 'px-3'
            }`}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
              <Ic src={A + 'icon_user.png'} className="h-6 w-6" />
            </span>
            {!colapsado && (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{PAPEL_LABEL[user.papel]}</div>
                  <div className="truncate text-xs text-white/55">{user.nome}</div>
                </div>
                <Ic src={A + 'icon_seta_baixo.png'} className="h-4 w-4 opacity-70" />
              </>
            )}
          </button>
          <button
            onClick={logout}
            title={colapsado ? 'Sair' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 hover:text-white ${
              colapsado ? 'justify-center px-0' : 'px-4'
            }`}
          >
            <Ic src={A + 'icon_exit.png'} className="h-5 w-5" />
            {!colapsado && 'Sair'}
          </button>
        </div>
      </aside>

      {/* ===== CONTEÚDO ===== */}
      <main className="relative z-10 min-w-0 flex-1 px-2 py-4 md:px-6 md:py-6">
        {!bare && (
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-lg md:hidden"
            >
              ←
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-extrabold md:text-[2.4rem] md:leading-tight">{title}</h1>
              {subtitle && <p className="mt-0.5 truncate text-white/55">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {actions}
            {!hideNotif && (
              <button className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:px-4">
                <Ic src={A + 'icon_notificacao.png'} className="h-5 w-5" />
                <span className="hidden sm:inline">Notificações</span>
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-night-cyan text-[11px] font-bold text-[#000407]">
                  3
                </span>
              </button>
            )}
          </div>
        </div>
        )}

        {children}
      </main>
    </div>
  )
}
