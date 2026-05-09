// Arquivo: tailwind.config.cjs
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
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans],
        display: ['Oswald', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // === CORES BASE ===
        background: '#030611',
        surface: 'rgba(8, 20, 33, 0.85)',
        surfaceElevated: 'rgba(15, 30, 45, 0.95)', // Novo: para cards em destaque
        surfaceHover: 'rgba(20, 35, 50, 0.9)',     // Novo: hover em cards
        border: 'rgba(19, 38, 58, 0.7)',
        borderLight: 'rgba(56, 189, 248, 0.2)',    // Novo: bordas com accent
        
        // === TEXTOS ===
        textPrimary: '#f8fafc',
        textSecondary: '#ecf3ff',
        textMuted: 'rgba(203, 213, 245, 0.8)',
        
        // === ACENTOS ===
        accentPrimary: '#38bdf8',      // Azul cyan vibrante
        accentSecondary: '#facc15',    // Amarelo ouro
        accentPink: '#ec4899',         // Novo: Rosa vibrante
        accentPurple: '#8b5cf6',       // Novo: Roxo
        accentOrange: '#f97316',       // Novo: Laranja
        accentTransparent: 'rgba(56, 189, 248, 0.7)',
        
        // === ESTADOS ===
        success: '#10b981',
        successDark: '#059669',        // Novo: verde escuro
        danger: '#ef4444',
        dangerDark: '#dc2626',         // Novo: vermelho escuro
        warning: '#facc15',
        info: '#38bdf8',
        
        // === TRANSPARENTES (para overlays e efeitos) ===
        'accent-orange-transparent': 'rgba(249, 115, 22, 0.18)',
        'accent-blue-transparent': 'rgba(59, 130, 246, 0.22)',
        'accent-cyan-transparent': 'rgba(56, 189, 248, 0.15)',
        'accent-pink-transparent': 'rgba(236, 72, 153, 0.15)',
      },
      
      // === GRADIENTES ===
      backgroundImage: {
        // Gradientes principais
        'gradient-hero': 'linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%)',       // Azul-Roxo
        'gradient-gold': 'linear-gradient(135deg, #facc15 0%, #f97316 100%)',       // Amarelo-Laranja
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',    // Verde
        'gradient-danger': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',     // Vermelho
        'gradient-pink': 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',       // Rosa-Roxo
        'gradient-cyan': 'linear-gradient(135deg, #06b6d4 0%, #38bdf8 100%)',       // Cyan claro-escuro
        
        // Gradientes para fundos (mais suaves)
        'gradient-surface': 'linear-gradient(135deg, rgba(8, 20, 33, 0.85) 0%, rgba(15, 30, 45, 0.95) 100%)',
        'gradient-dark': 'linear-gradient(135deg, #030611 0%, #071626 45%, #032116 100%)',
        
        // Gradientes radiais (para efeitos de luz)
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-radial-at-t': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-radial-at-b': 'radial-gradient(ellipse at bottom, var(--tw-gradient-stops))',
        'gradient-radial-at-c': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        
        // Gradiente específico para o fundo do body (mantendo o original)
        'body-gradient': `
          radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.22), transparent 55%),
          radial-gradient(circle at 85% 10%, rgba(249, 115, 22, 0.18), transparent 52%),
          linear-gradient(135deg, #030611 0%, #071626 45%, #032116 100%)
        `,
      },
      
      // === SOMBRAS (com efeito glow) ===
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(56, 189, 248, 0.3), 0 0 40px rgba(56, 189, 248, 0.1)',
        'glow-gold': '0 0 20px rgba(250, 204, 21, 0.3), 0 0 40px rgba(250, 204, 21, 0.1)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.1)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 30px rgba(56, 189, 248, 0.2)',
      },
      
      // === BORDAS ===
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      
      // === ANIMAÇÕES ===
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(56, 189, 248, 0.6)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      
      // === TRANSIÇÕES ===
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
