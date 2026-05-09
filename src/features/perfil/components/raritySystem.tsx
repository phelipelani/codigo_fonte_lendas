import React from "react";

// ─── SISTEMA DE OVERALL ──────────────────────────────────────────────────────
/**
 * Overall 0-99 multidimensional com 6 pilares:
 *
 * 1. ATAQUE     — gols/jogo (peso 28%)
 * 2. CRIAÇÃO    — assists/jogo (peso 18%)
 * 3. VITÓRIAS   — aproveitamento % (peso 20%)
 * 4. EXPERIÊNCIA— log(jogos+1) normalizado até 10 jogos = max (peso 10%)
 * 5. CONQUISTAS — títulos + premiações de campeonato (peso 14%)
 * 6. CONSISTÊNCIA— mvps de rodada / jogos (peso 10%)
 *
 * Cada pilar é normalizado 0-100, depois ponderado.
 * O resultado final é mapeado de 0-100 → 50-99 para evitar extremos.
 */
export const calcOverall = (stats: any): { overall: number; pilares: Record<string, number> } => {
  if (!stats) return { overall: 50, pilares: {} };

  const t = stats.totais || {};
  const d = stats.desempenho || {};
  const premios = stats.premios || [];
  const titulos = stats.titulos || [];
  const mvpsSemanais = stats.mvpsSemanais || 0;

  const jogos = Math.max(t.jogos || 0, 1);

  // ── Pilar 1: Ataque (gols/jogo) ─────────────────────────────
  // Referência: 1.5 gols/jogo = 100 pts
  const mediaGols = (t.gols || 0) / jogos;
  const ataque = Math.min((mediaGols / 1.5) * 100, 100);

  // ── Pilar 2: Criação (assists/jogo) ─────────────────────────
  // Referência: 1.2 assists/jogo = 100 pts
  const mediaAssists = (t.assists || 0) / jogos;
  const criacao = Math.min((mediaAssists / 1.2) * 100, 100);

  // ── Pilar 3: Vitórias (aproveitamento) ──────────────────────
  // (vitorias*3 + empates) / (jogos*3) * 100
  const aproveitamento = ((d.vitorias || 0) * 3 + (d.empates || 0)) / (jogos * 3) * 100;
  const vitorias = Math.min(aproveitamento, 100);

  // ── Pilar 4: Experiência (log scale) ────────────────────────
  // log(jogos+1) / log(51) = 50 jogos pra chegar a 100
  const experiencia = Math.min((Math.log(jogos + 1) / Math.log(51)) * 100, 100);

  // ── Pilar 5: Conquistas ──────────────────────────────────────
  // Cada título vale 25pts, cada prêmio de campeonato vale 8pts, cap 100
  const qtdTitulos = titulos.length;
  const premiosCamp = premios.filter((p: any) => p.origem === 'campeonato').length;
  const conquistas = Math.min(qtdTitulos * 25 + premiosCamp * 8, 100);

  // ── Pilar 6: Consistência (mvp rodada / jogos) ───────────────
  // Referência: ganhar mvp em 40% dos jogos = 100 pts
  const rateMvp = mvpsSemanais / jogos;
  const consistencia = Math.min((rateMvp / 0.4) * 100, 100);

  // ── Ponderação ───────────────────────────────────────────────
  const pesos = {
    ataque:       0.28,
    criacao:      0.18,
    vitorias:     0.20,
    experiencia:  0.10,
    conquistas:   0.14,
    consistencia: 0.10,
  };

  const raw =
    ataque       * pesos.ataque +
    criacao      * pesos.criacao +
    vitorias     * pesos.vitorias +
    experiencia  * pesos.experiencia +
    conquistas   * pesos.conquistas +
    consistencia * pesos.consistencia;

  // Mapeia 0-100 → 50-99
  const overall = Math.round(50 + (raw / 100) * 49);

  return {
    overall,
    pilares: {
      ataque:       Math.round(ataque),
      criacao:      Math.round(criacao),
      vitorias:     Math.round(vitorias),
      experiencia:  Math.round(experiencia),
      conquistas:   Math.round(conquistas),
      consistencia: Math.round(consistencia),
    }
  };
};

// ─── TIERS DE RARIDADE ────────────────────────────────────────────────────────
/**
 * BRONZE  50-64  — Jogador iniciante
 * PRATA   65-74  — Jogador regular
 * OURO    75-84  — Jogador experiente
 * ELITE   85-91  — Jogador de alto nível
 * LENDA   92-99  — Jogador lendário
 */
export type RarityTier = "BRONZE" | "PRATA" | "OURO" | "ELITE" | "LENDA";

export interface RarityData {
  name: RarityTier;
  tier: number;         // 1-5
  overall: number;
  pilares: Record<string, number>;
  // Visual
  cardBg: string;
  accentColor: string;
  accentRgb: string;
  glowColor: string;
  borderColor: string;
  textGradient: string;
  overlayBg: string;
  // Escudo
  shieldColors: { primary: string; secondary: string; accent: string; glow: string };
}

export const getRarity = (stats: any): RarityData => {
  const { overall, pilares } = calcOverall(stats);

  const base = {
    overall,
    pilares,
  };

  if (overall >= 92) return {
    ...base,
    name: "LENDA", tier: 5,
    cardBg: "linear-gradient(160deg, #08060A 0%, #150E20 30%, #0D0A00 70%, #08060A 100%)",
    accentColor: "#FFD700",
    accentRgb: "255,215,0",
    glowColor: "rgba(255,215,0,0.5)",
    borderColor: "rgba(255,215,0,0.55)",
    textGradient: "from-yellow-100 via-amber-300 to-yellow-200",
    overlayBg: "linear-gradient(135deg, rgba(255,215,0,0.14) 0%, transparent 55%, rgba(255,180,0,0.09) 100%)",
    shieldColors: {
      primary: "#1A1200",
      secondary: "#3D2E00",
      accent: "#FFD700",
      glow: "rgba(255,215,0,0.7)",
    },
  };

  if (overall >= 85) return {
    ...base,
    name: "ELITE", tier: 4,
    cardBg: "linear-gradient(160deg, #0A0514 0%, #1C0A30 35%, #0F061A 100%)",
    accentColor: "#C084FC",
    accentRgb: "192,132,252",
    glowColor: "rgba(192,132,252,0.45)",
    borderColor: "rgba(168,85,247,0.55)",
    textGradient: "from-purple-100 via-fuchsia-300 to-violet-200",
    overlayBg: "linear-gradient(135deg, rgba(168,85,247,0.16) 0%, transparent 55%, rgba(236,72,153,0.1) 100%)",
    shieldColors: {
      primary: "#0D0520",
      secondary: "#2D1060",
      accent: "#C084FC",
      glow: "rgba(192,132,252,0.7)",
    },
  };

  if (overall >= 75) return {
    ...base,
    name: "OURO", tier: 3,
    cardBg: "linear-gradient(160deg, #0C0900 0%, #1C1500 40%, #0C0900 100%)",
    accentColor: "#FBBF24",
    accentRgb: "251,191,36",
    glowColor: "rgba(251,191,36,0.38)",
    borderColor: "rgba(251,191,36,0.48)",
    textGradient: "from-amber-200 via-yellow-400 to-amber-300",
    overlayBg: "linear-gradient(135deg, rgba(251,191,36,0.14) 0%, transparent 55%, rgba(245,158,11,0.09) 100%)",
    shieldColors: {
      primary: "#150F00",
      secondary: "#3A2800",
      accent: "#FBBF24",
      glow: "rgba(251,191,36,0.7)",
    },
  };

  if (overall >= 65) return {
    ...base,
    name: "PRATA", tier: 2,
    cardBg: "linear-gradient(160deg, #080C12 0%, #121C28 40%, #080C12 100%)",
    accentColor: "#94A3B8",
    accentRgb: "148,163,184",
    glowColor: "rgba(148,163,184,0.28)",
    borderColor: "rgba(148,163,184,0.38)",
    textGradient: "from-slate-100 via-gray-300 to-slate-200",
    overlayBg: "linear-gradient(135deg, rgba(148,163,184,0.10) 0%, transparent 55%)",
    shieldColors: {
      primary: "#0C1018",
      secondary: "#1E2A38",
      accent: "#94A3B8",
      glow: "rgba(148,163,184,0.6)",
    },
  };

  return {
    ...base,
    name: "BRONZE", tier: 1,
    cardBg: "linear-gradient(160deg, #0E0700 0%, #1C0F04 40%, #0E0700 100%)",
    accentColor: "#CD7F32",
    accentRgb: "205,127,50",
    glowColor: "rgba(205,127,50,0.28)",
    borderColor: "rgba(205,127,50,0.38)",
    textGradient: "from-orange-200 via-amber-400 to-orange-300",
    overlayBg: "linear-gradient(135deg, rgba(180,83,9,0.12) 0%, transparent 55%)",
    shieldColors: {
      primary: "#120800",
      secondary: "#301500",
      accent: "#CD7F32",
      glow: "rgba(205,127,50,0.6)",
    },
  };
};

// ─── ESCUDO SVG ───────────────────────────────────────────────────────────────
interface ShieldProps {
  rarity: RarityData;
  size?: number;
  showOverall?: boolean;
  className?: string;
}

export const RarityShield = ({ rarity, size = 80, showOverall = true, className = "" }: ShieldProps) => {
  const sc = rarity.shieldColors;
  const isLenda = rarity.tier === 5;
  const isElite = rarity.tier === 4;

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size * 1.15 }}>
      {/* Glow atrás */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-60"
        style={{ background: sc.glow, transform: "scale(0.7) translateY(10%)" }}
      />

      <svg
        viewBox="0 0 100 115"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", filter: `drop-shadow(0 0 ${size * 0.08}px ${sc.glow})` }}
      >
        <defs>
          <linearGradient id={`bg-${rarity.tier}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sc.secondary} />
            <stop offset="100%" stopColor={sc.primary} />
          </linearGradient>
          <linearGradient id={`shine-${rarity.tier}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
          <linearGradient id={`acc-${rarity.tier}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sc.accent} stopOpacity="1" />
            <stop offset="100%" stopColor={sc.accent} stopOpacity="0.6" />
          </linearGradient>
          {isLenda && (
            <radialGradient id="lenda-glow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="rgba(255,215,0,0.3)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </radialGradient>
          )}
        </defs>

        {/* Forma do escudo */}
        <path
          d="M50 4 L92 20 L92 58 Q92 88 50 112 Q8 88 8 58 L8 20 Z"
          fill={`url(#bg-${rarity.tier})`}
          stroke={sc.accent}
          strokeWidth="2.5"
          strokeOpacity="0.8"
        />

        {/* Brilho interno */}
        <path
          d="M50 4 L92 20 L92 58 Q92 88 50 112 Q8 88 8 58 L8 20 Z"
          fill={`url(#shine-${rarity.tier})`}
        />

        {/* Borda interna decorativa */}
        <path
          d="M50 11 L85 25 L85 58 Q85 83 50 104 Q15 83 15 58 L15 25 Z"
          fill="none"
          stroke={sc.accent}
          strokeWidth="1"
          strokeOpacity="0.3"
          strokeDasharray={isLenda ? "none" : "4 3"}
        />

        {/* Linha horizontal decorativa */}
        <line
          x1="20" y1="50" x2="80" y2="50"
          stroke={sc.accent}
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />

        {/* Divisória vertical */}
        <line
          x1="50" y1="16" x2="50" y2="44"
          stroke={sc.accent}
          strokeWidth="0.8"
          strokeOpacity="0.35"
        />

        {/* Glow lenda */}
        {isLenda && (
          <path
            d="M50 4 L92 20 L92 58 Q92 88 50 112 Q8 88 8 58 L8 20 Z"
            fill="url(#lenda-glow)"
          />
        )}

        {/* Ícone central por tier */}
        {rarity.tier === 5 && (
          /* Coroa - LENDA */
          <g transform="translate(29, 24) scale(0.85)">
            <path
              d="M4 22 L4 14 L10 20 L21 8 L32 20 L38 14 L38 22 Z"
              fill={`url(#acc-${rarity.tier})`}
              strokeWidth="0"
            />
            <rect x="4" y="22" width="34" height="5" rx="1.5" fill={`url(#acc-${rarity.tier})`} />
            <circle cx="4" cy="14" r="2.5" fill={sc.accent} />
            <circle cx="21" cy="8" r="2.5" fill={sc.accent} />
            <circle cx="38" cy="14" r="2.5" fill={sc.accent} />
          </g>
        )}

        {rarity.tier === 4 && (
          /* Diamante - ELITE */
          <g transform="translate(50, 32)">
            <polygon
              points="0,-18 14,-4 0,18 -14,-4"
              fill={`url(#acc-${rarity.tier})`}
              strokeWidth="0"
            />
            <polygon
              points="0,-12 8,-2 0,12 -8,-2"
              fill="none"
              stroke={sc.accent}
              strokeWidth="1"
              strokeOpacity="0.4"
            />
          </g>
        )}

        {rarity.tier === 3 && (
          /* Estrela - OURO */
          <g transform="translate(50, 33)">
            <polygon
              points="0,-17 5,-6 17,-6 8,3 11,16 0,8 -11,16 -8,3 -17,-6 -5,-6"
              fill={`url(#acc-${rarity.tier})`}
              strokeWidth="0"
            />
          </g>
        )}

        {rarity.tier === 2 && (
          /* Escudo duplo - PRATA */
          <g transform="translate(50, 32)">
            <path
              d="M0,-17 L13,-8 L13,6 Q13,16 0,22 Q-13,16 -13,6 L-13,-8 Z"
              fill="none"
              stroke={sc.accent}
              strokeWidth="2.5"
              strokeOpacity="0.8"
            />
            <path
              d="M0,-10 L8,-4 L8,5 Q8,11 0,15 Q-8,11 -8,5 L-8,-4 Z"
              fill={sc.accent}
              fillOpacity="0.5"
            />
          </g>
        )}

        {rarity.tier === 1 && (
          /* Relâmpago - BRONZE */
          <g transform="translate(50, 32)">
            <path
              d="M6,-17 L-4,1 L4,1 L-6,19 L16,-3 L7,-3 L16,-17 Z"
              fill={`url(#acc-${rarity.tier})`}
              strokeWidth="0"
            />
          </g>
        )}

        {/* Overall number */}
        {showOverall && (
          <text
            x="50"
            y="82"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="18"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            fill={sc.accent}
            letterSpacing="-0.5"
            style={{ filter: `drop-shadow(0 0 4px ${sc.glow})` }}
          >
            {rarity.overall}
          </text>
        )}

        {/* Nome da tier em baixo */}
        <text
          x="50"
          y="100"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7.5"
          fontWeight="800"
          fontFamily="system-ui, sans-serif"
          fill={sc.accent}
          letterSpacing="2"
          fillOpacity="0.9"
        >
          {rarity.name}
        </text>

        {/* Pontos decorativos nos cantos */}
        {[...Array(rarity.tier)].map((_, i) => (
          <circle
            key={i}
            cx={35 + i * 7.5}
            cy="108"
            r="2"
            fill={sc.accent}
            fillOpacity={0.3 + i * 0.15}
          />
        ))}
      </svg>
    </div>
  );
};

// ─── BARRA DE PILAR ───────────────────────────────────────────────────────────
export const PilarBar = ({
  label, value, accent, icon
}: { label: string; value: number; accent: string; icon: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm w-4 flex-shrink-0">{icon}</span>
    <span
      className="text-[9px] font-black uppercase tracking-wider w-16 flex-shrink-0"
      style={{ color: "rgba(255,255,255,0.4)" }}
    >
      {label}
    </span>
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${accent}80, ${accent})`,
          boxShadow: `0 0 6px ${accent}50`,
        }}
      />
    </div>
    <span className="text-[10px] font-black w-7 text-right flex-shrink-0" style={{ color: accent }}>
      {value}
    </span>
  </div>
);