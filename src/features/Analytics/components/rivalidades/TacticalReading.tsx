import { Lightbulb } from 'lucide-react';

interface TacticalReadingProps {
  jogadorA_nome: string;
  jogadorB_nome: string;
  statsA: any;
  statsB: any;
  aprovA: number;
  aprovB: number;
}

export function TacticalReading({ jogadorA_nome, jogadorB_nome, statsA, statsB, aprovA, aprovB }: TacticalReadingProps) {
  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];
  
  const participacoesA = (Number(statsA.gols) || 0) + (Number(statsA.assists) || 0);
  const participacoesB = (Number(statsB.gols) || 0) + (Number(statsB.assists) || 0);

  const maisOfensivo = participacoesA > participacoesB ? nomeA : nomeB;
  const maisConsistente = aprovA > aprovB ? nomeA : nomeB;

  if (participacoesA === 0 && participacoesB === 0) return null;

  return (
    <div className="mt-6 border-l-2 border-amber-500 pl-4 py-1">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="text-amber-400 w-4 h-4" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Leitura do Confronto</h3>
      </div>
      <p className="text-sm text-textMuted leading-relaxed">
        {maisOfensivo === maisConsistente ? (
          `${maisOfensivo} domina tanto na produção ofensiva quanto na consistência de resultados. É a escolha mais segura para qualquer cenário.`
        ) : (
          `Se o objetivo é produção ofensiva, ${maisOfensivo} apresenta vantagem. Se o objetivo é consistência de resultados, ${maisConsistente} é a escolha mais segura.`
        )}
      </p>
    </div>
  );
}
