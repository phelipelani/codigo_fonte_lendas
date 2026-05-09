// Arquivo: src/features/auth/routes/ResetPasswordPage.tsx
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/Button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import api from '@/api'

const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const { isSubmitting } = form.formState

  // Token ausente na URL
  if (!token) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <AnimatedBackground showWaves={true} showCircles={true} intensity="low" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md"
        >
          <div className="absolute -inset-1 rounded-3xl bg-red-500/20 blur-xl opacity-50" />
          <div className="relative rounded-2xl border border-red-500/30 bg-[#0a1628]/90 backdrop-blur-xl p-8 text-center shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
            <motion.div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </motion.div>
            <h1 className="mb-2 text-2xl font-black text-red-400">Link Inválido</h1>
            <p className="mb-6 text-cyan-100/50 text-sm">
              Este link de redefinição é inválido ou expirou.
            </p>
            <Link to="/auth/forgot-password">
              <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold border border-cyan-400/20">
                Solicitar novo link
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  async function onSubmit(values: ResetPasswordForm) {
    try {
      await api.post('/auth/reset-password', {
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
      setConcluido(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Token inválido ou expirado.'
      toast.error(msg)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AnimatedBackground
        variant="auth"
        showWaves={true}
        showCircles={true}
        showTriangles={true}
        intensity="medium"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 blur-xl opacity-60" />

        <div className="relative rounded-2xl border border-cyan-500/20 bg-[#0a1628]/80 backdrop-blur-xl p-8 shadow-2xl md:p-10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {!concluido ? (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 text-sm transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                Voltar para login
              </Link>

              {/* Header */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-8 text-center"
              >
                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/30">
                  <Lock className="h-8 w-8 text-cyan-400" />
                </div>
                <h1 className="mb-2 text-3xl font-black">
                  <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Nova Senha
                  </span>
                </h1>
                <p className="text-cyan-100/50 text-sm">
                  Digite e confirme sua nova senha abaixo.
                </p>
              </motion.div>

              {/* Formulário */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Nova senha */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyan-100/70 font-medium text-sm">
                          Nova Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                              <Lock size={18} />
                            </div>
                            <Input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isSubmitting}
                              className="pl-10 pr-12 h-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30
                                focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                                transition-all duration-300 rounded-xl"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  {/* Confirmar senha */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyan-100/70 font-medium text-sm">
                          Confirmar Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                              <Lock size={18} />
                            </div>
                            <Input
                              type={showConfirm ? 'text' : 'password'}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              disabled={isSubmitting}
                              className="pl-10 pr-12 h-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30
                                focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                                transition-all duration-300 rounded-xl"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 transition-colors"
                            >
                              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500
                        text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25
                        border border-cyan-400/20 transition-all duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Salvando...
                        </span>
                      ) : (
                        'Redefinir Senha'
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </>
          ) : (
            // Sucesso
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div
                className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </motion.div>
              <h2 className="mb-3 text-2xl font-black">
                <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  Senha redefinida!
                </span>
              </h2>
              <p className="text-cyan-100/50 text-sm mb-2">
                Sua senha foi alterada com sucesso.
              </p>
              <p className="text-cyan-100/30 text-xs">
                Redirecionando para o login...
              </p>
            </motion.div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        </div>
      </motion.div>
    </div>
  )
}