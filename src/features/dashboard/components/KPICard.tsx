// Arquivo: src/features/dashboard/components/KPICard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, ACCENT, type AccentKey } from "./dashboardConstants";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: any;
  color: AccentKey;
  delay?: number;
  suffix?: string;
  to?: string; // Link de navegação quando clicado
}

const KPICard = React.memo(function KPICard({
  title,
  value,
  icon: Icon,
  color,
  delay = 0,
  suffix = "",
  to,
}: KPICardProps) {
  const navigate = useNavigate();
  const a = ACCENT[color];
  return (
    <motion.div
      {...fadeUp(delay)}
      whileTap={to ? { scale: 0.95 } : undefined}
      onClick={to ? () => navigate(to) : undefined}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 group",
        to ? "cursor-pointer active:bg-white/[0.06]" : "cursor-default",
      )}
    >
      {/* barra acento topo */}
      <div className={cn("absolute top-0 inset-x-0 h-px opacity-60", a.bg)} />

      {/* ícone */}
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0",
          a.bg,
        )}
      >
        <Icon size={16} className={a.text} />
      </div>

      {/* valor + label */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-black text-white leading-none tabular-nums">
            {value}
          </span>
          {suffix && (
            <span className="text-xs font-bold text-white/25">{suffix}</span>
          )}
        </div>
        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/30">
          {title}
        </p>
      </div>

      {/* hover glow */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          a.bg,
        )}
        style={{ mixBlendMode: "soft-light" }}
      />
    </motion.div>
  );
});

export default KPICard;
