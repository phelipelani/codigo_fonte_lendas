import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { useJogadores } from '@/features/jogadores/api/useJogadores';

import { SynergyHeader } from './SynergyHeader';
import { TopSynergyRankings } from './TopSynergyRankings';
import { SynergyDetailedComparison } from './SynergyDetailedComparison';
import { SynergyFooterInsights } from './SynergyFooterInsights';
import { SynergyRankingModal } from './SynergyRankingModal';
import { PlayerSelector } from '../rivalidades/PlayerSelector';
import { PlayerSelectionSheet } from '../rivalidades/PlayerSelectionSheet';

export function SynergyPage() {
  const { data: todosJogadores, isLoading: isJogadoresLoading } = useJogadores();
  const [jogadorAId, setJogadorAId] = useState<string>('');
  const [jogadorBId, setJogadorBId] = useState<string>('');
  const [isSheetAOpen, setIsSheetAOpen] = useState(false);
  const [isSheetBOpen, setIsSheetBOpen] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  // Nível 1 Data
  const { data: sinergiaData, isLoading: isSinergiaLoading } = useQuery({
    queryKey: ['analytics', 'sinergia-geral'],
    queryFn: async () => {
      const res = await api.get('/analytics/sinergia');
      return res.data;
    }
  });

  // Nível 2 Data (when both selected)
  const { data: confrontoData, isLoading: isConfrontoLoading } = useQuery({
    queryKey: ['analytics', 'confronto', jogadorAId, jogadorBId],
    queryFn: async () => {
      const res = await api.get(`/analytics/confronto/${jogadorAId}/${jogadorBId}`);
      return res.data;
    },
    enabled: !!jogadorAId && !!jogadorBId
  });

  const listaJogadores = todosJogadores || [];
  
  // Use data from API if available, fallback to local find
  const jogA = confrontoData?.jogadorA || listaJogadores.find((j: any) => String(j.id) === jogadorAId) || null;
  const jogB = confrontoData?.jogadorB || listaJogadores.find((j: any) => String(j.id) === jogadorBId) || null;
  const parceria = confrontoData?.parceria;

  // Auto-open second selector
  useEffect(() => {
    if (jogadorAId && !jogadorBId) {
      setTimeout(() => setIsSheetBOpen(true), 300);
    }
  }, [jogadorAId, jogadorBId]);

  const handleSwap = () => {
    const a = jogadorAId;
    setJogadorAId(jogadorBId);
    setJogadorBId(a);
  };

  const calcAprov = (v: any = 0, e: any = 0, j: any = 0) => {
    const numV = Number(v) || 0;
    const numE = Number(e) || 0;
    const numJ = Number(j) || 0;
    if (!numJ) return 0;
    return Math.round(((numV * 3 + numE) / (numJ * 3)) * 100);
  };

  const isLevel2 = !!jogadorAId && !!jogadorBId;
  const aproveitamento = parceria ? calcAprov(parceria.vitorias_juntos, parceria.empates_juntos, parceria.jogos_juntos) : 0;
  
  if (isJogadoresLoading || (isSinergiaLoading && !isLevel2)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 w-full overflow-x-hidden">
      <SynergyHeader />

      <PlayerSelector 
        jogadorA={jogA}
        jogadorB={jogB}
        onOpenSelectorA={() => setIsSheetAOpen(true)}
        onOpenSelectorB={() => setIsSheetBOpen(true)}
        onSwap={handleSwap}
        icon="VS"
      />

      <TopSynergyRankings 
        sinergiaData={sinergiaData} 
        onVerTodos={() => setIsRankingModalOpen(true)} 
      />

      <AnimatePresence mode="wait">
        {isLevel2 && (
          <motion.div 
            key="nivel2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {isConfrontoLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              </div>
            ) : (
              <>
                <SynergyDetailedComparison 
                  parceria={parceria} 
                  jogadorA={jogA} 
                  jogadorB={jogB} 
                  aproveitamento={aproveitamento} 
                />
                <SynergyFooterInsights 
                  parceria={parceria} 
                  jogadorA_nome={jogA.nome} 
                  jogadorB_nome={jogB.nome} 
                  aproveitamento={aproveitamento} 
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <SynergyRankingModal 
        open={isRankingModalOpen} 
        onOpenChange={setIsRankingModalOpen} 
        sinergiaData={sinergiaData} 
        jogadores={listaJogadores}
        onSelectDuo={(idA, idB) => {
          setJogadorAId(idA);
          setJogadorBId(idB);
        }}
      />

      <PlayerSelectionSheet
        open={isSheetAOpen}
        onOpenChange={setIsSheetAOpen}
        title="ESCOLHER JOGADOR"
        jogadores={listaJogadores}
        onSelect={setJogadorAId}
        excludeId={jogadorBId}
      />

      <PlayerSelectionSheet
        open={isSheetBOpen}
        onOpenChange={setIsSheetBOpen}
        title="ESCOLHER JOGADOR"
        jogadores={listaJogadores}
        onSelect={setJogadorBId}
        excludeId={jogadorAId}
      />
    </div>
  );
}
