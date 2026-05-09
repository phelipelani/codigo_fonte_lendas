// Arquivo: src/features/auth/routes/AtivarContaPage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, CheckCircle, Eye, EyeOff, UserPlus, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/Form';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';

import { useValidarConvite } from '../api/useValidarConvite';
import { useAtivarConta } from '../api/useAtivarConta';
import { GOOGLE_AUTH_URL } from '@/utils/constants';

// Schema de validação
const ativarContaSchema = z.object({
  username: z.string().min(3, 'Username deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type AtivarContaForm = z.infer<typeof ativarContaSchema>;

export const AtivarContaPage = () => {
  const { token } = useParams<{ token: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Valida o token
  const { data: conviteData, isLoading, isError, error } = useValidarConvite(token || '');
  
  // Mutation para ativar
  const ativarMutation = useAtivarConta();

  // Form
  const form = useForm<AtivarContaForm>({
    resolver: zodResolver(ativarContaSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Resetar flag de submit quando mutation terminar
  useEffect(() => {
    if (!ativarMutation.isPending) {
      setIsSubmitting(false);
    }
  }, [ativarMutation.isPending]);

  const onSubmit = async (values: AtivarContaForm) => {
    if (!token || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      await ativarMutation.mutateAsync({
        token,
        username: values.username,
        password: values.password,
      });
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <AnimatedBackground showWaves={true} showCircles={true} intensity="low" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-cyan-400" />
            <motion.div 
              className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-cyan-100/60 font-medium">Validando convite...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (isError || !conviteData) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <AnimatedBackground showWaves={true} showCircles={true} intensity="low" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          {/* Glow vermelho */}
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
            
            <h1 className="mb-2 font-black text-2xl text-red-400">
              Convite Inválido
            </h1>
            <p className="mb-6 text-cyan-100/50">
              {error?.message || 'Este convite expirou, já foi usado ou não existe.'}
            </p>
            
            <Link to="/login">
              <Button variant="outline" className="w-full h-12 rounded-xl border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/50">
                Voltar para Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Animado */}
      <AnimatedBackground 
        showWaves={true}
        showCircles={true}
        showTriangles={true}
        intensity="medium"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative w-full max-w-md"
      >
        {/* Glow externo */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 blur-xl opacity-60" />
        
        {/* Card Principal */}
        <div className="relative rounded-2xl border border-cyan-500/20 bg-[#0a1628]/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Linha brilhante no topo */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          
          {/* Header */}
          <div className="mb-6 text-center">
            <motion.div 
              className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <UserPlus className="h-10 w-10 text-white" />
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-5 w-5 text-yellow-400" />
              </motion.div>
            </motion.div>
            
            <h1 className="mb-2 text-3xl font-black">
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Ativar Conta
              </span>
            </h1>
            <p className="text-cyan-100/50 text-sm">
              Configure sua conta para acessar o sistema
            </p>
          </div>

          {/* Info do Jogador */}
          <motion.div 
            className="mb-6 flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-lg font-black text-white shadow-lg">
              {conviteData.convite.jogador_nome.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">
                {conviteData.convite.jogador_nome}
              </p>
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Convite válido
              </div>
            </div>
          </motion.div>

          {/* Botão Google */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mb-4">
            <Button
              type="button"
              onClick={() => { window.location.href = `${GOOGLE_AUTH_URL}?convite=${token}`; }}
              className="w-full h-12 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20
                text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Ativar com Google
            </Button>
          </motion.div>

          {/* Divisor */}
          <div className="relative flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-cyan-500/20" />
            <span className="text-xs text-cyan-100/30 font-medium uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-cyan-500/20" />
          </div>

          {/* Formulário */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-100/70 font-medium text-sm">Nome de Usuário</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="escolha seu username"
                        autoComplete="username"
                        disabled={isSubmitting}
                        className="h-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 
                          focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                          transition-all duration-300 rounded-xl disabled:opacity-50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Senha */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-100/70 font-medium text-sm">Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className="h-12 pr-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 
                            focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                            transition-all duration-300 rounded-xl disabled:opacity-50"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Confirmar Senha */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-cyan-100/70 font-medium text-sm">Confirmar Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          disabled={isSubmitting}
                          className="h-12 pr-12 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 
                            focus:border-cyan-400/50 focus:bg-[#0d1f35]/70 focus:ring-2 focus:ring-cyan-500/20
                            transition-all duration-300 rounded-xl disabled:opacity-50"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={isSubmitting}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              {/* Botão Submit */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 mt-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 
                    text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 
                    border border-cyan-400/20 transition-all duration-300
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Ativando...
                    </span>
                  ) : (
                    'Ativar Conta'
                  )}
                </Button>
              </motion.div>
            </form>
          </Form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-cyan-100/40">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Fazer login
              </Link>
            </p>
          </div>
          
          {/* Linha brilhante na base */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};