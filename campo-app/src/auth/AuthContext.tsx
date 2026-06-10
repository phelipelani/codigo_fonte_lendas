import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'

export type Papel = 'diretor' | 'tecnico' | 'jogador'

export interface Clube {
  id: number
  nome: string
  escudoUrl: string | null
}

export interface CampoUser {
  id: number
  nome: string
  email: string | null
  papel: Papel
  jogadorId: number | null
  clube: Clube | null
}

interface AuthState {
  user: CampoUser | null
  loading: boolean
  login: (login: string, password: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthState>(null as unknown as AuthState)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CampoUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = tokenStore.get()
    if (!t) {
      setLoading(false)
      return
    }
    api
      .get<CampoUser>('/campo/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  async function login(loginStr: string, password: string) {
    const res = await api.post<{ token: string; user: CampoUser }>('/campo/auth/login', {
      login: loginStr,
      password,
    })
    tokenStore.set(res.token)
    setUser(res.user)
  }

  function logout() {
    tokenStore.clear()
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
