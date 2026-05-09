// Arquivo: src/features/auth/routes/LoginPage.tsx
import { motion } from 'framer-motion'
import { LoginForm } from '../components/LoginForm'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import logoLendas from '@/assets/Logo.webp'

export function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Animado */}
      <AnimatedBackground
        variant="auth"
        showWaves={true}
        showCircles={true}
        showTriangles={true}
        intensity="medium"
      />

      {/* Container do formulário */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Glow externo do card */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 blur-xl opacity-60" />

        {/* Card Principal */}
        <div className="relative rounded-2xl border border-cyan-500/20 bg-[#0a1628]/80 backdrop-blur-xl p-8 shadow-2xl md:p-10">
          {/* Brilho interno no topo */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Logo e Header */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-8 flex flex-col items-center gap-4"
          >
            {/* Container da Logo com efeito */}
            <div className="relative">
              {/* Glow pulsante atrás da logo */}
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-500/30 blur-2xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Círculos concêntricos (radar) atrás da logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute rounded-full border border-cyan-500/20"
                    style={{
                      width: `${60 + ring * 25}px`,
                      height: `${60 + ring * 25}px`,
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{
                      duration: 2 + ring * 0.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: ring * 0.3,
                    }}
                  />
                ))}
              </div>

              {/* Logo */}
              <img
                src={logoLendas}
                alt="FutLendas Logo"
                className="relative h-24 w-auto drop-shadow-[0_0_15px_rgba(6,182,212,0.5)] md:h-28"
              />
            </div>

            {/* Título com gradiente */}
            <div className="text-center">
              <h1 className="mb-2 text-4xl font-black tracking-tight md:text-5xl">
                <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  FUTLENDAS
                </span>
              </h1>
              <p className="text-cyan-100/50 text-sm md:text-base">
                Gerencie suas lendas do futebol amador
              </p>
            </div>
          </motion.div>

          {/* Divisor estilizado */}
          <div className="relative mb-8">
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-500/50" />
          </div>

          {/* Formulário */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <LoginForm />
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-cyan-100/30">
              Apenas membros com convite têm acesso ao sistema
            </p>
          </motion.div>

          {/* Brilho interno na base */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        </div>
      </motion.div>

      {/* Elementos decorativos extras */}
      <motion.div
        className="absolute bottom-10 left-10 text-cyan-500/10 text-6xl font-black pointer-events-none select-none"
        animate={{ opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        ⚽
      </motion.div>
      <motion.div
        className="absolute top-10 right-10 text-cyan-500/10 text-4xl font-black pointer-events-none select-none"
        animate={{ opacity: [0.05, 0.1, 0.05], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        🏆
      </motion.div>
    </div>
  )
}