// Arquivo: src/features/auth/routes/LoginPage.tsx
// Splash screen épica — estilo FIFA / EA Sports
import { motion } from 'framer-motion'
import { LoginForm } from '../components/LoginForm'
import logoLendas from '@/assets/Logo.webp'

export function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">

      {/* ── BACKGROUND: ESTÁDIO NOTURNO ───────────────────────────────── */}
      <div className="absolute inset-0">
        {/* Base */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, #020608 0%, #040C1A 50%, #030A0E 100%)'
        }} />

        {/* Scan lines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)'
        }} />

        {/* Spotlight esquerdo — azul elétrico */}
        <div className="absolute top-0 left-0 w-full h-[80%]" style={{
          background: 'linear-gradient(148deg, rgba(0,195,255,0.10) 0%, rgba(0,100,200,0.04) 25%, transparent 55%)',
          animation: 'loginSpotL 10s ease-in-out infinite',
        }} />

        {/* Spotlight direito — dourado */}
        <div className="absolute top-0 right-0 w-full h-[80%]" style={{
          background: 'linear-gradient(212deg, rgba(255,215,0,0.08) 0%, rgba(255,120,0,0.03) 25%, transparent 55%)',
          animation: 'loginSpotR 13s ease-in-out infinite 2s',
        }} />

        {/* Orb azul */}
        <div className="absolute top-[-100px] right-[-80px] w-[500px] h-[500px] rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(0,195,255,0.18) 0%, rgba(0,80,180,0.08) 40%, transparent 70%)',
          filter: 'blur(50px)',
          animation: 'orbLoginBlue 14s ease-in-out infinite',
        }} />

        {/* Orb dourado */}
        <div className="absolute bottom-[-80px] left-[-60px] w-[400px] h-[400px] rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.13) 0%, rgba(255,80,0,0.05) 40%, transparent 70%)',
          filter: 'blur(55px)',
          animation: 'orbLoginGold 18s ease-in-out infinite 5s',
        }} />

        {/* Grama do estádio na base */}
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 120%, rgba(0,200,80,0.16) 0%, rgba(0,150,50,0.05) 40%, transparent 65%)',
        }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,6,8,0.65) 100%)'
        }} />
      </div>

      {/* Número decorativo de jogador — fundo */}
      <div className="absolute bottom-8 right-6 pointer-events-none select-none hidden sm:block"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontStyle: 'italic',
          fontWeight: 900,
          fontSize: '200px',
          lineHeight: 1,
          color: 'rgba(0,195,255,0.03)',
          letterSpacing: '-0.02em',
        }}>
        10
      </div>

      {/* ── CARD PRINCIPAL ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        {/* Glow externo do card */}
        <div className="absolute -inset-2 rounded-3xl blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,195,255,0.12), rgba(123,47,255,0.08), transparent 70%)' }}
        />

        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden border"
          style={{
            background: 'rgba(4, 10, 22, 0.92)',
            backdropFilter: 'blur(24px)',
            borderColor: 'rgba(0,195,255,0.2)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,195,255,0.08)',
          }}
        >
          {/* Linha brilhante no topo — FIFA card style */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.9), rgba(255,215,0,0.6), rgba(0,195,255,0.9), transparent)' }}
          />

          <div className="px-8 pt-10 pb-8">
            {/* ── LOGO + TÍTULO ──────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col items-center gap-5 mb-8"
            >
              {/* Logo com glow pulsante */}
              <div className="relative">
                <motion.div
                  className="absolute inset-0 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.55, 0.3] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: 'rgba(0,195,255,0.35)' }}
                />
                {/* Anéis radar */}
                {[1, 2, 3].map((r) => (
                  <motion.div
                    key={r}
                    className="absolute rounded-full border"
                    style={{
                      width: `${62 + r * 26}px`,
                      height: `${62 + r * 26}px`,
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      borderColor: `rgba(0,195,255,${0.12 - r * 0.02})`,
                    }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.35, 0.15] }}
                    transition={{ duration: 2.5 + r * 0.6, repeat: Infinity, ease: 'easeInOut', delay: r * 0.4 }}
                  />
                ))}
                <img
                  src={logoLendas}
                  alt="FutLendas Logo"
                  className="relative w-24 h-24 object-contain"
                  style={{ filter: 'drop-shadow(0 0 18px rgba(0,195,255,0.5)) drop-shadow(0 0 40px rgba(0,195,255,0.2))' }}
                />
              </div>

              {/* Título com glitch */}
              <div className="text-center">
                <motion.h1
                  animate={{ opacity: [1, 1, 0.95, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: 'clamp(40px, 10vw, 56px)',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #00C3FF 40%, #0080FF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 20px rgba(0,195,255,0.4))',
                  }}
                >
                  FUTLENDAS
                </motion.h1>

                {/* Tagline — EA Sports style */}
                <p style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,195,255,0.5)',
                  marginTop: '6px',
                }}>
                  APENAS LENDAS ENTRAM AQUI
                </p>

                {/* Linha decorativa */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className="h-px flex-1 max-w-[50px]"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.4))' }} />
                  <div className="w-1 h-1 rounded-full" style={{ background: '#00C3FF', boxShadow: '0 0 6px rgba(0,195,255,0.8)' }} />
                  <div className="h-px flex-1 max-w-[50px]"
                    style={{ background: 'linear-gradient(90deg, rgba(0,195,255,0.4), transparent)' }} />
                </div>
              </div>
            </motion.div>

            {/* ── FORMULÁRIO ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.55, ease: 'easeOut' }}
            >
              <LoginForm />
            </motion.div>

            {/* ── FOOTER ──────────────────────────────────────────── */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="mt-6 text-center"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(184,212,255,0.2)',
              }}
            >
              ACESSO RESTRITO — SOMENTE CONVITE
            </motion.p>
          </div>

          {/* Linha brilhante na base */}
          <div className="absolute bottom-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.2), transparent)' }}
          />
        </div>
      </motion.div>

      {/* Decorações de canto */}
      <div className="absolute top-6 left-6 pointer-events-none select-none"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontStyle: 'italic',
          fontSize: '11px', letterSpacing: '0.25em',
          color: 'rgba(0,195,255,0.12)',
          textTransform: 'uppercase',
        }}>
        EA SPORTS FC
      </div>
      <div className="absolute bottom-6 right-6 pointer-events-none select-none"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 900, fontStyle: 'italic',
          fontSize: '11px', letterSpacing: '0.25em',
          color: 'rgba(255,215,0,0.10)',
          textTransform: 'uppercase',
        }}>
        TEMPORADA 2025
      </div>

      <style>{`
        @keyframes loginSpotL {
          0%, 100% { transform: rotate(0deg); opacity: 0.7; }
          50%       { transform: rotate(-5deg); opacity: 1; }
        }
        @keyframes loginSpotR {
          0%, 100% { transform: rotate(0deg); opacity: 0.6; }
          50%       { transform: rotate(5deg); opacity: 0.85; }
        }
        @keyframes orbLoginBlue {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(-30px, 25px) scale(1.18); }
        }
        @keyframes orbLoginGold {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(24px, -18px) scale(1.14); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
