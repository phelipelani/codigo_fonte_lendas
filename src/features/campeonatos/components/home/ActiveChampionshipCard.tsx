import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Target, ArrowRight, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const ActiveChampionshipCard = memo(({ campeonato, index }: any) => {
  const pct = campeonato.total_rodadas ? Math.round(((campeonato.rodadas_completas || 0) / campeonato.total_rodadas) * 100) : 0;
  let formattedDate = 'A definir';
  if (campeonato.data) {
    try {
      const parts = campeonato.data.split(' ')[0].split('-');
      formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : format(new Date(campeonato.data.replace(/-/g, '/')), 'dd/MM/yyyy');
    } catch(e) {}
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="group relative flex flex-col rounded-xl border border-cyan-500/30 bg-[#0a1628]/80 backdrop-blur-md overflow-hidden hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer h-full"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-emerald-400" />
      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Em andamento
          </div>
          <Calendar size={18} className="text-cyan-500/50" />
        </div>
        <div className="flex flex-col items-center justify-center text-center mb-6 mt-2">
          <div className="w-16 h-16 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
            <Shield size={32} />
          </div>
          <h3 className="text-base md:text-lg font-black text-white group-hover:text-cyan-400 transition-colors px-2 leading-tight">
            {campeonato.nome}
          </h3>
          <p className="text-[10px] text-cyan-200/60 uppercase tracking-widest mt-1.5 font-bold flex items-center justify-center gap-1">
            <Target size={12} /> {campeonato.formato.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 mb-5">
           <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#0f1f33]/80 border border-white/5">
              <span className="text-[9px] uppercase font-bold text-textMuted tracking-wider">Início</span>
              <span className="text-xs font-bold text-white">{formattedDate}</span>
           </div>
           <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#0f1f33]/80 border border-white/5">
              <span className="text-[9px] uppercase font-bold text-textMuted tracking-wider">Times</span>
              <span className="text-xs font-bold text-white">{campeonato.num_times || 0} times</span>
           </div>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
            <span className="text-textMuted">Rodada {Math.min(campeonato.total_rodadas || 1, (campeonato.rodadas_completas||0) + 1)} / {campeonato.total_rodadas || '?'}</span>
            <span className="text-cyan-400">{pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface/80 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      <Link to={`/campeonatos/${campeonato.id}`} className="flex items-center justify-between p-4 border-t border-cyan-500/20 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors">
        <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">Gerenciar Campeonato</span>
        <ArrowRight size={14} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
});
