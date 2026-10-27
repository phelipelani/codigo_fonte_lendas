// Arquivo: src/features/auth/components/AthleteCardPreview.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Flame, Shield, Sparkles } from 'lucide-react'
import athleteCardImg from '@/assets/athlete_card_sample.png'
import futlendasLogo from '@/assets/Logo.webp'

interface AthleteCardPreviewProps {
  name?: string
  position?: string
  number?: number | string
  rating?: number
  stats?: {
    games: number
    goals: number
    assists: number
    winRate: string
  }
}

export const AthleteCardPreview: React.FC<AthleteCardPreviewProps> = ({
  name = "DIONES",
  position = "ATACANTE",
  number = "11",
  rating = 94,
  stats = {
    games: 24,
    goals: 18,
    assists: 12,
    winRate: "78%",
  },
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center p-2 select-none">
      {/* Auras de iluminação Neon de Fundo */}
      <div
        className="absolute -top-10 -left-10 h-72 w-72 rounded-full bg-[#ff007f]/20 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -right-10 h-72 w-72 rounded-full bg-[#00ff88]/15 blur-[80px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Card Flutuante com Animação e Efeito Holográfico */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
        className="group relative w-full max-w-[340px] rounded-3xl p-[2px] shadow-2xl transition-all duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(255,0,127,0.7) 0%, rgba(255,255,255,0.1) 40%, rgba(0,255,136,0.6) 100%)",
          boxShadow: "0 0 35px rgba(255,0,127,0.3), 0 0 50px rgba(0,255,136,0.15)",
        }}
        data-testid="athlete-card-container"
      >
        {/* Camada Interna do Card (Grafite / Preto translúcido) */}
        <div className="relative overflow-hidden rounded-[22px] bg-[#0d0d14]/95 backdrop-blur-xl p-5 border border-white/10">
          
          {/* Efeito de linhas de velocidade mangá e brilho de varredura */}
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 30%, rgba(255,0,127,0.4) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Cabeçalho da Carta: Rating, Posição e Escudo */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#ff007f] to-[#b8005b] px-3 py-1 shadow-md shadow-[#ff007f]/40">
                <span className="font-display text-2xl font-black text-white leading-none tracking-tight">
                  {rating}
                </span>
                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">
                  OVER
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-lg font-extrabold text-white tracking-wider">
                    {position}
                  </span>
                  <span className="text-xs font-bold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded-full border border-[#00ff88]/30">
                    #{number}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                  <Trophy className="h-3 w-3 text-amber-400" />
                  <span>CARTA LENDÁRIA</span>
                </div>
              </div>
            </div>

            {/* Escudo FutLendas */}
            <div className="relative">
              <img
                src={futlendasLogo}
                alt="Escudo FutLendas"
                className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,0,127,0.5)]"
              />
            </div>
          </div>

          {/* Imagem do Atleta / Arte Colecionável */}
          <div className="relative my-4 flex items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-black/80 to-[#12121a]">
            <img
              src={athleteCardImg}
              alt={`Carta de Atleta de ${name}`}
              className="h-56 w-auto object-cover rounded-lg transform transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Tag de Raridade e Efeito Neon */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/80 px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#00ff88] border border-[#00ff88]/30 backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              TEMPORADA 2026
            </div>
          </div>

          {/* Nome e Faixa do Atleta */}
          <div className="relative z-10 text-center mb-3">
            <h3 className="font-display text-2xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
              {name}
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Rachão dos Amigos • Série Ouro
            </p>
          </div>

          {/* Grade de Estatísticas da Carta */}
          <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-white/[0.04] p-2.5 border border-white/5 text-center">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                JOGOS
              </span>
              <span className="font-display text-base font-black text-white">
                {stats.games}
              </span>
            </div>
            <div className="flex flex-col border-l border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ff007f]">
                GOLS
              </span>
              <span className="font-display text-base font-black text-white">
                {stats.goals}
              </span>
            </div>
            <div className="flex flex-col border-l border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00ff88]">
                ASSIST
              </span>
              <span className="font-display text-base font-black text-white">
                {stats.assists}
              </span>
            </div>
            <div className="flex flex-col border-l border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                VITÓRIAS
              </span>
              <span className="font-display text-base font-black text-white">
                {stats.winRate}
              </span>
            </div>
          </div>

          {/* Rodapé da Carta com Selo de Autenticidade */}
          <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-[#ff007f]" />
              FUTLENDAS VERIFIED
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Flame className="h-3 w-3 text-amber-400" />
              HOT STREAK
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
