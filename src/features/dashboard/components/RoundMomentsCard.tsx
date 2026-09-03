import React from 'react';
import { Flame, Goal, Trophy, Sparkles } from 'lucide-react';

interface Props {
  momentos?: {
    maior_goleada: string | null;
    jogo_mais_gols: string | null;
  } | null;
  destaques?: {
    mvp: { nome: string; total: string | number } | null;
    pe_de_rato: { nome: string; total: string | number } | null;
  };
}

export const RoundMomentsCard: React.FC<Props> = ({ momentos, destaques }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1623]/80 p-4 sm:p-5 shadow-xl flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <Flame size={18} className="text-orange-400" />
        </div>
        <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
          Momentos da Rodada
        </h3>
      </div>

      <div className="space-y-2.5">
        {/* Maior Goleada */}
        <div className="p-3 rounded-xl border border-white/5 bg-black/25 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Trophy size={16} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Maior Goleada
            </span>
            <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
              {momentos?.maior_goleada || 'Nenhum registro ainda'}
            </p>
          </div>
        </div>

        {/* Jogo com Mais Gols */}
        <div className="p-3 rounded-xl border border-white/5 bg-black/25 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
            <Goal size={16} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Jogo com Mais Gols
            </span>
            <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
              {momentos?.jogo_mais_gols || 'Nenhum registro ainda'}
            </p>
          </div>
        </div>

        {/* Maior Pontuação da Rodada (MVP) */}
        {destaques?.mvp && (
          <div className="p-3 rounded-xl border border-white/5 bg-black/25 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Maior Pontuação Individual
              </span>
              <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                {destaques.mvp.nome} — <span className="text-amber-400">{destaques.mvp.total} pts</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
