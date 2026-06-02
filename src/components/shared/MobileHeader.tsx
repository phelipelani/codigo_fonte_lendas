// Arquivo: src/components/shared/MobileHeader.tsx
// Header HUD de videogame — estilo FIFA/EA Sports
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Menu, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { NotificacoesSino } from '@/features/notificacoes/components/NotificacoesSino';
import logoLendas from '@/assets/Logo.webp';
import { cn } from '@/lib/utils';

const MobileHeader = React.memo(function MobileHeader() {
  const { user } = useAuth();
  const { setSidebarOpen } = useAppStore();
  const isAdmin = user?.role === 'admin';

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[1055] lg:hidden',
        'flex items-center justify-between h-14 px-3',
      )}
    >
      {/* Fundo com vidro escuro + borda inferior */}
      <div className="absolute inset-0 bg-[#040810]/95 backdrop-blur-xl" />
      {/* Linha inferior decorativa */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.4), rgba(255,215,0,0.25), transparent)' }}
      />

      {/* Lado esquerdo: hamburger + logo */}
      <div className="relative flex items-center gap-2.5 z-10">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => setSidebarOpen(true)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-xl',
            'bg-white/[0.04] border border-white/[0.08]',
            'active:bg-accentPrimary/10 active:border-accentPrimary/30',
            'transition-all duration-150',
          )}
          aria-label="Menu"
        >
          <Menu size={16} className="text-accentPrimary/70" />
        </motion.button>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'rgba(0,195,255,0.3)' }}
            />
            <img src={logoLendas} alt="FutLendas" className="relative h-7 w-auto" />
          </div>

          <div className="flex flex-col leading-none">
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 900,
                fontSize: '16px',
                letterSpacing: '0.06em',
                background: 'linear-gradient(135deg, #00C3FF 0%, #7B2FFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
              }}
            >
              FUTLENDAS
            </span>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '8px',
                fontWeight: 600,
                letterSpacing: '0.2em',
                color: 'rgba(0,195,255,0.5)',
                textTransform: 'uppercase',
              }}
            >
              ARENA
            </span>
          </div>
        </Link>
      </div>

      {/* Lado direito: notificações + perfil */}
      <div className="relative flex items-center gap-2 z-10">
        <NotificacoesSino />

        {/* Avatar do jogador */}
        <Link to="/perfil">
          <motion.div
            whileTap={{ scale: 0.88 }}
            className={cn(
              'relative flex items-center justify-center w-9 h-9 rounded-xl',
              'border transition-all duration-200',
              isAdmin
                ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border-yellow-500/40'
                : 'bg-accentPrimary/[0.06] border-accentPrimary/20',
            )}
          >
            {/* Ícone do jogador — iniciais ou ícone */}
            {user?.username ? (
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: '13px',
                  color: isAdmin ? '#FFD700' : '#00C3FF',
                  letterSpacing: '0',
                  textShadow: isAdmin
                    ? '0 0 8px rgba(255,215,0,0.5)'
                    : '0 0 8px rgba(0,195,255,0.5)',
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Zap size={14} className={isAdmin ? 'text-yellow-400' : 'text-accentPrimary/70'} />
            )}

            {/* Badge admin */}
            {isAdmin && (
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full
                bg-gradient-to-br from-yellow-400 to-amber-600 border border-[#040810]
                shadow-[0_0_6px_rgba(255,215,0,0.5)]">
                <Crown size={7} className="text-[#1a0800]" fill="currentColor" />
              </div>
            )}
          </motion.div>
        </Link>
      </div>
    </header>
  );
});

export default MobileHeader;
