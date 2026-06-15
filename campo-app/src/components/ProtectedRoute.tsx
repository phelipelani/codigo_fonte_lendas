import { Navigate } from 'react-router-dom'
import { useAuth, type Papel } from '../auth/AuthContext'
import type { ReactNode } from 'react'

export default function ProtectedRoute({
  children,
  papeis,
}: {
  children: ReactNode
  papeis?: Papel[]
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/70">Carregando…</div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (papeis && !papeis.includes(user.papel)) return <Navigate to="/" replace />

  return <>{children}</>
}
