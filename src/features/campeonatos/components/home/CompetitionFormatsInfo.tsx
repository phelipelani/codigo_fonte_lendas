import { memo } from 'react';
import { Trophy, Shield } from 'lucide-react';

export const CompetitionFormatsInfo = memo(() => (
  <div className="mb-8">
    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Sobre os Formatos</h3>
    <div className="grid md:grid-cols-2 gap-4">
       <div className="p-4 rounded-xl bg-surface/30 border border-border/50">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-2"><Trophy size={16} className="text-amber-400"/> Pontos Corridos</h4>
          <p className="text-xs text-textMuted">Todos jogam contra todos. O campeão é definido pela maior pontuação.</p>
       </div>
       <div className="p-4 rounded-xl bg-surface/30 border border-border/50">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-2"><Shield size={16} className="text-amber-400"/> Copa</h4>
          <p className="text-xs text-textMuted">Disputas eliminatórias até a grande final.</p>
       </div>
    </div>
  </div>
));
