import { memo } from 'react';
import { HelpCircle, Star, Medal, Flag, Flame, Target, Shield, Square, AlertCircle, Trophy } from 'lucide-react';

const legendItems = [
  { label: 'Vitória', pts: '+3.0', icon: Star, color: 'text-emerald-400' },
  { label: 'Empate', pts: '+1.5', icon: Medal, color: 'text-amber-400' },
  { label: 'Derrota', pts: '-1.0', icon: Flag, color: 'text-red-400' },
  { label: 'Gol marcado', pts: '+1.5', icon: Flame, color: 'text-orange-400' },
  { label: 'Assistência', pts: '+1.0', icon: Target, color: 'text-cyan-400' },
  { label: 'Clean sheet (ZAG)', pts: '+1.0', icon: Shield, color: 'text-slate-400' },
  { label: 'Clean sheet (GOL)', pts: '+1.0', icon: Shield, color: 'text-slate-300' },
  { label: 'Cartão amarelo', pts: '-0.5', icon: Square, color: 'text-yellow-400', fill: true },
  { label: 'Cartão azul', pts: '-1.0', icon: Square, color: 'text-blue-500', fill: true },
  { label: 'Cartão vermelho', pts: '-2.0', icon: Square, color: 'text-red-600', fill: true },
  { label: 'Título (Liga)', pts: '+100', icon: Trophy, color: 'text-amber-400' },
  { label: 'Título (Copa)', pts: '+150', icon: Trophy, color: 'text-amber-400' },
];

export const ScoringLegend = memo(() => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={18} className="text-textMuted" />
        <div>
          <h2 className="text-xs font-black text-white uppercase tracking-wider">Legenda de Pontuação</h2>
          <p className="text-[10px] text-textMuted">Entenda como cada ação gera pontos</p>
        </div>
      </div>
      
      <div className="bg-surface/30 border border-border/50 rounded-2xl p-4 flex flex-col gap-2.5">
        {legendItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <item.icon size={12} className={item.color} fill={item.fill ? 'currentColor' : 'none'} />
              <span className="text-[11px] font-medium text-slate-300">{item.label}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{item.pts} pts</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2">
          <Trophy size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <span className="text-[10px] text-slate-400 leading-tight">
            Títulos possuem bônus especial (+100 Liga, +150 Copa). Outros prêmios de rodada/campeonato também somam pontos.
          </span>
        </div>
      </div>
    </div>
  );
});
