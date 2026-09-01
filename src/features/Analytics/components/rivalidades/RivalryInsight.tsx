import { Brain } from 'lucide-react';

interface RivalryInsightProps {
  jogadorA_nome: string;
  jogadorB_nome: string;
  confronto: any;
  statsA: any;
  statsB: any;
}

export function RivalryInsight({ jogadorA_nome, jogadorB_nome, confronto, statsA, statsB }: RivalryInsightProps) {
  if (!confronto || confronto.jogos === 0) return null;

  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];
  
  const vA = Number(confronto.vitorias_A) || 0;
  const vB = Number(confronto.vitorias_B) || 0;
  const golsA = Number(statsA.gols) || 0;
  const golsB = Number(statsB.gols) || 0;

  let title = "Confronto equilibrado";
  let description = `Os jogadores possuem números muito próximos em confrontos diretos.`;

  if (vA > vB + 2) {
    title = `${nomeA} leva vantagem no confronto direto`;
    description = `Em ${confronto.jogos} partidas, ${nomeA} venceu ${vA} contra ${vB} de ${nomeB}. ${golsB > golsA ? `Apesar disso, ${nomeB} possui maior produção ofensiva individual geral.` : ''}`;
  } else if (vB > vA + 2) {
    title = `${nomeB} leva vantagem no confronto direto`;
    description = `Em ${confronto.jogos} partidas, ${nomeB} venceu ${vB} contra ${vA} de ${nomeA}. ${golsA > golsB ? `Apesar disso, ${nomeA} possui maior produção ofensiva individual geral.` : ''}`;
  } else {
    description = `Em ${confronto.jogos} partidas, o placar é bem apertado (${vA} vitórias para ${nomeA} e ${vB} para ${nomeB}). A diferença aparece principalmente nas estatísticas individuais.`;
  }

  return (
    <div className="mt-8 border-l-2 border-pink-500 pl-4 py-1">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="text-pink-400 w-4 h-4" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Insight da Rivalidade</h3>
      </div>
      <p className="text-sm text-white font-medium mb-1">{title}.</p>
      <p className="text-sm text-textMuted leading-relaxed">{description}</p>
    </div>
  );
}
