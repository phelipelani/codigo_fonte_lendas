import { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Clock, ArrowRight, Crown, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export const FinishedChampionshipCard = memo(({ campeonato, index }: any) => {
  let formattedInicio = '---';
  let formattedFim = '---';
  try {
      if (campeonato.data) {
          const parts = campeonato.data.split(' ')[0].split('-');
          formattedInicio = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : format(new Date(campeonato.data.replace(/-/g, '/')), 'dd/MM/yyyy');
      }
      if (campeonato.data_fim) {
          const parts = campeonato.data_fim.split(' ')[0].split('-');
          formattedFim = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : format(new Date(campeonato.data_fim.replace(/-/g, '/')), 'dd/MM/yyyy');
      }
  } catch(e) {}
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="group relative flex flex-col rounded-xl border border-amber-500/20 bg-[#0a1628]/80 backdrop-blur-md overflow-hidden hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all cursor-pointer h-full"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 opacity-80" />
      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Finalizado
          </div>
          <Trophy size={16} className="text-amber-500/40" />
        </div>
        <div className="flex flex-col items-center justify-center text-center mb-6 mt-2 relative">
          <div className="relative w-20 h-20 rounded-full border-2 border-amber-500/40 p-0.5 bg-[#0a1628] shadow-[0_0_20px_rgba(245,158,11,0.15)] group-hover:scale-105 transition-transform mb-3">
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-b from-yellow-300 to-amber-500 text-[#0a1628] rounded-full p-1.5 shadow-lg border border-yellow-200">
                <Crown size={12} fill="currentColor" />
             </div>
             {campeonato.time_campeao_logo ? (
                <img src={campeonato.time_campeao_logo} alt="Campeão" className="w-full h-full object-cover rounded-full" />
             ) : (
                <div className="w-full h-full rounded-full bg-surface/50 flex items-center justify-center font-black text-amber-500/50">
                  {campeonato.time_campeao_nome ? campeonato.time_campeao_nome.substring(0, 2).toUpperCase() : '?'}
                </div>
             )}
          </div>
          <h3 className="text-base md:text-lg font-black text-white px-2 leading-tight mb-1">
            {campeonato.nome}
          </h3>
          <p className="text-[10px] text-amber-200/60 uppercase tracking-widest font-bold flex items-center justify-center gap-1">
            <Trophy size={10} className="inline -mt-0.5" /> {campeonato.formato.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 mb-5">
           <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#0f1f33]/80 border border-white/5">
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-textMuted tracking-wider"><Clock size={10}/> Início</span>
              <span className="text-xs font-bold text-white/80">{formattedInicio}</span>
           </div>
           <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[#0f1f33]/80 border border-white/5">
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-textMuted tracking-wider"><CheckCircle size={10}/> Término</span>
              <span className="text-xs font-bold text-white/80">{formattedFim}</span>
           </div>
        </div>
        <div className="py-2.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center gap-2">
            <Crown size={14} className="text-amber-500" fill="currentColor" />
            <span className="text-[10px] font-bold text-amber-500/70 uppercase tracking-wider">Campeão</span>
            <span className="text-xs font-black text-amber-400 truncate">{campeonato.time_campeao_nome || 'Desconhecido'}</span>
        </div>
      </div>
      <Link to={`/campeonatos/${campeonato.id}`} className="flex items-center justify-between p-4 border-t border-amber-500/20 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors">
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-500/80">Ver Resultados</span>
        <ArrowRight size={14} className="text-amber-500/80 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
});
