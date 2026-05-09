// Arquivo: src/features/dashboard/components/dashboardConstants.ts

// ─── helpers de animação ──────────────────────────────────────────────────────
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1], delay },
});

// Mapa de cores concretas (evita purge do Tailwind JIT em strings dinâmicas)
export const ACCENT = {
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/25",
  },
  emerald: {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/25",
  },
  violet: {
    text: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/25",
  },
  amber: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/25",
  },
  orange: {
    text: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/25",
  },
} as const;

export type AccentKey = keyof typeof ACCENT;

export const FASES_ATIVAS = [
  "em_andamento",
  "fase_de_pontos",
  "fase_de_grupos",
  "grupos",
  "mata_mata",
  "inscricao",
];
