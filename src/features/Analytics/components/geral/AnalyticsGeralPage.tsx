import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import api from '@/api';

// Subcomponentes (vamos criar um por um)
import { OverviewCards } from './OverviewCards';
import { ScoringLegend } from './ScoringLegend';
import { AnalyticsFilters } from './AnalyticsFilters';
import { GeneralLeaderboard } from './GeneralLeaderboard';
import { GoalsEvolutionChart } from './GoalsEvolutionChart';
import { TopScorersCard } from './TopScorersCard';
import { TopAssistsCard } from './TopAssistsCard';
import { DefendersCleanSheetsCard } from './DefendersCleanSheetsCard';
import { GoalkeepersCleanSheetsCard } from './GoalkeepersCleanSheetsCard';
import { CardsRankingCard } from './CardsRankingCard';
import { IndividualAwardsCard } from './IndividualAwardsCard';
import { ChampionsRanking } from './ChampionsRanking';
import { CompetitionHistory } from './CompetitionHistory';
import { useState } from 'react';

export function AnalyticsGeralPage() {
  const [filterTitulos, setFilterTitulos] = useState<boolean>(true); // true = Com títulos
  const [filterPosicao, setFilterPosicao] = useState<'todos' | 'linha' | 'goleiro'>('linha'); // Padrão: linha
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'geral'],
    queryFn: async () => {
      const response = await api.get('/analytics/geral');
      return response.data;
    },
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center rounded-xl border border-red-500/30 bg-red-500/10">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="text-red-300 font-bold">Não foi possível carregar os dados</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* 1. Visão Panorâmica & Legenda */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        <OverviewCards totais={data.totais} />
        <ScoringLegend />
      </div>

      {/* 2. Filtros */}
      <AnalyticsFilters 
        comTitulos={filterTitulos} 
        onChangeComTitulos={setFilterTitulos} 
        posicao={filterPosicao}
        onChangePosicao={setFilterPosicao}
      />

      {/* 3. Classificação Geral */}
      <GeneralLeaderboard 
        data={data.rankingPontuacao || []} 
        comTitulos={filterTitulos}
        posicao={filterPosicao}
      />

      {/* 4. Gráficos Menores e Rankings (Evolução, Artilharia, Garçom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <GoalsEvolutionChart evolucao={data.evolucao || []} />
        </div>
        <div className="lg:col-span-1">
          <TopScorersCard artilheiros={data.rankings?.artilheiros || []} />
        </div>
        <div className="lg:col-span-1">
          <TopAssistsCard garcons={data.rankings?.garcons || []} />
        </div>
      </div>

      {/* 5. Defesa, Cartões e Prêmios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DefendersCleanSheetsCard zagueiros={data.rankings?.zagueiros || []} />
        <GoalkeepersCleanSheetsCard goleiros={data.rankings?.goleiros || []} />
        <CardsRankingCard cartoes={data.cartoes || []} />
        <IndividualAwardsCard premios={data.premios || { mvps: [], pe_de_rato: [] }} />
      </div>

      {/* 6. Histórico e Times */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        <ChampionsRanking campeoes={data.campeoes || []} />
        <CompetitionHistory historico={data.historico || []} />
      </div>

    </div>
  );
}
