import { memo } from 'react';
import { ActiveChampionshipCard } from './ActiveChampionshipCard';
import { FinishedChampionshipCard } from './FinishedChampionshipCard';

export const ChampionshipCard = memo(({ campeonato, index }: any) => {
  const isFinalizado = campeonato.fase_atual === 'finalizada' || campeonato.fase_atual === 'finalizado';
  if (isFinalizado) return <FinishedChampionshipCard campeonato={campeonato} index={index} />;
  return <ActiveChampionshipCard campeonato={campeonato} index={index} />;
});
