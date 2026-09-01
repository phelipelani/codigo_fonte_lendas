import { memo } from 'react';
import { Lightbulb } from 'lucide-react';

export const CompetitionTips = memo(() => (
  <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex gap-4 items-start mb-16">
     <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0 text-yellow-500">
        <Lightbulb size={16} />
     </div>
     <div>
        <h4 className="text-xs font-black text-yellow-500 uppercase tracking-wider mb-2">Dicas</h4>
        <ul className="space-y-2 text-xs text-textMuted font-medium">
           <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-yellow-500/50 flex-shrink-0" /> Crie competições de copa para partidas rápidas e torneios especiais.</li>
           <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-yellow-500/50 flex-shrink-0" /> Utilize pontos corridos para competições com várias rodadas.</li>
        </ul>
     </div>
  </div>
));
