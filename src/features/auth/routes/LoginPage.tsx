// Arquivo: src/features/auth/routes/LoginPage.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Trophy, Users, Zap } from 'lucide-react'
import { LoginForm } from '../components/LoginForm'
import { AthleteCardPreview } from '../components/AthleteCardPreview'
import futlendasLogo from '@/assets/Logo.webp'

export function LoginPage() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#08080c] text-white flex flex-col justify-between selection:bg-[#ff007f] selection:text-white">
      {/* Luzes de Fundo (Auras Neon Cinematográficas) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {/* Glow Rosa Neon Superior Esquerdo */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#ff007f]/15 blur-[120px]" />
        {/* Glow Verde Neon Inferior Direito */}
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-[#00ff88]/15 blur-[120px]" />
        {/* Glow Central Sutil */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-900/10 blur-[150px]" />
        
        {/* Padrão Sutil de Campo / Linhas de Velocidade Mangá */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px), linear-gradient(to right, #ffffff 1px, transparent 1px)`,
            backgroundSize: '40px 40px, 120px 120px',
          }}
        />
      </div>

      {/* Barra de Navegação / Topo */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full border-b border-white/5">
        <div className="flex items-center gap-3">
          <img
            src={futlendasLogo}
            alt="FutLendas"
            className="h-9 w-auto drop-shadow-[0_0_10px_rgba(255,0,127,0.5)]"
          />
          <div className="flex flex-col">
            <span className="font-display text-xl font-black tracking-wider text-white">
              FUT<span className="text-[#ff007f]">LENDAS</span>
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#00ff88] uppercase -mt-1">
              Futebol Amador & Ligas
            </span>
          </div>
        </div>

        {/* Selo Informativo */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[#00ff88] animate-pulse" />
          <span>Temporada 2026</span>
        </div>
      </header>

      {/* Conteúdo Principal (Layout Dividido em 2 Colunas) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Visual de Destaque (Esquerda no Desktop) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            
            {/* Tag Anime / Esportes */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#ff007f]/40 bg-[#ff007f]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#ff007f]"
            >
              <Zap className="h-3.5 w-3.5 text-[#ff007f]" />
              Temporada 2026 de Rachões & Copas
            </motion.div>

            {/* Título de Impacto Cinematográfico */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-tight"
            >
              Onde o futebol amador <br className="hidden sm:inline" />
              se torna{' '}
              <span className="bg-gradient-to-r from-[#ff007f] via-[#ff2692] to-[#00ff88] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,0,127,0.4)]">
                Lendário.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed font-normal"
            >
              Gerencie suas peladas, confirme presenças, monte times equilibrados com sorteio inteligente e colecione as cartas dos craques com estatísticas reais.
            </motion.p>

            {/* Destaque da Carta do Atleta */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="w-full flex justify-center lg:justify-start pt-2"
            >
              <AthleteCardPreview />
            </motion.div>

            {/* Benefícios / Destaques da Plataforma */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-3 w-full max-w-lg pt-4 border-t border-white/10"
            >
              <div className="flex flex-col items-center lg:items-start">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Users className="h-3.5 w-3.5 text-[#00ff88]" />
                  <span>Rachões</span>
                </div>
                <span className="text-[11px] text-slate-400">Mensalistas & Avulsos</span>
              </div>
              <div className="flex flex-col items-center lg:items-start border-l border-white/10 pl-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>Rankings</span>
                </div>
                <span className="text-[11px] text-slate-400">Artilharia & Notas</span>
              </div>
              <div className="flex flex-col items-center lg:items-start border-l border-white/10 pl-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Shield className="h-3.5 w-3.5 text-[#ff007f]" />
                  <span>Arenas</span>
                </div>
                <span className="text-[11px] text-slate-400">Gestão de Quadras</span>
              </div>
            </motion.div>
          </div>

          {/* Coluna do Formulário de Login (Direita no Desktop) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative rounded-3xl p-[1px] shadow-2xl"
              style={{
                background: "linear-gradient(180deg, rgba(255,0,127,0.4) 0%, rgba(255,255,255,0.08) 50%, rgba(0,255,136,0.3) 100%)",
              }}
            >
              {/* Card Interno */}
              <div className="relative rounded-[23px] bg-[#0f0f16]/95 backdrop-blur-2xl p-6 sm:p-8 border border-white/5 shadow-2xl">
                
                {/* Linha de Brilho no Topo */}
                <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-[#ff007f]/70 to-transparent" />

                {/* Cabeçalho do Formulário */}
                <div className="mb-6 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-[#ff007f] shadow-[0_0_8px_#ff007f]" />
                    <span className="text-xs font-black uppercase tracking-widest text-[#ff007f]">
                      Acesso de Jogador & Gestor
                    </span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-white tracking-wide">
                    Entrar em Campo
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Digite suas credenciais para gerenciar suas lendas
                  </p>
                </div>

                {/* Componente de Formulário com Validação */}
                <LoginForm />

                {/* Rodapé com Informação de Segurança */}
                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                  <p className="text-[11px] text-slate-500">
                    FutLendas SaaS • Todos os direitos reservados.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* Rodapé da Página */}
      <footer className="relative z-20 px-6 py-4 border-t border-white/5 text-center text-xs text-slate-500">
        <p>FutLendas — O ecossistema inteligente de futebol amador e comunidades esportivas.</p>
      </footer>
    </div>
  )
}
