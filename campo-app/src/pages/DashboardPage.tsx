import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const PAPEL_LABEL: Record<string, string> = {
  diretor: 'Diretor',
  tecnico: 'Técnico',
  jogador: 'Jogador',
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  if (!user) return null

  const podeGerir = user.papel === 'tecnico' || user.papel === 'diretor'

  return (
    <div className="mx-auto max-w-2xl p-5">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{user.clube?.nome ?? 'Meu clube'}</h1>
          <p className="text-sm text-white/60">
            {user.nome} · {PAPEL_LABEL[user.papel]}
          </p>
        </div>
        <button onClick={logout} className="btn-ghost text-sm">
          Sair
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/partidas" className="card p-5 transition hover:bg-white/10">
          <div className="text-2xl">📋</div>
          <div className="mt-2 font-bold">Partidas</div>
          <div className="text-sm text-white/60">Jogos do time</div>
        </Link>
        {podeGerir && (
          <Link to="/elenco" className="card p-5 transition hover:bg-white/10">
            <div className="text-2xl">👥</div>
            <div className="mt-2 font-bold">Elenco</div>
            <div className="text-sm text-white/60">Cadastrar jogadores</div>
          </Link>
        )}
        {podeGerir && (
          <Link to="/adversarios" className="card p-5 transition hover:bg-white/10">
            <div className="text-2xl">🛡️</div>
            <div className="mt-2 font-bold">Adversários</div>
            <div className="text-sm text-white/60">Times rivais</div>
          </Link>
        )}
        <div className="card p-5 opacity-50">
          <div className="text-2xl">📊</div>
          <div className="mt-2 font-bold">Relatórios</div>
          <div className="text-sm text-white/60">Em breve</div>
        </div>
        {user.papel === 'diretor' && (
          <div className="card p-5 opacity-50">
            <div className="text-2xl">📅</div>
            <div className="mt-2 font-bold">Agenda</div>
            <div className="text-sm text-white/60">Em breve</div>
          </div>
        )}
      </div>
    </div>
  )
}
