// Arquivo: src/features/auth/routes/LoginPage.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { LoginForm } from '../components/LoginForm'

import bgImage from '@/assets/futlendas_bg.png'
import logoOficial from '@/assets/logo_oficial_transparente.png'

export function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between items-center text-white selection:bg-[#FF087F] selection:text-white px-4 py-6 sm:py-8">
      {/* Background Cinematográfico Oficial (futlendas_login_background_mobile_com_placas.png) */}
      <div className="pointer-events-none fixed inset-0 -z-20 h-full w-full overflow-hidden select-none">
        <img
          src={bgImage}
          alt="FutLendas Background"
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Camada Suave de Contraste para Garantir Legibilidade */}
      <div 
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/35 to-black/85" 
        aria-hidden="true" 
      />

      {/* Espaçador Superior para Centralização Equilibrada */}
      <div className="w-full flex justify-center py-2" />

      {/* Container Principal Centralizado (Mobile First) */}
      <main className="w-full max-w-[420px] mx-auto my-auto flex flex-col items-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full flex flex-col items-center"
        >
          {/* Logo Oficial do App */}
          <div className="relative mb-3 flex justify-center">
            <div className="absolute inset-0 bg-[#FF087F]/20 blur-2xl rounded-full scale-125 pointer-events-none" />
            <img
              src={logoOficial}
              alt="Logo Oficial FutLendas"
              className="relative h-24 sm:h-28 w-auto object-contain drop-shadow-[0_0_25px_rgba(255,8,127,0.5)]"
            />
          </div>

          {/* Nome da Marca FUTLENDAS */}
          <h1 className="font-display text-3xl sm:text-4xl font-black uppercase tracking-wider text-white text-center leading-none">
            FUT<span className="text-[#FF087F] drop-shadow-[0_0_15px_rgba(255,8,127,0.7)]">LENDAS</span>
          </h1>

          {/* Slogan de Impacto Obrigatório */}
          <div className="mt-2.5 mb-6 text-center space-y-1">
            <p className="font-display text-sm sm:text-base font-bold text-white tracking-wide">
              A próxima lenda pode ser você.
            </p>
            <p className="text-xs sm:text-sm text-slate-300 font-normal">
              Sua história começa dentro de campo.
            </p>
          </div>

          {/* Card Translúcido Escuro do Formulário */}
          <div className="w-full rounded-2xl sm:rounded-3xl bg-[#090d16]/80 sm:bg-[#070b13]/85 backdrop-blur-xl border border-white/10 p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.85)]">
            <LoginForm />
          </div>
        </motion.div>
      </main>

      {/* Rodapé Oficial da Referência Visual */}
      <footer className="w-full text-center py-4 z-10">
        <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Rachas <span className="text-[#FF087F] mx-1.5">•</span> Jogadores <span className="text-[#8CFF32] mx-1.5">•</span> Evolução
        </p>
      </footer>
    </div>
  )
}
