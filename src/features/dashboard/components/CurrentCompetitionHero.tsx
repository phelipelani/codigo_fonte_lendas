import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  camp?: {
    id: number;
    nome: string;
    formato: string;
    status: string;
    rodada_atual: number | null;
    total_rodadas: number;
    lider: {
      time_id: number;
      nome: string;
      escudo: string | null;
      pontos: number;
    } | null;
    partidas_ultima_rodada: number;
  } | null;
}

export const CurrentCompetitionHero: React.FC<Props> = ({ camp }) => {
  if (!camp) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-6 text-center">
        <Trophy size={28} className="mx-auto text-zinc-600 mb-2" />
        <p className="text-sm text-zinc-400">Nenhum campeonato em andamento no momento.</p>
        <Link to="/campeonatos" className="inline-block mt-3 text-xs font-bold text-cyan-400 hover:underline">
          Ver Campeonatos →
        </Link>
      </div>
    );
  }

  const rodadaTexto = camp.rodada_atual !== null
    ? `${String(camp.rodada_atual).padStart(2, '0')} / ${String(camp.total_rodadas).padStart(2, '0')}`
    : `${camp.total_rodadas} rodadas`;

  return (
    <Link to={`/campeonatos/${camp.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1623] via-[#131d2e] to-[#0d1623] p-5 sm:p-6 shadow-xl group hover:border-cyan-500/30 transition-all duration-300"
      >
        {/* Glow de fundo */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* Lado Esquerdo: Troféu, Nome, Status */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Trophy size={30} className="text-amber-400 drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-[10px] font-black uppercase tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  AO VIVO
                </span>
                <span className="text-xs text-zinc-400 font-medium">{camp.formato}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                {camp.nome}
              </h2>
            </div>
          </div>

          {/* Lado Direito / Centro: Rodada Atual + Líder + Última Rodada */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 items-center">
            {/* Bloco Rodada Atual */}
            <div className="bg-black/25 rounded-xl border border-white/5 p-3 text-center sm:text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rodada Atual</p>
              <p className="text-base sm:text-lg font-black text-white tracking-wide">{rodadaTexto}</p>
            </div>

            {/* Bloco Líder Atual */}
            {camp.lider && (
              <div className="bg-black/25 rounded-xl border border-white/5 p-3 flex items-center gap-2.5">
                {camp.lider.escudo ? (
                  <img src={camp.lider.escudo} alt={camp.lider.nome} className="w-8 h-8 rounded-full object-contain shrink-0 bg-black/40 p-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {camp.lider.nome.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Líder</p>
                  <p className="text-xs sm:text-sm font-black text-white truncate">{camp.lider.nome}</p>
                  <p className="text-[11px] font-bold text-emerald-400">{camp.lider.pontos} pts</p>
                </div>
              </div>
            )}

            {/* Bloco Partidas Última Rodada */}
            <div className="col-span-2 sm:col-span-1 bg-black/25 rounded-xl border border-white/5 p-3 text-center sm:text-left flex items-center justify-between sm:block">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Última Rodada</p>
                <p className="text-base sm:text-lg font-black text-cyan-400">{camp.partidas_ultima_rodada} partidas</p>
              </div>
              <ChevronRight size={18} className="text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all md:hidden" />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
