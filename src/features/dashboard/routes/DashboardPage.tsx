// Arquivo: src/features/dashboard/routes/DashboardPage.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  ArrowRight,
  Shield,
  Activity,
  Flame,
  Goal,
  TrendingUp,
  Zap,
  Play,
  Star,
  Sparkles,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import api from "@/api";
import icDashboard from '@/assets/icones/dashboard.webp';

import { fadeUp, FASES_ATIVAS } from "../components/dashboardConstants";
import KPICard from "../components/KPICard";
import SectionHeader from "../components/SectionHeader";
import LastMatchHero from "../components/LastMatchHero";
import ActiveCampCard from "../components/ActiveCampCard";
import HeroSpotlightCard from "../components/HeroSpotlightCard";
import QuickActionButton from "../components/QuickActionButton";
import { Skeleton } from "@/components/ui/Skeleton";

// =============================================================================
// DASHBOARD PAGE — coordinator
// =============================================================================
export function DashboardPage() {
  const { data: campeonatos, isLoading: loadingCamps } = useQuery({
    queryKey: ["campeonatos"],
    queryFn: async () => (await api.get("/campeonatos")).data,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", "panoramica"],
    queryFn: async () => (await api.get("/analytics/panoramica")).data,
  });

  // MVP e Pé de Rato da semana via hall-da-fama
  const { data: destaquesRodada } = useQuery({
    queryKey: ["stats", "destaques-rodada"],
    queryFn: async () => (await api.get("/stats/destaques-rodada")).data,
    staleTime: 1000 * 60 * 5,
  });

  const activeCamps = useMemo(
    () =>
      (Array.isArray(campeonatos) ? campeonatos : []).filter((c: any) =>
        FASES_ATIVAS.includes(c.fase_atual),
      ),
    [campeonatos],
  );

  const totais = analytics?.totais || {};

  // Suporta múltiplos MVPs/Pé de Ratos (array ou objeto único)
  const mvpList = useMemo(() => {
    const mvpRaw = destaquesRodada?.mvp ?? null;
    return mvpRaw ? (Array.isArray(mvpRaw) ? mvpRaw : [mvpRaw]) : [];
  }, [destaquesRodada?.mvp]);

  const peDeRatoList = useMemo(() => {
    const peDeRatoRaw = destaquesRodada?.peDeRato ?? null;
    return peDeRatoRaw ? (Array.isArray(peDeRatoRaw) ? peDeRatoRaw : [peDeRatoRaw]) : [];
  }, [destaquesRodada?.peDeRato]);

  const mediaGols = useMemo(
    () =>
      totais.total_jogos > 0
        ? (totais.total_gols / totais.total_jogos).toFixed(1)
        : "0",
    [totais.total_jogos, totais.total_gols],
  );

  return (
    <div className="min-h-screen">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <motion.header {...fadeUp(0)} className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            {/* eyebrow */}
            <div className="flex items-center gap-2 mb-2">
              <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-400/70">
                FutLendas HQ
              </span>
            </div>
            {/* título com estilo Montserrat dourado */}
            <h1 className="flex items-center gap-2 sm:gap-3">
              <img src={icDashboard} alt="" className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-lg" />
              <span className="relative text-2xl sm:text-3xl md:text-4xl uppercase tracking-wide" style={{ fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: 900 }}>
                <span className="absolute inset-0" style={{ color: '#2a1b02', textShadow: '0px 1px 0px #4d3509, 0px 2px 0px #3f2a06, 0px 3px 0px #2a1b02, 0px 4px 6px rgba(0,0,0,0.7)' }} aria-hidden="true">Dashboard</span>
                <span className="relative" style={{ background: 'linear-gradient(to bottom, #f5d76e 0%, #d4af37 30%, #aa771c 60%, #8b5a10 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dashboard</span>
              </span>
            </h1>
          </div>
          <Link to="/partidas" className="flex-shrink-0 mt-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              Histórico <ArrowRight size={10} />
            </motion.button>
          </Link>
        </div>
      </motion.header>

      {/* ── KPIs (clicáveis — navegam para tela relevante) ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 sm:mb-8">
        <KPICard
          title="Partidas"
          value={totais.total_jogos || 0}
          icon={Activity}
          color="cyan"
          delay={0.05}
          to="/partidas"
        />
        <KPICard
          title="Gols"
          value={totais.total_gols || 0}
          icon={Goal}
          color="emerald"
          delay={0.1}
          to="/analytics"
        />
        <KPICard
          title="Jogadores"
          value={totais.total_jogadores || 0}
          icon={Users}
          color="violet"
          delay={0.15}
          to="/jogadores"
        />
        <KPICard
          title="Média/Jogo"
          value={mediaGols}
          icon={TrendingUp}
          color="amber"
          suffix="gols"
          delay={0.2}
          to="/analytics"
        />
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* coluna principal 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-4 sm:gap-6">
          <section>
            <SectionHeader
              icon={Zap}
              label="Último Resultado"
              iconClass="text-cyan-400"
            />
            <LastMatchHero />
          </section>

          <section>
            <SectionHeader
              icon={Activity}
              label="Rolando Agora"
              iconClass="text-emerald-400"
            />
            <div className="flex flex-col gap-4">
              {loadingCamps ? (
                <>
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </>
              ) : activeCamps.length > 0 ? (
                activeCamps
                  .slice(0, 2)
                  .map((camp: any, i: number) => (
                    <ActiveCampCard
                      key={camp.id}
                      camp={camp}
                      delay={0.1 + i * 0.05}
                    />
                  ))
              ) : (
                <motion.div
                  {...fadeUp(0.1)}
                  className="flex flex-col items-center gap-3 py-10 rounded-xl border border-dashed border-white/[0.06] text-center"
                >
                  <Trophy size={22} className="text-white/10" />
                  <p className="text-[11px] text-white/25">
                    Nenhuma competição em andamento
                  </p>
                  <Link to="/campeonatos/novo">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs gap-1.5"
                    >
                      <Play size={11} /> Criar Campeonato
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {/* coluna lateral 1/3 */}
        <div className="flex flex-col gap-4 sm:gap-6">
          {(mvpList.length > 0 || peDeRatoList.length > 0) && (
            <section>
              <SectionHeader
                icon={Flame}
                label="Em Destaque"
                iconClass="text-orange-400"
              />
              <div className="flex flex-col gap-2">
                {mvpList.map((mvp: any, idx: number) => (
                  <HeroSpotlightCard
                    key={`mvp-${idx}`}
                    title={mvpList.length > 1 ? `MVP da Semana (${idx + 1}/${mvpList.length})` : "MVP da Semana"}
                    badge="MVP"
                    player={mvp}
                    icon={Sparkles}
                    color="amber"
                    delay={0.25 + idx * 0.05}
                    isPeDeRato={false}
                  />
                ))}
                {peDeRatoList.map((pr: any, idx: number) => (
                  <HeroSpotlightCard
                    key={`pr-${idx}`}
                    title={peDeRatoList.length > 1 ? `Pé de Rato da Semana (${idx + 1}/${peDeRatoList.length})` : "Pé de Rato da Semana"}
                    badge="🐀 Pé de Rato"
                    player={pr}
                    icon={Medal}
                    color="orange"
                    delay={0.3 + idx * 0.05}
                    isPeDeRato={true}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader icon={Star} label="Acesso Rápido" />
            {/* 4 colunas em mobile, 2 no desktop lateral */}
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
              <QuickActionButton
                to="/campeonatos/novo"
                icon={Trophy}
                label="Novo Camp"
                color="amber"
              />
              <QuickActionButton
                to="/jogadores"
                icon={Users}
                label="Jogadores"
                color="emerald"
              />
              <QuickActionButton
                to="/times"
                icon={Shield}
                label="Times"
                color="cyan"
              />
              <QuickActionButton
                to="/analytics"
                icon={Activity}
                label="Analytics"
                color="violet"
              />
            </div>
          </section>

          {totais.total_jogos > 0 && (
            <motion.section
              {...fadeUp(0.35)}
              className="grid grid-cols-2 gap-2 pt-4 border-t border-white/[0.05]"
            >
              <div className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="text-2xl font-black text-white tabular-nums leading-none">
                  {totais.total_jogos}
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                  Partidas
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                <span className="text-2xl font-black text-emerald-400 tabular-nums leading-none">
                  {totais.total_gols}
                </span>
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                  Gols
                </span>
              </div>
            </motion.section>
          )}
        </div>
      </div>
    </div>
  );
}
