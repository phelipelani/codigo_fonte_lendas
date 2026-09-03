import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlayerHighlight {
  id: number;
  nome: string;
  foto_url: string | null;
  total: string | number;
  label?: string;
}

interface Props {
  destaques?: {
    mvp: PlayerHighlight | null;
    pe_de_rato: PlayerHighlight | null;
    jogador_rodada: PlayerHighlight | null;
    mvps?: PlayerHighlight[];
    pes_de_rato?: PlayerHighlight[];
    outros_destaques?: PlayerHighlight[];
  };
}

export const RoundHighlightsSection: React.FC<Props> = ({ destaques }) => {
  if (!destaques) return null;

  const items: Array<{
    tipo: string;
    player: PlayerHighlight;
    badgeColor: string;
    border: string;
    bgGlow: string;
    ptsColor: string;
    defaultEmoji: string;
  }> = [];

  // 1. MVPs (renderiza todos que empataram)
  const mvps = (destaques.mvps && destaques.mvps.length > 0)
    ? destaques.mvps
    : (destaques.mvp ? [destaques.mvp] : []);

  mvps.forEach((m, idx) => {
    items.push({
      tipo: mvps.length > 1 ? `MVP (${idx + 1}/${mvps.length})` : 'MVP DA SEMANA',
      player: m,
      badgeColor: 'bg-gradient-to-r from-amber-400 to-amber-600 text-black',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      bgGlow: 'from-amber-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-amber-400',
      defaultEmoji: '👑',
    });
  });

  // 2. Pés de Rato (renderiza TODOS os pés de rato da rodada)
  const pesDeRato = (destaques.pes_de_rato && destaques.pes_de_rato.length > 0)
    ? destaques.pes_de_rato
    : (destaques.pe_de_rato ? [destaques.pe_de_rato] : []);

  pesDeRato.forEach((pr, idx) => {
    items.push({
      tipo: pesDeRato.length > 1 ? `PÉ DE RATO (${idx + 1}/${pesDeRato.length})` : 'PÉ DE RATO',
      player: pr,
      badgeColor: 'bg-gradient-to-r from-red-600 to-orange-600 text-white',
      border: 'border-red-500/30 hover:border-red-500/60',
      bgGlow: 'from-red-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-red-400',
      defaultEmoji: '🐀',
    });
  });

  // 3. Outros Destaques da rodada (Artilheiro, Garçom, Melhor Goleiro, etc.)
  const outros = (destaques.outros_destaques && destaques.outros_destaques.length > 0)
    ? destaques.outros_destaques
    : (destaques.jogador_rodada ? [destaques.jogador_rodada] : []);

  outros.forEach((od) => {
    const label = od.label ? od.label.toUpperCase() : 'DESTAQUE';
    items.push({
      tipo: label,
      player: od,
      badgeColor: 'bg-gradient-to-r from-cyan-400 to-blue-600 text-black',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      bgGlow: 'from-cyan-500/10 via-[#0d1623] to-[#0d1623]',
      ptsColor: 'text-cyan-400',
      defaultEmoji: '⭐',
    });
  });

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" />
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
              Destaques da Rodada
            </h3>
            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? 'prêmio' : 'prêmios'}
            </span>
          </div>
          <Link to="/analytics" className="text-xs font-bold text-zinc-400 hover:text-cyan-400 transition-colors">
            Ver todos →
          </Link>
        </div>

        {/* Grid de Destaques: se adapta à quantidade de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {items.map((item, idx) => {
            const ptsRaw = item.player.total;
            const ptsFormatted = typeof ptsRaw === 'number'
              ? ptsRaw.toFixed(2)
              : ptsRaw;

            return (
              <Link to={`/jogadores/${item.player.id}`} key={`${item.tipo}-${item.player.id}-${idx}`}>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative overflow-hidden rounded-xl border ${item.border} bg-gradient-to-b ${item.bgGlow} p-3 flex flex-col items-center text-center group transition-all duration-300 shadow-md h-full justify-between`}
                >
                  {/* Badge do Tipo */}
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${item.badgeColor} shadow-md mb-2 truncate max-w-full`}>
                    {item.tipo}
                  </span>

                  {/* Foto / Avatar com moldura */}
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden border-2 border-white/20 p-0.5 bg-black/40 mb-2 shadow-inner group-hover:border-white/40 transition-colors">
                    {item.player.foto_url ? (
                      <img
                        src={item.player.foto_url}
                        alt={item.player.nome}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                        {item.defaultEmoji}
                      </div>
                    )}
                  </div>

                  {/* Nome do Jogador */}
                  <h4 className="font-black text-white text-xs sm:text-sm truncate max-w-full px-1 group-hover:text-cyan-300 transition-colors">
                    {item.player.nome}
                  </h4>

                  {/* Pontuação */}
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-sm sm:text-base font-black ${item.ptsColor} font-mono`}>
                      {ptsFormatted}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">
                      PTS
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
