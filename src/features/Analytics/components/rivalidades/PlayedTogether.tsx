import { Handshake } from 'lucide-react';

interface PlayedTogetherProps {
  parceria: any;
}

export function PlayedTogether({ parceria }: PlayedTogetherProps) {
  if (!parceria || parceria.jogos_juntos === 0) return null;

  const golsCombinados = (parceria.gols_A_assistidos_por_B || 0) + (parceria.gols_B_assistidos_por_A || 0);

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Handshake className="text-emerald-400 w-4 h-4" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Quando Jogaram Juntos</h3>
      </div>

      <div className="bg-surface/30 rounded-2xl p-5 border border-border/50">
        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
          <div>
            <div className="text-2xl font-black text-white">{parceria.jogos_juntos}</div>
            <div className="text-[10px] uppercase text-textMuted mt-1">Jogos Juntos</div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{parceria.vitorias_juntos}</div>
            <div className="text-[10px] uppercase text-textMuted mt-1">Vitórias</div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{golsCombinados}</div>
            <div className="text-[10px] uppercase text-textMuted mt-1">Gols Combinados</div>
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400">
              {(parceria.gols_A_assistidos_por_B || 0) + (parceria.gols_B_assistidos_por_A || 0)}
            </div>
            <div className="text-[10px] uppercase text-textMuted mt-1">Assistências Entre Si</div>
          </div>
        </div>
      </div>
    </div>
  );
}
