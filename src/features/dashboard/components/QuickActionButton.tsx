// Arquivo: src/features/dashboard/components/QuickActionButton.tsx
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ACCENT, type AccentKey } from "./dashboardConstants";

interface QuickActionButtonProps {
  to: string;
  icon: any;
  label: string;
  color: AccentKey;
}

const QuickActionButton = React.memo(function QuickActionButton({
  to,
  icon: Icon,
  label,
  color,
}: QuickActionButtonProps) {
  const a = ACCENT[color] ?? ACCENT.cyan;
  return (
    <Link to={to}>
      <motion.div
        whileTap={{ scale: 0.9 }}
        className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group"
      >
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            a.bg,
          )}
        >
          <Icon size={15} className={a.text} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-white/25 group-hover:text-white/60 transition-colors text-center leading-tight">
          {label}
        </span>
      </motion.div>
    </Link>
  );
});

export default QuickActionButton;
