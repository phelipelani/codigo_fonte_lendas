// Arquivo: src/components/shared/BottomNav.tsx
// Navegação inferior mobile estilo app nativo — substitui o hamburguer no mobile
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Ícones customizados
import icDashboard from '@/assets/icones/dashboard.webp';
import icCampeonatos from '@/assets/icones/campeonatos.webp';
import icCartolendas from '@/assets/icones/cartolendas.webp';
import icPartidas from '@/assets/icones/partidas.webp';
import icEstatisticas from '@/assets/icones/estatisticas.webp';

const NavIcon = ({ src, alt, size = 20 }: { src: string; alt: string; size?: number }) => (
  <img src={src} alt={alt} style={{ width: size, height: size }} className="object-contain" />
);

const tabs = [
  { to: '/', icon: icDashboard, label: 'Home', end: true },
  { to: '/campeonatos', icon: icCampeonatos, label: 'Camps' },
  { to: '/cartolendas', icon: icCartolendas, label: 'Cartola' },
  { to: '/partidas', icon: icPartidas, label: 'Partidas' },
  { to: '/analytics', icon: icEstatisticas, label: 'Stats' },
];

const BottomNav = React.memo(function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[1060] lg:hidden',
        'border-t border-white/[0.08]',
        'bg-[#0a1628]/95 backdrop-blur-xl',
        'safe-area-bottom',
      )}
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className="relative flex flex-col items-center justify-center flex-1 min-w-0 py-1 group"
            >
              {/* Indicador ativo (barra superior) */}
              {isActive && (
                <motion.div
                  layoutId="bottomnav-indicator"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              {/* Glow de fundo quando ativo */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-x-2 top-1 bottom-1 rounded-xl bg-cyan-400/[0.08]"
                />
              )}

              {/* Ícone */}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  'relative z-10 flex items-center justify-center w-7 h-7 mb-0.5 transition-all duration-200',
                  isActive ? 'scale-110' : 'opacity-50 group-active:scale-90',
                )}
              >
                <NavIcon src={tab.icon} alt={tab.label} size={isActive ? 22 : 20} />
              </motion.div>

              {/* Label */}
              <span
                className={cn(
                  'relative z-10 text-[9px] font-black uppercase tracking-wider transition-all duration-200 leading-none',
                  isActive
                    ? 'text-cyan-300'
                    : 'text-white/30 group-active:text-white/50',
                )}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>

      {/* Safe area para iPhone (home indicator) */}
      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
});

export default BottomNav;
