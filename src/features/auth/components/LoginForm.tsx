// Arquivo: src/features/auth/components/LoginForm.tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Loader2, User, Lock, LogIn } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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
import { useLogin } from '../api/useLogin'
import { LoginSchema } from '@/utils/schemas'
import { getApiErrorMessage } from '@/utils/errorHandling'
import { GOOGLE_AUTH_URL } from '@/utils/constants'

export function LoginForm() {
  const loginMutation = useLogin()

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  })

  function onSubmit(values: z.infer<typeof LoginSchema>) {
    loginMutation.mutate(values)
  }

  function handleGoogleLogin() {
    // Redireciona para o backend que vai redirecionar ao Google
    window.location.href = GOOGLE_AUTH_URL
  }

  return (
    <div className="space-y-5">
      {/* Botão Google */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
            text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
        >
          {/* Logo Google SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </Button>
      </motion.div>

      {/* Divisor */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-cyan-500/20" />
        <span className="text-xs text-cyan-100/30 font-medium uppercase tracking-widest">ou</span>
        <div className="flex-1 h-px bg-cyan-500/20" />
      </div>

      {/* Formulário username/email + senha */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

          {/* Campo login (username ou email) */}
          <FormField
            control={form.control}
            name="login"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-cyan-100/70 font-medium text-sm">
                  Usuário ou Email
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                      <User size={18} />
                    </div>
                    <Input
                      placeholder="Digite seu usuário ou email"
                      autoComplete="username"
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

          {/* Campo senha */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-cyan-100/70 font-medium text-sm">
                    Senha
                  </FormLabel>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50 group-focus-within:text-cyan-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
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

          {/* Mensagem de erro geral */}
          {loginMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center backdrop-blur-sm"
            >
              <p className="text-sm font-medium text-red-400">
                {getApiErrorMessage(loginMutation.error, 'Credenciais inválidas. Tente novamente.')}
              </p>
            </motion.div>
          )}

          {/* Botão submit */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500
                text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25
                border border-cyan-400/20 transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-600 disabled:hover:to-teal-600"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn size={18} />
                  Entrar
                </span>
              )}
            </Button>
          </motion.div>
        </form>
      </Form>
    </div>
  )
}