import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlayerHighlight {
  id: number;
  nome: string;
  foto_url: string | null;
  total: string | number;
}

interface Props {
  destaques?: {
    mvp: PlayerHighlight | null;
    pe_de_rato: PlayerHighlight | null;
    jogador_rodada: PlayerHighlight | null;
  };
}

export const RoundHighlightsSection: React.FC<Props> = ({ destaques }) => {
  if (!destaques || (!destaques.mvp && !destaques.pe_de_rato && !destaques.jogador_rodada)) {
    return null;
  }

  const items = [
    {
      tipo: 'MVP DA SEMANA',
      data: destaques.mvp,
      badgeColor: 'bg-gradient-to-r from-amber-400 to-amber-600 text-black',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      bgGlow: 'from-amber-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-amber-400',
      icon: Crown,
      iconColor: 'text-amber-400',
      defaultEmoji: '👑',
    },
    {
      tipo: 'PÉ DE RATO',
      data: destaques.pe_de_rato,
      badgeColor: 'bg-gradient-to-r from-red-600 to-orange-600 text-white',
      border: 'border-red-500/30 hover:border-red-500/60',
      bgGlow: 'from-red-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-red-400',
      icon: Sparkles,
      iconColor: 'text-red-400',
      defaultEmoji: '🐀',
    },
    {
      tipo: 'JOGADOR DA RODADA',
      data: destaques.jogador_rodada,
      badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-600 text-black',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      bgGlow: 'from-cyan-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-cyan-400',
      icon: Star,
      iconColor: 'text-cyan-400',
      defaultEmoji: '⭐',
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star size={18} className="text-amber-400 fill-amber-400" />
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
            Destaques da Rodada
          </h3>
        </div>
        <Link to="/analytics" className="text-xs font-bold text-zinc-400 hover:text-cyan-400 transition-colors">
          Ver todos →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {items.map((item, idx) => {
          if (!item.data) return null;
          const ptsFormatted = typeof item.data.total === 'number'
            ? item.data.total.toFixed(2)
            : item.data.total;

          return (
            <Link to={`/jogadores/${item.data.id}`} key={item.tipo}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden rounded-xl border ${item.border} bg-gradient-to-b ${item.bgGlow} p-4 flex flex-col items-center text-center group transition-all duration-300 shadow-md`}
              >
                {/* Badge do Tipo */}
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${item.badgeColor} shadow-md mb-3`}>
                  {item.tipo}
                </span>

                {/* Foto / Avatar com moldura */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/20 p-1 bg-black/40 mb-3 shadow-inner group-hover:border-white/40 transition-colors">
                  {item.data.foto_url ? (
                    <img
                      src={item.data.foto_url}
                      alt={item.data.nome}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-3xl">
                      {item.defaultEmoji}
                    </div>
                  )}
                </div>

                {/* Nome do Jogador */}
                <h4 className="font-black text-white text-sm sm:text-base truncate max-w-full px-1 group-hover:text-cyan-300 transition-colors">
                  {item.data.nome}
                </h4>

                {/* Pontuação */}
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-base sm:text-lg font-black ${item.ptsColor}`}>
                    {ptsFormatted}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    PTS
                  </span>
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
