import { memo } from 'react';
import { Scroll, Trophy, Users, CheckCircle, Flame } from 'lucide-react';

export const CompetitionHistory = memo(({ campeonatos }: { campeonatos: any[] }) => {
  const timesParticipantes = [...new Set(campeonatos.map(c => c.total_times_inscritos || 0))].reduce((a,b)=>a+b, 0); 
  return (
    <div className="mt-12 md:mt-16 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Scroll className="text-amber-500" size={24} />
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">História do FutLendas</h2>
      </div>
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-surfaceElevated/50 to-[#0a1628]/80 p-6 md:p-8">
        <p className="text-sm md:text-base text-textMuted font-medium mb-8">
          Cada campeonato disputado é parte do legado e da construção da <strong className="text-white">História do FutLendas</strong>.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
             <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-textMuted tracking-wider mb-2"><Trophy size={14} className="text-amber-400"/> Campeonatos</h4>
             <p className="text-3xl font-black text-white">{campeonatos.length}</p>
          </div>
          <div>
             <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-textMuted tracking-wider mb-2"><Users size={14} className="text-cyan-400"/> Participantes</h4>
             <p className="text-3xl font-black text-white">+{timesParticipantes}</p>
          </div>
          <div>
             <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-textMuted tracking-wider mb-2"><CheckCircle size={14} className="text-emerald-400"/> Partidas</h4>
             <p className="text-3xl font-black text-white">---</p>
          </div>
          <div>
             <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-textMuted tracking-wider mb-2"><Flame size={14} className="text-orange-400"/> Gols</h4>
             <p className="text-3xl font-black text-white">---</p>
          </div>
        </div>
      </div>
    </div>
  );
});
