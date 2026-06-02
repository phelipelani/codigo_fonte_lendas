// Arquivo: tailwind.config.cjs — FIFA/EA Sports Game UI Design System
/* eslint-env node */
const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Rajdhani', 'Roboto', ...defaultTheme.fontFamily.sans],
        display: ['Barlow Condensed', 'Oswald', ...defaultTheme.fontFamily.sans],
        game: ['Barlow Condensed', ...defaultTheme.fontFamily.sans],
        hud: ['Rajdhani', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // === CORES BASE ===
        background: '#040810',
        surface: 'rgba(6, 16, 30, 0.92)',
        surfaceElevated: 'rgba(10, 24, 46, 0.96)',
        surfaceHover: 'rgba(15, 34, 62, 0.96)',
        border: 'rgba(0, 195, 255, 0.12)',
        borderLight: 'rgba(0, 195, 255, 0.30)',
        borderGold: 'rgba(255, 215, 0, 0.35)',
        borderGreen: 'rgba(0, 230, 118, 0.30)',

        // === TEXTOS ===
        textPrimary: '#F0F8FF',
        textSecondary: '#B8D4FF',
        textMuted: 'rgba(184, 212, 255, 0.55)',
        textGold: '#FFD700',
        textGame: '#00C3FF',

        // === ACENTOS ===
        accentPrimary: '#00C3FF',
        accentSecondary: '#FFD700',
        accentGold: '#FFD700',
        accentGreen: '#00E676',
        accentPink: '#FF2D78',
        accentPurple: '#7B2FFF',
        accentOrange: '#FF6B00',
        accentRed: '#FF1744',
        accentTransparent: 'rgba(0, 195, 255, 0.7)',

        // === ESTADOS ===
        success: '#00E676',
        successDark: '#00B956',
        danger: '#FF1744',
        dangerDark: '#D50000',
        warning: '#FFD700',
        info: '#00C3FF',

        // === TRANSPARENTES ===
        'accent-orange-transparent': 'rgba(255, 107, 0, 0.15)',
        'accent-blue-transparent': 'rgba(0, 195, 255, 0.12)',
        'accent-cyan-transparent': 'rgba(0, 195, 255, 0.10)',
        'accent-pink-transparent': 'rgba(255, 45, 120, 0.12)',
        'accent-gold-transparent': 'rgba(255, 215, 0, 0.12)',
        'accent-green-transparent': 'rgba(0, 230, 118, 0.10)',
      },

      backgroundImage: {
        'gradient-game': 'linear-gradient(135deg, #00C3FF 0%, #0070E0 100%)',
        'gradient-hero': 'linear-gradient(135deg, #00C3FF 0%, #7B2FFF 100%)',
        'gradient-gold': 'linear-gradient(135deg, #FFD700 0%, #FF6B00 100%)',
        'gradient-success': 'linear-gradient(135deg, #00E676 0%, #00B956 100%)',
        'gradient-danger': 'linear-gradient(135deg, #FF1744 0%, #D50000 100%)',
        'gradient-pink': 'linear-gradient(135deg, #FF2D78 0%, #7B2FFF 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #00C3FF 0%, #0080FF 100%)',
        'gradient-chrome': 'linear-gradient(135deg, #E8E8E8 0%, #A0A8B0 30%, #FFFFFF 50%, #8090A0 70%, #E8E8E8 100%)',
        'gradient-surface': 'linear-gradient(135deg, rgba(6,16,30,0.92) 0%, rgba(10,24,46,0.96) 100%)',
        'gradient-dark': 'linear-gradient(180deg, #040810 0%, #060E1E 60%, #040A12 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-radial-at-t': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-radial-at-b': 'radial-gradient(ellipse at bottom, var(--tw-gradient-stops))',
        'gradient-radial-at-c': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'body-gradient': `
          radial-gradient(ellipse at 15% 0%, rgba(0,195,255,0.14), transparent 50%),
          radial-gradient(ellipse at 85% 0%, rgba(255,107,0,0.10), transparent 50%),
          radial-gradient(ellipse at 50% 100%, rgba(0,180,80,0.08), transparent 55%),
          linear-gradient(180deg, #040810 0%, #060E1E 60%, #040A12 100%)
        `,
      },

      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0,195,255,0.45), 0 0 40px rgba(0,195,255,0.18)',
        'glow-electric': '0 0 20px rgba(0,195,255,0.6), 0 0 50px rgba(0,195,255,0.25), 0 0 100px rgba(0,195,255,0.08)',
        'glow-gold': '0 0 15px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)',
        'glow-green': '0 0 15px rgba(0,230,118,0.5), 0 0 40px rgba(0,230,118,0.2)',
        'glow-pink': '0 0 15px rgba(255,45,120,0.5), 0 0 40px rgba(255,45,120,0.2)',
        'glow-purple': '0 0 15px rgba(123,47,255,0.5), 0 0 40px rgba(123,47,255,0.2)',
        'glow-success': '0 0 15px rgba(0,230,118,0.5), 0 0 40px rgba(0,230,118,0.2)',
        'card': '0 4px 20px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,195,255,0.12)',
        'card-game': '0 0 0 1px rgba(0,195,255,0.15), 0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(0,195,255,0.25) inset',
        'card-gold': '0 0 0 1px rgba(255,215,0,0.2), 0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,215,0,0.25) inset',
        'btn-game': '0 4px 16px rgba(0,195,255,0.35), 0 2px 4px rgba(0,0,0,0.3)',
        'btn-gold': '0 4px 16px rgba(255,215,0,0.35), 0 2px 4px rgba(0,0,0,0.3)',
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0,195,255,0.4)' },
          '50%': { boxShadow: '0 0 35px rgba(0,195,255,0.7), 0 0 60px rgba(0,195,255,0.3)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glitch': {
          '0%, 85%, 100%': { transform: 'translate(0)', filter: 'none' },
          '87%': { transform: 'translate(-4px, 1px)', filter: 'hue-rotate(90deg) brightness(1.3)' },
          '89%': { transform: 'translate(4px, -1px)', filter: 'hue-rotate(-90deg) brightness(1.3)' },
          '91%': { transform: 'translate(-2px, 0)', filter: 'brightness(1.5)' },
          '93%': { transform: 'translate(2px, 1px)', filter: 'none' },
        },
        'power-on': {
          '0%': { opacity: '0', filter: 'brightness(3) blur(6px) saturate(0)' },
          '15%': { opacity: '0.7', filter: 'brightness(2) blur(3px) saturate(0.3)' },
          '40%': { opacity: '0.9', filter: 'brightness(1.5) blur(1px) saturate(0.7)' },
          '100%': { opacity: '1', filter: 'brightness(1) blur(0px) saturate(1)' },
        },
        'spotlight-l': {
          '0%, 100%': { transform: 'rotate(-12deg)', opacity: '0.5' },
          '50%': { transform: 'rotate(-20deg)', opacity: '0.75' },
        },
        'spotlight-r': {
          '0%, 100%': { transform: 'rotate(12deg)', opacity: '0.4' },
          '50%': { transform: 'rotate(20deg)', opacity: '0.65' },
        },
        'orb-blue': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-35px, 30px) scale(1.2)' },
        },
        'orb-gold': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(28px, -22px) scale(1.15)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100vh)', opacity: '0' },
          '5%': { opacity: '1' },
          '95%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'nav-select': {
          '0%': { transform: 'scaleX(0)', opacity: '0' },
          '100%': { transform: 'scaleX(1)', opacity: '1' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glitch': 'glitch 7s ease-in-out infinite',
        'power-on': 'power-on 1.4s ease-out forwards',
        'spotlight-l': 'spotlight-l 10s ease-in-out infinite',
        'spotlight-r': 'spotlight-r 12s ease-in-out infinite 2s',
        'orb-blue': 'orb-blue 14s ease-in-out infinite',
        'orb-gold': 'orb-gold 18s ease-in-out infinite 4s',
        'scan': 'scan 12s linear infinite',
        'border-flow': 'border-flow 3s linear infinite',
      },

      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
