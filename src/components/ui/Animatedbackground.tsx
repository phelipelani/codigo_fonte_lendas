// Arquivo: src/components/ui/AnimatedBackground.tsx
// OTIMIZADO: CSS animations ao invés de Framer Motion
// Remove partículas com Math.random() que causavam re-renders
// Reduz elementos animados de 11 para 4 no mobile

interface AnimatedBackgroundProps {
  variant?: 'default' | 'auth' | 'dark';
  showWaves?: boolean;
  showCircles?: boolean;
  showTriangles?: boolean;
  showRadar?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function AnimatedBackground({
  intensity = 'medium',
  showWaves = true,
  showCircles = true,
  showTriangles = true,
  showRadar = false,
}: AnimatedBackgroundProps) {

  const opacityMap = { low: 0.3, medium: 0.5, high: 0.7 };
  const o = opacityMap[intensity];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Base gradient — CSS puro, zero JS */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f35] to-[#0a1628]" />

      {/* Ondas — CSS keyframes, não Framer Motion */}
      {showWaves && (
        <>
          <div className="animated-bg-wave wave1" style={{ opacity: o * 0.6 }}>
            <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#0891b2" stopOpacity="0.3" />
                  <stop offset="50%"  stopColor="#06b6d4" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <path fill="url(#wg1)" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,149.3C672,149,768,203,864,208C960,213,1056,171,1152,144C1248,117,1344,107,1392,101.3L1440,96L1440,320L0,320Z"/>
            </svg>
          </div>
          <div className="animated-bg-wave wave2" style={{ opacity: o * 0.35 }}>
            <svg viewBox="0 0 1440 320" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#14b8a6" stopOpacity="0.2" />
                  <stop offset="50%"  stopColor="#2dd4bf" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path fill="url(#wg2)" d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L0,320Z"/>
            </svg>
          </div>
        </>
      )}

      {/* Círculos glow — só 2, CSS animation */}
      {showCircles && (
        <>
          <div className="animated-bg-orb orb1" style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.13) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}/>
          <div className="animated-bg-orb orb2" style={{
            background: 'radial-gradient(circle, rgba(20,184,166,0.10) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}/>
        </>
      )}

      {/* Triângulos — só 2, mobile recebe `reduced` via CSS media query */}
      {showTriangles && (
        <>
          <div className="animated-bg-tri tri1"/>
          <div className="animated-bg-tri tri2"/>
        </>
      )}

      {/* Vinheta — estático, zero custo */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(10,22,40,0.5) 100%)' }}/>

      <style>{`
        /* ── WAVES ─────────────────────────────────────────── */
        .animated-bg-wave {
          position: absolute;
          width: 200%;
          height: 600px;
          left: -50%;
          will-change: transform;
        }
        .wave1 {
          top: -300px;
          animation: waveMove1 20s ease-in-out infinite;
        }
        .wave2 {
          top: 20%;
          height: 500px;
          animation: waveMove2 15s ease-in-out infinite 2s;
        }
        @keyframes waveMove1 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(100px, 30px); }
        }
        @keyframes waveMove2 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(-80px, 20px); }
        }

        /* ── ORBS ──────────────────────────────────────────── */
        .animated-bg-orb {
          position: absolute;
          border-radius: 50%;
          will-change: transform, opacity;
        }
        .orb1 {
          width: 400px; height: 400px;
          top: -80px; right: -80px;
          animation: orbFloat1 12s ease-in-out infinite;
        }
        .orb2 {
          width: 500px; height: 500px;
          bottom: -120px; left: -120px;
          animation: orbFloat2 15s ease-in-out infinite 3s;
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1);   opacity: 0.5; }
          50%       { transform: translate(30px, 20px) scale(1.2); opacity: 0.7; }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1);    opacity: 0.4; }
          50%       { transform: translate(-20px, -30px) scale(1.15); opacity: 0.55; }
        }

        /* ── TRIÂNGULOS ────────────────────────────────────── */
        .animated-bg-tri {
          position: absolute;
          width: 0; height: 0;
          filter: blur(1px);
          will-change: transform, opacity;
        }
        .tri1 {
          top: 15%; left: 10%;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-bottom: 52px solid rgba(6,182,212,0.15);
          animation: triFloat1 8s ease-in-out infinite;
        }
        .tri2 {
          bottom: 25%; right: 15%;
          border-left: 25px solid transparent;
          border-right: 25px solid transparent;
          border-bottom: 43px solid rgba(20,184,166,0.12);
          animation: triFloat2 10s ease-in-out infinite 2s;
        }
        @keyframes triFloat1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg);   opacity: 0.4; }
          50%       { transform: translate(0, -30px) rotate(15deg); opacity: 0.7; }
        }
        @keyframes triFloat2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg);   opacity: 0.3; }
          50%       { transform: translate(0, 25px) rotate(-20deg); opacity: 0.6; }
        }

        /* ── MOBILE: reduz animações pesadas ───────────────── */
        @media (max-width: 1023px) {
          .wave2        { display: none; }
          .orb2         { display: none; }
          .tri1, .tri2  { display: none; }
          .orb1         { width: 250px; height: 250px; }
        }

        /* ── PREFERS REDUCED MOTION ────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .animated-bg-wave,
          .animated-bg-orb,
          .animated-bg-tri { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AnimatedBackground;