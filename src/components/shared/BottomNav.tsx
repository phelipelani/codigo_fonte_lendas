// Arquivo: src/components/shared/BottomNav.tsx
// Navegação inferior — estilo HUD de videogame FIFA/EA Sports
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import icDashboard from '@/assets/icones/dashboard.webp';
import icCampeonatos from '@/assets/icones/campeonatos.webp';
import icCartolendas from '@/assets/icones/cartolendas.webp';
import icPartidas from '@/assets/icones/partidas.webp';
import icEstatisticas from '@/assets/icones/estatisticas.webp';

const tabs = [
  { to: '/', icon: icDashboard, label: 'HOME', end: true },
  { to: '/campeonatos', icon: icCampeonatos, label: 'CAMPS' },
  { to: '/cartolendas', icon: icCartolendas, label: 'CARTOLA' },
  { to: '/partidas', icon: icPartidas, label: 'PARTIDAS' },
  { to: '/analytics', icon: icEstatisticas, label: 'STATS' },
];

const BottomNav = React.memo(function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[1060] lg:hidden',
        'safe-area-bottom',
      )}
    >
      {/* Linha de acento no topo — gradiente FIFA */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px]"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.6), rgba(255,215,0,0.4), rgba(0,230,118,0.3), transparent)' }}
      />

      {/* Fundo com vidro escuro */}
      <div className="absolute inset-0 bg-[#040810]/96 backdrop-blur-2xl" />

      <div className="relative flex items-stretch justify-around h-[62px] max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className="relative flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 group"
            >
              {/* Fundo ativo com glow */}
              {isActive && (
                <motion.div
                  layoutId="bottomnav-bg"
                  className="absolute inset-x-1 top-1 bottom-1 rounded-xl"
                  style={{
                    background: 'linear-gradient(180deg, rgba(0,195,255,0.12) 0%, rgba(0,195,255,0.04) 100%)',
                    boxShadow: '0 0 16px rgba(0,195,255,0.2) inset',
                    border: '1px solid rgba(0,195,255,0.2)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}

              {/* Barra superior ativa */}
              {isActive && (
                <motion.div
                  layoutId="bottomnav-bar"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #00C3FF, transparent)',
                    boxShadow: '0 0 8px rgba(0,195,255,0.8)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}

              {/* Ícone */}
              <motion.div
                whileTap={{ scale: 0.82 }}
                className={cn(
                  'relative z-10 flex items-center justify-center w-7 h-7 transition-all duration-200',
                  isActive ? 'scale-110' : 'opacity-40 group-active:opacity-70',
                )}
              >
                <img
                  src={tab.icon}
                  alt={tab.label}
                  className="object-contain"
                  style={{
                    width: isActive ? 22 : 20,
                    height: isActive ? 22 : 20,
                    filter: isActive
                      ? 'drop-shadow(0 0 6px rgba(0,195,255,0.7)) brightness(1.2)'
                      : 'none',
                  }}
                />
              </motion.div>

              {/* Label — Barlow Condensed, game style */}
              <span
                className={cn(
                  'relative z-10 leading-none transition-all duration-200',
                  isActive
                    ? 'text-[#00C3FF]'
                    : 'text-white/25 group-active:text-white/45',
                )}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '8px',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  textShadow: isActive ? '0 0 10px rgba(0,195,255,0.6)' : 'none',
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>

      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </nav>
  );
});

export default BottomNav;
