// Arquivo: src/features/auth/components/LoginForm.tsx
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  const [showPassword, setShowPassword] = useState(false)

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
      // No APK mobile nativo (Capacitor)
      void loginGoogleNativo(`${GOOGLE_AUTH_URL}?app=1`)
    } else {
      // No navegador Web
      window.location.href = GOOGLE_AUTH_URL
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Alerta de Erro da API */}
      {loginMutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-red-500/40 bg-red-500/15 p-3 text-xs sm:text-sm text-red-200 backdrop-blur-md"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
          <span>
            {getApiErrorMessage(loginMutation.error, 'Credenciais inválidas. Verifique seu usuário e senha.')}
          </span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Campo E-mail / Usuário */}
        <div className="space-y-1.5 text-left">
          <label
            htmlFor="login-identifier"
            className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300"
          >
            E-mail ou Usuário
          </label>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF087F] transition-colors">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="login-identifier"
              type="text"
              placeholder="seu.email@exemplo.com ou usuário"
              autoComplete="username"
              className={`w-full h-11 sm:h-12 pl-10 pr-4 rounded-xl bg-[#090d16]/85 border text-sm text-white placeholder:text-slate-500 transition-all outline-none ${
                errors.login
                  ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  : 'border-slate-700/60 hover:border-slate-600 focus:border-[#FF087F] focus:ring-1 focus:ring-[#FF087F]/40'
              }`}
              {...register('login')}
            />
          </div>
          {errors.login && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-red-400 pt-0.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>{errors.login.message}</span>
            </p>
          )}
        </div>

        {/* Campo Senha */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-300"
            >
              Senha
            </label>
            <Link
              to="/auth/forgot-password"
              className="text-[11px] sm:text-xs font-medium text-slate-400 hover:text-[#FF087F] transition-colors focus:outline-none"
            >
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#FF087F] transition-colors">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className={`w-full h-11 sm:h-12 pl-10 pr-11 rounded-xl bg-[#090d16]/85 border text-sm text-white placeholder:text-slate-500 transition-all outline-none ${
                errors.password
                  ? 'border-red-500/70 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  : 'border-slate-700/60 hover:border-slate-600 focus:border-[#FF087F] focus:ring-1 focus:ring-[#FF087F]/40'
              }`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 rounded focus:outline-none"
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-red-400 pt-0.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              <span>{errors.password.message}</span>
            </p>
          )}
        </div>

        {/* Botão Principal ENTRAR */}
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="pt-1">
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full h-11 sm:h-12 rounded-xl bg-[#FF087F] hover:bg-[#e0066f] active:bg-[#c90562] text-white font-black text-sm sm:text-base tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(255,8,127,0.45)] hover:shadow-[0_0_30px_rgba(255,8,127,0.6)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                <span>ENTRANDO...</span>
              </>
            ) : (
              <span>ENTRAR</span>
            )}
          </button>
        </motion.div>
      </form>

      {/* Separador Discreto "OU" */}
      <div className="relative flex items-center justify-center my-3">
        <div className="w-full border-t border-white/10" />
        <span className="absolute bg-[#0b0e14] px-3 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">
          OU
        </span>
      </div>

      {/* Botão Secundário Google OAuth */}
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full h-11 sm:h-12 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/15 hover:border-white/25 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md group"
        >
          {/* Logo Oficial Google */}
          <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0 transition-transform group-hover:scale-105">
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
          <span>Continuar com Google</span>
        </button>
      </motion.div>

      {/* Link de Criação de Conta */}
      <div className="pt-2 text-center">
        <p className="text-xs text-slate-300">
          Ainda não tem conta?{' '}
          <Link
            to="/ativar-conta/novo"
            className="font-bold text-[#8CFF32] hover:text-[#a1ff55] hover:underline transition-colors ml-1"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
