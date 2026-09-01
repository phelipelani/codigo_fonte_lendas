import { memo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, CheckCircle, Clock } from 'lucide-react';

interface Props { total: number; ativos: number; finalizados: number; inscricoes: number; }
export const ChampionshipSummary = memo(({ total, ativos, finalizados, inscricoes }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
    {[
      { label: 'Total', val: total, icon: Trophy, color: 'text-cyan-400', bg: 'bg-[#0a1628]/50', border: 'border-cyan-500/20', sub: 'Todas as competições' },
      { label: 'Ativos', val: ativos, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', sub: 'Em andamento' },
      { label: 'Finalizados', val: finalizados, icon: CheckCircle, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20', sub: 'Concluídos' },
      { label: 'Inscrições', val: inscricoes, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/20', sub: 'Aguardando aprovação' }
    ].map((item, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
        className={`rounded-xl border ${item.border} ${item.bg} backdrop-blur-md p-3 md:p-4 flex flex-col items-center text-center md:items-start md:text-left`}
      >
        <div className="flex items-center gap-2 mb-2">
          <item.icon size={14} className={item.color} />
          <span className={`text-[10px] uppercase font-bold tracking-wider ${item.color} opacity-80 truncate`}>{item.label}</span>
        </div>
        <p className="text-3xl md:text-4xl font-black text-white">{item.val}</p>
        <p className="text-[10px] text-textMuted mt-1 hidden md:block truncate">{item.sub}</p>
      </motion.div>
    ))}
  </div>
));
