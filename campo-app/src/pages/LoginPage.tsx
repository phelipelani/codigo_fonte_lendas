import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginStr, setLoginStr] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setBusy(true)
    try {
      await login(loginStr.trim(), password)
      navigate('/')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-campo-accent/20 text-2xl">
            ⚽
          </div>
          <h1 className="text-xl font-extrabold">Analista de Campo</h1>
          <p className="text-sm text-white/60">Entre com sua conta</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-white/70">Usuário ou e-mail</label>
            <input
              className="field"
              value={loginStr}
              onChange={(e) => setLoginStr(e.target.value)}
              autoCapitalize="none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Senha</label>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {erro && (
            <div className="rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
