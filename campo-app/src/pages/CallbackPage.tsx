import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { tokenStore } from '../lib/api'

export default function CallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    const erro = params.get('erro')
    if (token) {
      tokenStore.set(token)
      // recarrega na raiz para o AuthProvider buscar o usuário com o token
      window.location.href = import.meta.env.BASE_URL
    } else {
      navigate('/login?erro=' + encodeURIComponent(erro || 'falha'), { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="flex h-full items-center justify-center text-white/70">Entrando…</div>
}
