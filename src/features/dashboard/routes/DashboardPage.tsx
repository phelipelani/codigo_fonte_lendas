import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import icDashboard from '@/assets/icones/dashboard.webp';

import { useDashboardOverview } from '../api/useDashboardOverview';
import { DashboardSummaryKPIs } from '../components/DashboardSummaryKPIs';
import { CurrentCompetitionHero } from '../components/CurrentCompetitionHero';
import { RoundHighlightsSection } from '../components/RoundHighlightsSection';
import { LatestRoundMatches } from '../components/LatestRoundMatches';
import { RoundMomentsCard } from '../components/RoundMomentsCard';
import { TrendsCard } from '../components/TrendsCard';
import { TopPlayersCard } from '../components/TopPlayersCard';
import { FutLendasHistoryCard } from '../components/FutLendasHistoryCard';
import { ChampionsRanking } from '@/features/Analytics/components/geral/ChampionsRanking';
import { Skeleton } from '@/components/ui/Skeleton';

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboardOverview();

  if (isLoading) {
    return (
      <div className="min-h-screen space-y-6 pb-12">
        <Skeleton className="h-16 w-64 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar o Dashboard</h2>
        <p className="text-sm text-zinc-400 mb-4">Não foi possível obter as informações do servidor.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs uppercase"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-5 sm:space-y-6 pb-16 text-zinc-100">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 pt-1"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400/80">
              FutLendas HQ
            </span>
          </div>
          <h1 className="flex items-center gap-2.5">
            <img src={icDashboard} alt="" className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg" />
            <span
              className="relative text-2xl sm:text-3xl md:text-4xl uppercase tracking-wide font-black"
              style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}
            >
              <span
                className="absolute inset-0"
                style={{
                  color: '#2a1b02',
                  textShadow: '0px 1px 0px #4d3509, 0px 2px 0px #3f2a06, 0px 3px 0px #2a1b02, 0px 4px 6px rgba(0,0,0,0.7)',
                }}
                aria-hidden="true"
              >
                Dashboard
              </span>
              <span
                className="relative"
                style={{
                  background: 'linear-gradient(to bottom, #f5d76e 0%, #d4af37 30%, #aa771c 60%, #8b5a10 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Dashboard
              </span>
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 hidden sm:block">
            Visão geral do campeonato e destaques
          </p>
        </div>

        <Link to="/partidas" className="shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            Histórico <ArrowRight size={12} />
          </motion.button>
        </Link>
      </motion.header>

      {/* ── LINHA 1: MÉTRICAS DE RESUMO (KPIs) ───────────────────────────────── */}
      <DashboardSummaryKPIs totais={data.totais} />

      {/* ── LINHA 2: CAMPEONATO ATUAL ───────────────────────────────────────── */}
      <CurrentCompetitionHero camp={data.campeonato_atual} />

      {/* ── MOBILE LAYOUT (empilhado e organizado por importância) ──────────── */}
      <div className="flex flex-col gap-5 lg:hidden">
        {/* Destaques da Rodada */}
        <RoundHighlightsSection destaques={data.destaques} />

        {/* Última Rodada */}
        <LatestRoundMatches ultimaRodada={data.ultima_rodada} />

        {/* Momentos da Rodada */}
        <RoundMomentsCard momentos={data.momentos} destaques={data.destaques} />

        {/* Top 5 Jogadores */}
        <TopPlayersCard jogadores={data.top_jogadores} />

        {/* Em Alta / Em Queda */}
        <TrendsCard tendencias={data.tendencias} />

        {/* Ranking de Campeões (Podium) */}
        <div className="pt-2">
          <ChampionsRanking campeoes={data.campeoes} />
        </div>

        {/* História do FutLendas */}
        <FutLendasHistoryCard historia={data.historia} />
      </div>

      {/* ── DESKTOP LAYOUT (Centro de Comando Amplo) ─────────────────────────── */}
      <div className="hidden lg:flex flex-col gap-6">
        {/* Linha 3: Última Rodada (Esquerda 42%) + Destaques da Semana (Direita 58%) */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          <div className="col-span-5">
            <LatestRoundMatches ultimaRodada={data.ultima_rodada} />
          </div>
          <div className="col-span-7">
            <RoundHighlightsSection destaques={data.destaques} />
          </div>
        </div>

        {/* Linha 4: Momentos da Rodada (30%) + Em Alta / Em Queda (38%) + Top 5 Jogadores (32%) */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          <div className="col-span-4">
            <RoundMomentsCard momentos={data.momentos} destaques={data.destaques} />
          </div>
          <div className="col-span-4">
            <TrendsCard tendencias={data.tendencias} />
          </div>
          <div className="col-span-4">
            <TopPlayersCard jogadores={data.top_jogadores} />
          </div>
        </div>

        {/* Linha 5: Ranking de Times - Campeões (65%) + História do FutLendas (35%) */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          <div className="col-span-8">
            <ChampionsRanking campeoes={data.campeoes} />
          </div>
          <div className="col-span-4">
            <FutLendasHistoryCard historia={data.historia} />
          </div>
        </div>
      </div>
    </div>
  );
}
