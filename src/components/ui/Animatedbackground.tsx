// Arquivo: src/components/ui/AnimatedBackground.tsx
// Atmosfera de videogame estilo FIFA/EA Sports
// CSS puro — zero JS runtime, alto desempenho mobile

interface AnimatedBackgroundProps {
  variant?: 'default' | 'auth' | 'dark';
  showWaves?: boolean;      // reaproveitado: controla spotlights
  showCircles?: boolean;    // reaproveitado: controla orbs
  showTriangles?: boolean;  // ignorado (mantido por compatibilidade)
  showRadar?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function AnimatedBackground({
  intensity = 'medium',
  showWaves = true,
  showCircles = true,
}: AnimatedBackgroundProps) {
  const o = intensity === 'low' ? 0.5 : intensity === 'high' ? 1 : 0.75;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">

      {/* ── BASE: fundo escuro stadium night ─────────────────────────────── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, #040810 0%, #060E1E 55%, #040C16 80%, #030A10 100%)',
      }} />

      {/* ── SCAN LINES: textura CRT sutil (estático, zero re-paint) ──────── */}
      <div className="absolute inset-0 pointer-events-none game-scanlines" />

      {/* ── SPOTLIGHTS: feixes de luz de estádio ─────────────────────────── */}
      {showWaves && (
        <>
          <div className="game-spotlight-l" style={{ opacity: o * 0.6 }} />
          <div className="game-spotlight-r" style={{ opacity: o * 0.5 }} />
        </>
      )}

      {/* ── ORBS: efeito de luz ambiente ─────────────────────────────────── */}
      {showCircles && (
        <>
          {/* Azul elétrico — canto superior direito */}
          <div className="game-orb orb-electric" style={{ opacity: o * 0.9 }} />
          {/* Dourado FIFA — canto inferior esquerdo */}
          <div className="game-orb orb-gold" style={{ opacity: o * 0.7 }} />
          {/* Verde EA Sports — centro inferior (só desktop) */}
          <div className="game-orb orb-green hidden lg:block" style={{ opacity: o * 0.55 }} />
        </>
      )}

      {/* ── FIELD GLOW: grama de estádio na base ─────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 110%, rgba(0,200,80,0.14) 0%, rgba(0,180,60,0.06) 40%, transparent 70%)',
      }} />

      {/* ── VIGNETTE ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 35%, rgba(4,8,16,0.55) 100%)',
      }} />

      <style>{`
        /* ── SCAN LINES ─────────────────────────────────────── */
        .game-scanlines {
          background-image: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0, 0, 0, 0.04) 3px,
            rgba(0, 0, 0, 0.04) 4px
          );
          pointer-events: none;
        }

        /* ── SPOTLIGHTS ─────────────────────────────────────── */
        .game-spotlight-l,
        .game-spotlight-r {
          position: absolute;
          top: 0;
          width: 100%;
          height: 75%;
          pointer-events: none;
          will-change: transform, opacity;
        }
        .game-spotlight-l {
          background: linear-gradient(
            155deg,
            rgba(0, 195, 255, 0.09) 0%,
            rgba(0, 195, 255, 0.04) 25%,
            transparent 55%
          );
          animation: spotlightL 10s ease-in-out infinite;
        }
        .game-spotlight-r {
          background: linear-gradient(
            205deg,
            rgba(255, 215, 0, 0.07) 0%,
            rgba(255, 165, 0, 0.03) 25%,
            transparent 55%
          );
          animation: spotlightR 13s ease-in-out infinite 2s;
        }
        @keyframes spotlightL {
          0%, 100% { transform: rotate(0deg) scaleX(1);   opacity: 0.6; }
          50%       { transform: rotate(-6deg) scaleX(1.1); opacity: 0.85; }
        }
        @keyframes spotlightR {
          0%, 100% { transform: rotate(0deg) scaleX(1);   opacity: 0.5; }
          50%       { transform: rotate(6deg) scaleX(1.1); opacity: 0.7; }
        }

        /* ── ORBS ──────────────────────────────────────────── */
        .game-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          will-change: transform;
        }
        .orb-electric {
          width: 520px; height: 520px;
          top: -130px; right: -100px;
          background: radial-gradient(circle, rgba(0,195,255,0.18) 0%, rgba(0,100,255,0.08) 40%, transparent 70%);
          filter: blur(55px);
          animation: orbBlue 15s ease-in-out infinite;
        }
        .orb-gold {
          width: 420px; height: 420px;
          bottom: -100px; left: -80px;
          background: radial-gradient(circle, rgba(255,215,0,0.14) 0%, rgba(255,100,0,0.06) 40%, transparent 70%);
          filter: blur(60px);
          animation: orbGold 19s ease-in-out infinite 5s;
        }
        .orb-green {
          width: 380px; height: 380px;
          bottom: -60px; right: 25%;
          background: radial-gradient(circle, rgba(0,230,118,0.10) 0%, transparent 65%);
          filter: blur(65px);
          animation: orbGreen 17s ease-in-out infinite 9s;
        }
        @keyframes orbBlue {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-40px, 35px) scale(1.2); }
        }
        @keyframes orbGold {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(32px, -25px) scale(1.15); }
        }
        @keyframes orbGreen {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-22px, -28px) scale(1.12); }
        }

        /* ── MOBILE: reduz para performance ─────────────────── */
        @media (max-width: 1023px) {
          .game-spotlight-l, .game-spotlight-r { display: none; }
          .orb-electric { width: 280px; height: 280px; filter: blur(45px); }
          .orb-gold     { width: 220px; height: 220px; filter: blur(50px); }
        }

        /* ── REDUCED MOTION ─────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .game-spotlight-l,
          .game-spotlight-r,
          .game-orb { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AnimatedBackground;
