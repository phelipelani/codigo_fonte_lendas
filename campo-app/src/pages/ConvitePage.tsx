import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, tokenStore } from '../lib/api'

const LOGO = import.meta.env.BASE_URL + 'logo.png'
const PAPEL_LABEL: Record<string, string> = { diretor: 'Diretor', tecnico: 'Técnico', jogador: 'Jogador' }

interface Convite {
  papel: string
  clube: string | null
  email: string | null
  jogadorNome: string | null
}

export default function ConvitePage() {
  const { token } = useParams()
  const [info, setInfo] = useState<Convite | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroFatal, setErroFatal] = useState('')
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<Convite>(`/campo/convites/${token}`)
      .then((d) => {
        setInfo(d)
        if (d.jogadorNome) setNome(d.jogadorNome)
        if (d.email) setEmail(d.email)
      })
      .catch((e) => setErroFatal(e instanceof Error ? e.message : 'Convite inválido.'))
      .finally(() => setCarregando(false))
  }, [token])

  async function ativar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setBusy(true)
    try {
      const r = await api.post<{ token: string }>(`/campo/convites/${token}/ativar`, {
        nome,
        email: email || null,
        password,
      })
      tokenStore.set(r.token)
      window.location.href = import.meta.env.BASE_URL
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao ativar a conta.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <img src={LOGO} alt="" className="mb-3 h-16 w-16 rounded-2xl object-cover" />
          <h1 className="text-xl font-extrabold">Ativar conta</h1>
          {info && (
            <p className="mt-1 text-sm text-white/60">
              {info.clube} · {PAPEL_LABEL[info.papel] ?? info.papel}
            </p>
          )}
        </div>

        {carregando ? (
          <p className="text-center text-white/60">Validando convite…</p>
        ) : erroFatal ? (
          <>
            <div className="mb-3 rounded-lg bg-campo-red/20 px-3 py-2 text-center text-sm text-red-200">
              {erroFatal}
            </div>
            <Link to="/login" className="btn-ghost w-full">
              Ir para o login
            </Link>
          </>
        ) : (
          <form onSubmit={ativar} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-white/70">Seu nome</label>
              <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">E-mail (opcional)</label>
              <input
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Para entrar com Google depois"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">Crie uma senha</label>
              <input
                type="password"
                className="field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            {erro && (
              <div className="rounded-lg bg-campo-red/20 px-3 py-2 text-sm text-red-200">{erro}</div>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Ativando…' : 'Criar minha conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
