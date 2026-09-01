import { memo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Trophy, Hash, ChevronRight } from 'lucide-react';

export const CompetitionHistory = memo(({ historico }: { historico: any[] }) => {
  const qtdCampeonatos = historico.length;
  // Conta os times unicos
  const timesParticiparam = new Set(historico.filter(h => h.campeao_nome).map(h => h.campeao_nome)).size;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="w-full rounded-2xl border border-border/50 bg-surfaceElevated/30 p-4 md:p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={18} className="text-emerald-400" />
        <div>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">História das Competições</h3>
          <p className="text-[10px] text-textMuted uppercase">Resumo geral das competições já realizadas</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/50 border border-border/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">{qtdCampeonatos}</span>
            <span className="text-[9px] text-textMuted uppercase font-bold mt-1">Campeonatos<br/>Realizados</span>
          </div>
          <div className="bg-surface/50 border border-border/50 rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{timesParticiparam}</span>
            <span className="text-[9px] text-textMuted uppercase font-bold mt-1">Times Campeões<br/>Diferentes</span>
          </div>
        </div>

        <div className="bg-surface/50 border border-border/50 rounded-xl p-3 max-h-[160px] overflow-y-auto custom-scrollbar">
          {historico.slice(0, 5).map(h => (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white">{h.nome}</span>
                <span className="text-[9px] text-textMuted">{h.formato === 'pontos_corridos' ? 'Liga' : 'Copa'} • {new Date(h.data).getFullYear()}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                <Trophy size={10} className="text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 truncate max-w-[80px]">{h.campeao_nome || 'N/A'}</span>
              </div>
            </div>
          ))}
          {historico.length === 0 && <p className="text-[10px] text-textMuted text-center py-4">Nenhum campeonato finalizado</p>}
        </div>
      </div>

      <button className="w-full mt-4 py-3 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-1">
        Ver Todas as Competições <ChevronRight size={12} />
      </button>
    </motion.div>
  );
});
