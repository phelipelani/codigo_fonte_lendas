// Arquivo: src/features/auth/routes/AuthCallbackPage.tsx
//
// Esta página é carregada quando o Google redireciona de volta para:
// https://futlendas.com.br/auth/callback#token=xxxxx
//
// O backend coloca o token JWT no hash da URL.
// Esta página lê o token, salva no store e redireciona para a home.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import { useGoogleCallbackToken } from '../api/useLogin'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { processToken } = useGoogleCallbackToken()

  useEffect(() => {
    // Lê o token do hash da URL: /auth/callback#token=xxxxx
    const hash = window.location.hash // ex: "#token=eyJhb..."
    const params = new URLSearchParams(hash.replace('#', '?'))
    const token = params.get('token')

    if (token) {
      processToken(token)
    } else {
      // Sem token no hash — erro no fluxo OAuth
      navigate('/login?error=google_failed', { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AnimatedBackground showWaves={true} showCircles={true} intensity="low" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="relative mb-6">
          <Loader2 className="mx-auto h-16 w-16 animate-spin text-cyan-400" />
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="text-cyan-100/70 font-medium text-lg">Finalizando login com Google...</p>
        <p className="text-cyan-100/40 text-sm mt-2">Você será redirecionado em instantes</p>
      </motion.div>
    </div>
  )
}