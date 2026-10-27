/**
 * FUTLENDAS DESIGN SYSTEM TOKENS
 * Direção de Arte: Futebol noturno, atmosfera cinematográfica competitiva e estética anime/mangá.
 * Cores principais: Preto/Grafite profundo, Rosa Neon (#ff007f) e Verde Neon (#00ff88).
 */

export const tokens = {
  colors: {
    // Fundos e Superfícies
    background: {
      primary: '#08080c',      // Preto profundo do estádio noturno
      elevated: '#121218',     // Grafite escuro para cards e superfícies
      card: '#161622',         // Card translúcido grafite
      cardOverlay: 'rgba(22, 22, 34, 0.85)',
      cardHover: '#1c1c2b',
    },

    // Acentos Neon (Identidade Principal)
    neonPink: {
      default: '#ff007f',       // Rosa Neon Vibrante
      hover: '#ff2692',
      active: '#d9006c',
      glow: 'rgba(255, 0, 127, 0.45)',
      dim: 'rgba(255, 0, 127, 0.12)',
      border: 'rgba(255, 0, 127, 0.5)',
    },

    neonGreen: {
      default: '#00ff88',       // Verde Neon Gramado Elétrico
      hover: '#26ff9d',
      active: '#00cc6d',
      glow: 'rgba(0, 255, 136, 0.45)',
      dim: 'rgba(0, 255, 136, 0.12)',
      border: 'rgba(0, 255, 136, 0.5)',
    },

    // Ouro Campeão / Troféu
    gold: {
      default: '#facc15',
      glow: 'rgba(250, 204, 21, 0.4)',
      dim: 'rgba(250, 204, 21, 0.12)',
    },

    // Textos e Tipografia
    text: {
      primary: '#ffffff',       // Branco puro para destaque e legibilidade
      secondary: '#e2e8f0',     // Cinza muito claro (slate-200)
      muted: '#94a3b8',         // Cinza auxiliar metálico (slate-400)
      placeholder: '#64748b',   // Cinza escuro (slate-500)
      inverse: '#08080c',
    },

    // Bordas
    border: {
      subtle: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.15)',
      highlightPink: 'rgba(255, 0, 127, 0.5)',
      highlightGreen: 'rgba(0, 255, 136, 0.5)',
    },

    // Estados e Feedback
    status: {
      error: '#ff3366',
      errorGlow: 'rgba(255, 51, 102, 0.35)',
      warning: '#facc15',
      success: '#00ff88',
      info: '#38bdf8',
    },
  },

  typography: {
    fonts: {
      display: '"Oswald", "Montserrat", sans-serif',
      body: '"Roboto", system-ui, -apple-system, sans-serif',
      heading: '"Montserrat", "Oswald", sans-serif',
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
  },

  shadows: {
    glowPink: '0 0 20px rgba(255, 0, 127, 0.4), 0 0 40px rgba(255, 0, 127, 0.15)',
    glowGreen: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.15)',
    glowGold: '0 0 20px rgba(250, 204, 21, 0.35), 0 0 35px rgba(250, 204, 21, 0.1)',
    card: '0 8px 32px 0 rgba(0, 0, 0, 0.65)',
    cardHover: '0 12px 40px 0 rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 0, 127, 0.2)',
  },

  radii: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },

  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type DesignTokens = typeof tokens;
