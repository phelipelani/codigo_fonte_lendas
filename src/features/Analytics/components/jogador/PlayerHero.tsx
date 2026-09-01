import { motion } from 'framer-motion';
import { User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerHeroProps {
  jogador: any;
  rankingGeral: any;
  aproveitamento: number;
}

export function PlayerHero({ jogador, rankingGeral, aproveitamento }: PlayerHeroProps) {
  if (!jogador) return null;

  // Calcula Overall base. Assumindo lógica antiga Nível -> OVR
  const overall = jogador.nivel ? Math.min(99, 75 + (jogador.nivel * 2)) : 75;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-border/30 bg-gradient-to-br from-surface to-[#0a1526] p-4 md:p-8 flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden shadow-2xl"
    >
      {/* Efeito Glow de fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[50%] -left-[10%] w-[120%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/40 via-surface/0 to-surface/0" />
      </div>

      <div className="flex items-center gap-4 md:gap-8 z-10 w-full md:w-auto">
        {/* Avatar Circular com Neon */}
        <div className="relative flex-shrink-0 mx-auto md:mx-0">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-[3px] border-cyan-400 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.3)] relative bg-surfaceElevated">
            {jogador.foto_url ? (
              <img src={jogador.foto_url} alt={jogador.nome} className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="m-auto h-full text-cyan-400/50" />
            )}
          </div>
        </div>

        {/* Nome, Overall e Posição (Mobile fica empilhado ou do lado se couber) */}
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
            {jogador.nome}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="bg-cyan-500/20 border border-cyan-500 text-cyan-400 font-black px-3 py-1 rounded-full text-sm md:text-base flex items-center gap-1.5 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
              <span className="text-[10px] uppercase text-cyan-200">OVR</span> {overall}
            </div>
            <div className="text-xs md:text-sm text-textMuted uppercase font-bold tracking-wider px-2 border-l border-border/50">
              {jogador.joga_recuado ? 'Zagueiro' : jogador.posicao || 'Linha'}
            </div>
          </div>
        </div>
      </div>

      {/* Separação visual no mobile */}
      <div className="w-full h-px bg-border/50 md:hidden z-10" />

      {/* Blocos da Direita (Ranking e Aproveitamento) */}
      <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 w-full md:w-auto md:ml-auto z-10">
        
        {/* Ranking Geral com Laurel Dourado */}
        {rankingGeral?.posicao > 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[9px] md:text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Ranking Geral</span>
            <div className="relative flex items-center justify-center px-4">
              {/* Fake Laurel Embellishment using CSS / SVG */}
              <svg className="absolute w-full h-full text-amber-500/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M 20 80 Q 10 50 20 20 Q 30 10 50 10 Q 70 10 80 20 Q 90 50 80 80" />
              </svg>
              <Trophy size={16} className="text-amber-400 absolute left-0 opacity-50" />
              <Trophy size={16} className="text-amber-400 absolute right-0 opacity-50" />
              
              <span className="text-3xl md:text-4xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                #{rankingGeral.posicao}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center opacity-30">
            <span className="text-[9px] md:text-[10px] font-bold text-textMuted uppercase tracking-widest mb-1">Ranking Geral</span>
            <span className="text-3xl md:text-4xl font-black text-textMuted">--</span>
          </div>
        )}

        <div className="h-12 w-px bg-border/50 hidden md:block" />

        {/* Aproveitamento */}
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-[9px] md:text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-1">Aproveitamento</span>
          <span className="text-3xl md:text-4xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
            {aproveitamento}%
          </span>
          {rankingGeral?.pontos_total > 0 && (
            <span className="text-[10px] text-cyan-200/70 mt-1">{rankingGeral.pontos_total.toFixed(1)} pts históricos</span>
          )}
        </div>
        
      </div>
    </motion.div>
  );
}
