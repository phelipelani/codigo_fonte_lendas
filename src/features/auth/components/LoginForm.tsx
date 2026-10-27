// Arquivo: src/features/auth/components/LoginForm.tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, AlertCircle, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginSchema, type LoginFormData } from '../schemas/login.schema'
import { useLogin } from '../api/useLogin'
import { getApiErrorMessage } from '@/utils/errorHandling'
import { GOOGLE_AUTH_URL } from '@/utils/constants'
import { ehNativo, loginGoogleNativo } from '@/lib/native'

interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = () => {
  const loginMutation = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
      rememberMe: false,
    },
    mode: 'onBlur',
  })

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      login: data.login.trim(),
      password: data.password,
    })
  }

  const handleGoogleLogin = () => {
    if (ehNativo()) {
      // no APK mobile: abre no navegador in-app; o OAuth volta por deep link (?app=1)
      void loginGoogleNativo(`${GOOGLE_AUTH_URL}?app=1`)
    } else {
      // web: redireciona para o backend que vai redirecionar ao Google
      window.location.href = GOOGLE_AUTH_URL
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Botão Oficial de Login com Google */}
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-12 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/15 hover:border-white/30 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-sm sm:text-base shadow-lg shadow-black/40 group cursor-pointer"
        >
          {/* Logo Oficial do Google em SVG */}
          <svg width="20" height="20" viewBox="0 0 18 18" className="flex-shrink-0 transition-transform group-hover:scale-110">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
            />
          </svg>
          <span>Continuar com o Google</span>
        </button>
      </motion.div>

      {/* Divisor Visual */}
      <div className="relative flex items-center justify-center my-5">
        <div className="w-full border-t border-white/10" />
        <span className="absolute bg-[#0f0f16] px-3 text-[10px] sm:text-xs uppercase font-bold tracking-widest text-slate-400">
          ou com usuário e senha
        </span>
      </div>

      {/* Alerta de Erro da API */}
      {loginMutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-xs sm:text-sm text-red-300 backdrop-blur-sm"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <span>
            {getApiErrorMessage(loginMutation.error, 'Credenciais inválidas. Verifique seu usuário e senha.')}
          </span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Campo de Usuário ou E-mail */}
        <div className="space-y-1.5">
          <label
            htmlFor="login-identifier"
            className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300"
          >
            Usuário ou E-mail
          </label>
          <Input
            id="login-identifier"
            type="text"
            placeholder="Digite seu usuário ou e-mail"
            autoComplete="username"
            leftIcon={<User className="h-4 w-4 text-slate-400" />}
            error={!!errors.login}
            aria-describedby={errors.login ? "login-error" : undefined}
            {...register('login')}
          />
          {errors.login && (
            <p
              id="login-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#ff3366] pt-1"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{errors.login.message}</span>
            </p>
          )}
        </div>

        {/* Campo de Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300"
            >
              Senha de Acesso
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-xs font-medium text-slate-400 hover:text-[#ff007f] transition-colors focus:outline-none focus:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <PasswordInput
            id="login-password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#ff3366] pt-1"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{errors.password.message}</span>
            </p>
          )}
        </div>

        {/* Lembrar-me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-[#121218] text-[#ff007f] focus:ring-[#ff007f] focus:ring-offset-0 transition-colors"
              {...register('rememberMe')}
            />
            <span>Lembrar meu acesso</span>
          </label>
          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-[#00ff88]" />
            Acesso Seguro
          </span>
        </div>

        {/* Botão de Envio (Entrar no Jogo) */}
        <Button
          type="submit"
          variant="neonPink"
          size="lg"
          className="w-full font-black text-base shadow-[0_0_20px_rgba(255,0,127,0.4)] transition-all cursor-pointer"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              CONECTANDO AO CAMPO...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>ENTRAR NO JOGO</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Dica de Acesso */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Ainda não tem acesso? Solicite aos organizadores do racha.
        </p>
      </div>
    </div>
  )
}
