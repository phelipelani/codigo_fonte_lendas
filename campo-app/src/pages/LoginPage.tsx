import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { API_BASE } from '../lib/api'

const ERRO_MSG: Record<string, string> = {
  nao_convidado: 'Esse e-mail não tem convite. Peça acesso ao diretor do clube.',
  conta_inativa: 'Conta inativa. Fale com o diretor do clube.',
  falha_google: 'Não foi possível entrar com o Google. Tente novamente.',
}

const LOGO = import.meta.env.BASE_URL + 'logo.png'
const BG = import.meta.env.BASE_URL + 'estadio.webp'

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" strokeLinecap="round" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" strokeLinecap="round" />
    </svg>
  )
}
function IconEye({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M3 3l18 18" strokeLinecap="round" />}
    </svg>
  )
}
function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5Z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36.2 44 30.7 44 24c0-1.2-.1-2.4-.4-3.5Z" />
    </svg>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loginStr, setLoginStr] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [erro, setErro] = useState(() => {
    const e = params.get('erro')
    return e ? ERRO_MSG[e] ?? 'Falha ao entrar.' : ''
  })
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  function entrarComGoogle() {
    window.location.href = `${API_BASE}/campo/auth/google`
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setInfo('')
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
    <div
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${BG})` }}
    >
      {/* escurece a foto pra dar contraste ao form */}
      <div className="absolute inset-0 bg-[#03161a]/45" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-night-cyan/25 bg-night-panel/80 p-7 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src={LOGO}
                alt="Logo"
                className="mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg"
              />
              <h1 className="text-2xl font-extrabold">Bem-vindo de volta!</h1>
              <p className="mt-1 text-sm text-white/60">Acesse sua conta para continuar</p>
            </div>

            {erro && (
              <div className="mb-3 rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
            )}
            {info && (
              <div className="mb-3 rounded-lg border border-night-cyan/40 bg-night-cyan/10 px-3 py-2 text-sm text-night-cyan">
                {info}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Usuário ou e-mail</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#000407]/45">
                    <IconUser />
                  </span>
                  <input
                    className="field h-12 pl-11"
                    placeholder="Digite seu usuário ou e-mail"
                    value={loginStr}
                    onChange={(e) => setLoginStr(e.target.value)}
                    autoCapitalize="none"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white/80">Senha</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#000407]/45">
                    <IconLock />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="field h-12 pl-11 pr-11"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#000407]/45 hover:text-[#000407]/70"
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <IconEye off={showPass} />
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setInfo('Para redefinir a senha, fale com o diretor do clube.')
                  }
                  className="text-sm font-medium text-night-cyan hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-night-cyan to-[#54f0c6] font-bold text-[#000407] shadow-lg transition active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? 'Entrando…' : 'Entrar'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-white/40">
              <div className="h-px flex-1 bg-white/10" />
              ou continue com
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={entrarComGoogle}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 font-semibold text-white transition hover:bg-white/10"
            >
              <IconGoogle />
              Entrar com Google
            </button>

            <p className="mt-5 text-center text-sm text-white/60">
              Ainda não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => setInfo('Peça seu acesso ao diretor do clube.')}
                className="font-bold text-night-cyan hover:underline"
              >
                Criar conta
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
