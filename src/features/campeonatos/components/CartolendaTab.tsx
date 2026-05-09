// Arquivo: src/features/Campeonatos/components/CartolendaTab.tsx
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Shield, History } from 'lucide-react';

import { AbaEscalar } from '@/features/cartolendas/components/abas/AbaEscalar';
import { AbaHistoricoCompleto } from '@/features/cartolendas/components/abas/AbaHistoricoCompleto';
import { AbaRankingTecnicos } from '@/features/cartolendas/components/abas/AbaRankingTecnicos';
import { PatrimonioCard } from '@/features/cartolendas/components/ranking/PatrimonioCard';
import { useRankingCartolenda } from '@/api/cartolendaApi';

const abas = [
  { key: 'escalar', label: 'Escalacao', icon: Shield },
  { key: 'historico', label: 'Historico', icon: History },
  { key: 'ranking', label: 'Ranking', icon: Trophy },
] as const;

type Aba = typeof abas[number]['key'];

export function CartolendaTab({ campeonatoId }: { campeonatoId: number }) {
  const [subAba, setSubAba] = useState<Aba>('escalar');
  const { data: ranking } = useRankingCartolenda();

  return (
    <div className="space-y-4">
      <PatrimonioCard />

      {/* Abas de navegacao */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {abas.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubAba(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-all',
              subAba === key
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Conteudo */}
      {subAba === 'escalar' && <AbaEscalar campeonatoId={campeonatoId} />}
      {subAba === 'historico' && <AbaHistoricoCompleto campeonatoId={campeonatoId} />}
      {subAba === 'ranking' && <AbaRankingTecnicos campeonatoId={campeonatoId} membros={ranking ?? []} />}
    </div>
  );
}
