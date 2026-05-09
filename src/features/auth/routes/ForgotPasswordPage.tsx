// Arquivo: src/features/auth/routes/ForgotPasswordPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
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

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Informe um email válido.' }),
})

type ForgotPasswordForm = z.infer<typeof ForgotPasswordSchema>

export function ForgotPasswordPage() {
  const [enviado, setEnviado] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState('')

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: ForgotPasswordForm) {
    try {
      await api.post('/auth/forgot-password', { email: values.email })
      setEmailEnviado(values.email)
      setEnviado(true)
    } catch {
      // A API retorna 200 mesmo se o email não existir (segurança)
      // Então qualquer erro aqui é inesperado
      toast.error('Ocorreu um erro. Tente novamente.')
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
        {/* Glow externo */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 blur-xl opacity-60" />

        <div className="relative rounded-2xl border border-cyan-500/20 bg-[#0a1628]/80 backdrop-blur-xl p-8 shadow-2xl md:p-10">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Voltar para login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 text-sm transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Voltar para login
          </Link>

          {!enviado ? (
            <>
              {/* Header */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-8 text-center"
              >
                <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border border-cyan-500/30">
                  <Mail className="h-8 w-8 text-cyan-400" />
                </div>
                <h1 className="mb-2 text-3xl font-black">
                  <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Recuperar Senha
                  </span>
                </h1>
                <p className="text-cyan-100/50 text-sm leading-relaxed">
                  Digite o email da sua conta e enviaremos<br />
                  as instruções para redefinir sua senha.
                </p>
              </motion.div>

              {/* Formulário */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-cyan-100/70 font-medium text-sm">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                              <Mail size={18} />
                            </div>
                            <Input
                              type="email"
                              placeholder="seu@email.com"
                              autoComplete="email"
                              disabled={isSubmitting}
                              className="pl-10 h-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30
                                focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                                transition-all duration-300 rounded-xl"
                              {...field}
                            />
                            <div className="absolute inset-0 rounded-xl bg-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
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
                          Enviando...
                        </span>
                      ) : (
                        'Enviar instruções'
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </>
          ) : (
            // Estado de sucesso
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
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
                  Email enviado!
                </span>
              </h2>

              <p className="text-cyan-100/60 text-sm leading-relaxed mb-2">
                Se o email <strong className="text-white">{emailEnviado}</strong> estiver
                cadastrado, você receberá as instruções em breve.
              </p>
              <p className="text-cyan-100/40 text-xs mb-8">
                Verifique também a caixa de spam.
              </p>

              <Link to="/login">
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/50"
                >
                  Voltar para login
                </Button>
              </Link>
            </motion.div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        </div>
      </motion.div>
    </div>
  )
}