import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, User } from 'lucide-react';
import api from '@/api';
import { useJogadores } from '@/features/jogadores/api/useJogadores';

import { PlayerSelector } from './PlayerSelector';
import { PlayerHero } from './PlayerHero';
import { PlayerStatGrid } from './PlayerStatGrid';
import { PerformanceChart } from './PerformanceChart';
import { AverageStatsCard } from './AverageStatsCard';
import { PersonalRecordsCard } from './PersonalRecordsCard';
import { PartnershipGrid } from './PartnershipGrid';
import { RecentMatches } from './RecentMatches';

export function PlayerPage() {
  const { data: todosJogadores } = useJogadores();
  const [jogadorId, setJogadorId] = useState<string>("");

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['analytics', 'jogador', jogadorId],
    queryFn: async () => {
      if (!jogadorId) return null;
      const res = await api.get(`/analytics/jogador/${jogadorId}`);
      return res.data;
    },
    enabled: !!jogadorId
  });

  const listaJogadores = todosJogadores || [];
  const jogador = perfil?.jogador;

  const totais = {
    jogos:        Number(perfil?.totais?.jogos        ?? 0),
    gols:         Number(perfil?.totais?.gols         ?? 0),
    assists:      Number(perfil?.totais?.assists      ?? 0),
    clean_sheets: Number(perfil?.totais?.clean_sheets ?? 0),
  };
  const desempenho = {
    vitorias: Number(perfil?.desempenho?.vitorias ?? 0),
    empates:  Number(perfil?.desempenho?.empates  ?? 0),
    derrotas: Number(perfil?.desempenho?.derrotas ?? 0),
  };

  const recordes = perfil?.recordes || {};
  const parcerias = perfil?.parcerias || {};
  const ultimasPartidas = perfil?.ultimasPartidas || [];
  const titulos = perfil?.titulos || [];
  const rankingGeral = perfil?.rankingGeral || { posicao: 0, pontos_total: 0 };

  const totalJogos = totais.jogos;
  const ptsDisputados = totalJogos * 3;
  const ptsGanhos = (desempenho.vitorias * 3) + desempenho.empates;
  const aproveitamento = ptsDisputados > 0 ? Math.round((ptsGanhos / ptsDisputados) * 100) : 0;

  const mediaGols = totalJogos > 0 ? (totais.gols / totalJogos).toFixed(2) : '0.00';
  const mediaAssists = totalJogos > 0 ? (totais.assists / totalJogos).toFixed(2) : '0.00';
  const mediaGA = totalJogos > 0 ? ((totais.gols + totais.assists) / totalJogos).toFixed(2) : '0.00';

  return (
    <div className="w-full pb-20">
      <PlayerSelector 
        jogadorId={jogadorId} 
        setJogadorId={setJogadorId} 
        jogadores={listaJogadores} 
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
        </div>
      )}

      {!jogadorId && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 px-4">
          <div className="w-24 h-24 rounded-full bg-surfaceElevated/50 border border-border/50 flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-textMuted/50" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Nenhum jogador selecionado</h3>
          <p className="text-textMuted text-sm max-w-xs mx-auto">
            Utilize o campo de busca acima para carregar o raio-x completo de um atleta.
          </p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {perfil && jogador && !isLoading && (
          <motion.div
            key={jogadorId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 max-w-7xl mx-auto"
          >
            {/* HERO */}
            <PlayerHero 
              jogador={jogador} 
              rankingGeral={rankingGeral} 
              aproveitamento={aproveitamento} 
            />

            {/* MAIN STATS */}
            <PlayerStatGrid 
              totais={totais} 
              desempenho={desempenho} 
              titulos={titulos} 
            />

            {/* CHARTS AND AVERAGES */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              <PerformanceChart 
                aproveitamento={aproveitamento} 
                ultimasPartidas={ultimasPartidas} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <AverageStatsCard 
                  mediaGols={mediaGols} 
                  mediaAssists={mediaAssists} 
                  mediaGA={mediaGA} 
                />
                <PersonalRecordsCard 
                  recordes={recordes} 
                />
              </div>
            </div>

            {/* PARTNERSHIPS */}
            <PartnershipGrid parcerias={parcerias} />

            {/* RECENT MATCHES */}
            <RecentMatches ultimasPartidas={ultimasPartidas} />

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
