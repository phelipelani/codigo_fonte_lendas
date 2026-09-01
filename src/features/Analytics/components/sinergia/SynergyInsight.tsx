import { Brain } from 'lucide-react';

interface SynergyInsightProps {
  jogadorA_nome: string;
  jogadorB_nome: string;
  parceria: any;
  aproveitamento: number;
}

export function SynergyInsight({ jogadorA_nome, jogadorB_nome, parceria, aproveitamento }: SynergyInsightProps) {
  if (!parceria || parceria.jogos_juntos === 0) return null;

  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];
  const golsComb = (Number(parceria.gols_A_assistidos_por_B) || 0) + (Number(parceria.gols_B_assistidos_por_A) || 0);

  let text = "";

  if (aproveitamento >= 60 && golsComb > 3) {
    text = `${nomeA} e ${nomeB} possuem excelente capacidade de vencer jogos juntos e uma forte conexão ofensiva direta. São peças fundamentais quando atuam no mesmo time.`;
  } else if (aproveitamento >= 60 && golsComb <= 3) {
    text = `${nomeA} e ${nomeB} possuem boa capacidade de vencer jogos juntos, mas a conexão ofensiva direta (gols combinados) entre os dois ainda é baixa. Eles funcionam bem juntos, mas não dependem de assistências um do outro para brilhar.`;
  } else if (aproveitamento < 45 && golsComb > 3) {
    text = `Apesar de possuírem uma boa conexão ofensiva direta, ${nomeA} e ${nomeB} apresentam baixo aproveitamento de vitórias quando jogam juntos. A dupla pode estar desequilibrando o time defensivamente.`;
  } else {
    text = `A sinergia entre ${nomeA} e ${nomeB} ainda precisa ser desenvolvida. Eles possuem baixo aproveitamento de vitórias e pouca conexão ofensiva direta em campo.`;
  }

  return (
    <div className="mt-8 mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="text-pink-400" size={20} />
        <h3 className="text-lg font-black uppercase tracking-wider text-white">O QUE OS NÚMEROS DIZEM?</h3>
      </div>
      <div className="border-l-2 border-pink-500 pl-4 py-1">
        <p className="text-sm text-textMuted leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
