import { Lightbulb, Shield, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamCompositionAdviceProps {
  parceria: any;
  aproveitamento: number;
}

export function TeamCompositionAdvice({ parceria, aproveitamento }: TeamCompositionAdviceProps) {
  if (!parceria || parceria.jogos_juntos < 3) return null; // Need minimum games to analyze

  const golsComb = (Number(parceria.gols_A_assistidos_por_B) || 0) + (Number(parceria.gols_B_assistidos_por_A) || 0);
  const mediaGolsComb = golsComb / (Number(parceria.jogos_juntos) || 1);

  let recommendation = {
    title: "PRECISA DE UM FINALIZADOR",
    desc: "A dupla possui entrosamento, mas a produção direta de gols é baixa. Um atacante com alta capacidade de finalização pode completar essa combinação.",
    priority: "ALTA",
    role: "ATACANTE FINALIZADOR",
    icon: Target,
    color: "text-pink-400",
    bg: "bg-pink-500/10"
  };

  if (aproveitamento < 45) {
    recommendation = {
      title: "PRECISA DE EQUILÍBRIO DEFENSIVO",
      desc: "A dupla apresenta baixo aproveitamento de vitórias. Um defensor sólido ou volante de marcação pode equilibrar a composição do time.",
      priority: "MÁXIMA",
      role: "DEFENSOR SÓLIDO",
      icon: Shield,
      color: "text-teal-400",
      bg: "bg-teal-500/10"
    };
  } else if (mediaGolsComb > 0.5) {
    recommendation = {
      title: "BASE SÓLIDA",
      desc: "Essa dupla possui forte conexão ofensiva e bom aproveitamento. É uma combinação agressiva que pode ser complementada com jogadores de retenção de posse.",
      priority: "MÉDIA",
      role: "MEIA CONTROLADOR",
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-500/10"
    };
  }

  return (
    <div className="mt-8 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-amber-400" size={20} />
        <h3 className="text-lg font-black uppercase tracking-wider text-white">COMO MONTAR O TIME?</h3>
      </div>

      <div className="bg-surface/30 border border-border/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <recommendation.icon className={recommendation.color} size={18} />
          <h4 className="font-bold text-white uppercase text-sm">{recommendation.title}</h4>
        </div>
        
        <p className="text-sm text-textMuted leading-relaxed mb-5 border-l-2 border-border/50 pl-3">
          {recommendation.desc}
        </p>

        <div className="bg-surfaceElevated rounded-lg p-3 border border-border/30">
          <div className="text-[9px] text-textMuted uppercase tracking-widest font-bold mb-1">
            PRIORIDADE {recommendation.priority}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full flex items-center justify-center", recommendation.bg)}>
              <div className={cn("w-1.5 h-1.5 rounded-full", recommendation.color.replace('text-', 'bg-'))} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">{recommendation.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
