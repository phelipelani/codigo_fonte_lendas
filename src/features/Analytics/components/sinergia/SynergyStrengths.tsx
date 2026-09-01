import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SynergyStrengthsProps {
  parceria: any;
  aproveitamento: number;
}

export function SynergyStrengths({ parceria, aproveitamento }: SynergyStrengthsProps) {
  if (!parceria || parceria.jogos_juntos < 3) return null;

  const golsComb = (Number(parceria.gols_A_assistidos_por_B) || 0) + (Number(parceria.gols_B_assistidos_por_A) || 0);

  const strengths = [];
  const weaknesses = [];

  if (aproveitamento >= 60) strengths.push('Alto aproveitamento (+' + aproveitamento + '%)');
  if (golsComb > 3) strengths.push('Excelente criação de gols juntos');
  if (Number(parceria.jogos_juntos) > 10) strengths.push('Dupla experiente (entrosamento alto)');

  if (aproveitamento < 45) weaknesses.push('Baixa consistência de vitórias');
  if (golsComb === 0) weaknesses.push('Nenhuma conexão ofensiva direta');

  if (strengths.length === 0) strengths.push('Fase de adaptação');
  if (weaknesses.length === 0) weaknesses.push('Nenhum ponto fraco evidente');

  return (
    <div className="mt-8 mb-10 flex flex-col gap-4">
      {/* Pontos Fortes */}
      <div className="bg-surface/30 border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <h4 className="font-bold text-white uppercase text-sm">PONTOS FORTES</h4>
        </div>
        <ul className="flex flex-col gap-2">
          {strengths.map((str, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-textMuted">
              <CheckCircle2 size={14} className="text-emerald-400" />
              {str}
            </li>
          ))}
        </ul>
      </div>

      {/* Pontos a Melhorar */}
      <div className="bg-surface/30 border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <h4 className="font-bold text-white uppercase text-sm">PONTOS A MELHORAR</h4>
        </div>
        <ul className="flex flex-col gap-2">
          {weaknesses.map((wk, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-textMuted">
              <AlertCircle size={14} className="text-orange-400" />
              {wk}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
