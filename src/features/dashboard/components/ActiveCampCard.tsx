// Arquivo: src/features/dashboard/components/ActiveCampCard.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/api";
import { cn } from "@/lib/utils";
import { fadeUp } from "./dashboardConstants";

interface ActiveCampCardProps {
  camp: any;
  delay?: number;
}

const ClassificacaoRow = React.memo(function ClassificacaoRow({
  item,
  index,
}: {
  item: any;
  index: number;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1.5rem_1fr_2rem_2rem_2rem] gap-x-2 items-center px-2 py-1.5 rounded-lg transition-colors",
        index === 0 && "bg-emerald-400/5",
        index < 3 && "border-l-2 border-l-transparent",
        index === 0 && "border-l-emerald-400/60",
        index === 1 && "border-l-gray-400/40",
        index === 2 && "border-l-amber-600/40",
      )}
    >
      {/* posição */}
      <span
        className={cn(
          "text-[10px] font-black text-center",
          index === 0
            ? "text-emerald-400"
            : index === 1
              ? "text-gray-400"
              : index === 2
                ? "text-amber-600"
                : "text-white/25",
        )}
      >
        {item.posicao ?? index + 1}
      </span>

      {/* logo + nome */}
      <div className="flex items-center gap-1.5 min-w-0">
        {item.logo_url ? (
          <img
            src={item.logo_url}
            className="w-5 h-5 rounded-md object-contain flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-[7px] font-black text-white/40">
              {item.nome?.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <span
          className={cn(
            "text-xs font-bold truncate",
            index === 0 ? "text-white" : "text-white/60",
          )}
        >
          {item.nome}
        </span>
      </div>

      {/* pontos */}
      <span
        className={cn(
          "text-xs font-black text-center tabular-nums",
          index === 0 ? "text-cyan-400" : "text-white/70",
        )}
      >
        {item.pontos}
      </span>

      {/* jogos */}
      <span className="text-[10px] font-bold text-center text-white/30 tabular-nums">
        {item.jogos}
      </span>

      {/* saldo */}
      <span
        className={cn(
          "text-[10px] font-bold text-center tabular-nums",
          (item.saldo_gols ?? 0) > 0
            ? "text-emerald-400/70"
            : (item.saldo_gols ?? 0) < 0
              ? "text-red-400/70"
              : "text-white/25",
        )}
      >
        {(item.saldo_gols ?? 0) > 0
          ? `+${item.saldo_gols}`
          : (item.saldo_gols ?? 0)}
      </span>
    </div>
  );
});

const ActiveCampCard = React.memo(function ActiveCampCard({
  camp,
  delay = 0,
}: ActiveCampCardProps) {
  const { data: tabela, isLoading } = useQuery({
    queryKey: ["campeonato", camp.id, "classificacao-dash"],
    queryFn: async () =>
      (await api.get(`/campeonatos/${camp.id}/classificacao`)).data,
    staleTime: 1000 * 60 * 5,
  });

  const top5 = Array.isArray(tabela) ? tabela.slice(0, 5) : [];

  return (
    <motion.div
      {...fadeUp(delay)}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
    >
      {/* header do camp */}
      <Link to={`/campeonatos/${camp.id}`}>
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors group">
          <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 border border-emerald-400/20 group-hover:scale-110 transition-transform">
            <Trophy size={15} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-white truncate">
              {camp.nome}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400/70">
                {camp.formato ?? "Em andamento"}
              </span>
            </div>
          </div>
          <ArrowRight
            size={13}
            className="flex-shrink-0 text-white/15 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </Link>

      {/* mini tabela */}
      {isLoading ? (
        <div className="p-3 space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-full rounded-lg" />
          ))}
        </div>
      ) : top5.length > 0 ? (
        <div className="p-2">
          {/* header colunas */}
          <div className="grid grid-cols-[1.5rem_1fr_2rem_2rem_2rem] gap-x-2 px-2 pb-1 mb-1 border-b border-white/[0.04]">
            <span className="text-[8px] font-black uppercase tracking-wider text-white/20 text-center">
              #
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-white/20">
              Time
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-white/20 text-center">
              P
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-white/20 text-center">
              J
            </span>
            <span className="text-[8px] font-black uppercase tracking-wider text-white/20 text-center">
              SG
            </span>
          </div>

          {top5.map((item: any, i: number) => (
            <ClassificacaoRow
              key={item.time_id ?? item.id ?? i}
              item={item}
              index={i}
            />
          ))}

          {/* link ver mais */}
          <Link to={`/campeonatos/${camp.id}`}>
            <div className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-white/[0.04] text-[9px] font-black uppercase tracking-wider text-white/20 hover:text-cyan-400 transition-colors">
              Ver tabela completa <ArrowRight size={9} />
            </div>
          </Link>
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-[10px] text-white/20">
            Tabela ainda não disponível
          </p>
        </div>
      )}
    </motion.div>
  );
});

export default ActiveCampCard;
