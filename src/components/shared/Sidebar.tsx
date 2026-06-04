// Arquivo: src/components/shared/Sidebar.tsx — Game Menu Sidebar

import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  ChevronLeft,
  User,
  Menu,
  X,
  Crown,
  ClipboardList,
  Images,
  Zap,
} from 'lucide-react';
import logoLendas from '@/assets/Logo.webp';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

import icDashboard from '@/assets/icones/dashboard.webp';
import icLigas from '@/assets/icones/ligas.webp';
import icCampeonatos from '@/assets/icones/campeonatos.webp';
import icCartolendas from '@/assets/icones/cartolendas.webp';
import icPartidas from '@/assets/icones/partidas.webp';
import icHallDaFama from '@/assets/icones/halldafama.webp';
import icTimes from '@/assets/icones/times.webp';
import icJogadores from '@/assets/icones/jogadores.webp';
import icEstatisticas from '@/assets/icones/estatisticas.webp';

const NavIcon = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} className="w-[22px] h-[22px] object-contain" />
);

const textVariants = {
  visible: { opacity: 1, x: 0, transition: { delay: 0.08, duration: 0.18 } },
  hidden:  { opacity: 0, x: -8, transition: { duration: 0.1 } },
};

const navLinks = [
  { to: '/', icon: <NavIcon src={icDashboard} alt="Dashboard" />, label: 'Dashboard' },
  { to: '/ligas', icon: <NavIcon src={icLigas} alt="Ligas" />, label: 'Ligas', adminOnly: true },
  { to: '/campeonatos', icon: <NavIcon src={icCampeonatos} alt="Campeonatos" />, label: 'Campeonatos' },
  { to: '/cartolendas', icon: <NavIcon src={icCartolendas} alt="Cartolendas" />, label: 'Cartolendas', highlight: 'purple' as const },
  { to: '/partidas', icon: <NavIcon src={icPartidas} alt="Partidas" />, label: 'Partidas' },
  { to: '/hall-da-fama', icon: <NavIcon src={icHallDaFama} alt="Hall da Fama" />, label: 'Hall da Fama', highlight: 'gold' as const },
  { to: '/times', icon: <NavIcon src={icTimes} alt="Times" />, label: 'Times' },
  { to: '/jogadores', icon: <NavIcon src={icJogadores} alt="Jogadores" />, label: 'Jogadores' },
  { to: '/analytics', icon: <NavIcon src={icEstatisticas} alt="Estatísticas" />, label: 'Estatísticas' },
  { to: '/racha', icon: <ClipboardList size={22} />, label: 'Racha' },
  { to: '/album', icon: <Images size={22} />, label: 'Álbum', highlight: 'pink' as const },
];

const highlightStyles = {
  purple: 'text-violet-300 border border-violet-500/25 hover:bg-violet-500/10 hover:text-violet-200',
  gold:   'text-yellow-300 border border-yellow-500/25 hover:bg-yellow-500/10 hover:text-yellow-200',
  pink:   'text-pink-300 border border-pink-500/25 hover:bg-pink-500/10 hover:text-pink-200',
};

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();
  const { isSidebarOpen, setSidebarOpen, isSidebarCollapsed, toggleSidebarCollapse } = useAppStore();

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* Botão fechar — mobile quando aberto */}
      {isSidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
          className={cn(
            'fixed top-4 left-4 z-[1100] rounded-xl p-2.5 transition-all duration-200 lg:hidden',
            'bg-[#040810]/90 backdrop-blur-md shadow-xl',
            'border border-accentPrimary/25 hover:border-accentPrimary/50',
            'active:scale-90',
          )}
        >
          <X size={22} className="text-accentPrimary" />
        </button>
      )}

      {/* Botão expandir — desktop quando colapsado */}
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebarCollapse}
          aria-label="Expandir menu"
          className={cn(
            'hidden lg:block fixed top-4 left-4 z-[1100] rounded-xl p-2.5 transition-all duration-200',
            'bg-[#040810]/90 backdrop-blur-md shadow-xl',
            'border border-accentPrimary/25 hover:border-accentPrimary/50',
            'active:scale-90',
          )}
        >
          <Menu size={22} className="text-accentPrimary" />
        </button>
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <motion.nav
        className={cn(
          'fixed top-0 left-0 z-[1050] flex h-full max-h-screen flex-col',
          'backdrop-blur-2xl shadow-2xl',
          'transition-all duration-300 ease-in-out overflow-hidden',
          isSidebarOpen ? 'left-0 w-[280px]' : '-left-full w-[280px]',
          'lg:left-0 lg:shadow-none',
          isSidebarCollapsed ? 'lg:w-[80px]' : 'lg:w-[280px]',
        )}
        style={{ background: 'rgba(4, 8, 16, 0.97)', borderRight: '1px solid rgba(0,195,255,0.12)' }}
      >
        {/* Linha brilhante topo */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.6), rgba(255,215,0,0.3), transparent)' }}
        />
        {/* Glow interno no topo */}
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,195,255,0.05), transparent 70%)' }}
        />

        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-2.5">

          {/* ── HEADER ──────────────────────────────────────────────── */}
          <div className="flex-shrink-0 mb-3">
            <div className={cn('flex items-center gap-2', isSidebarCollapsed && 'flex-col')}>
              {/* Logo */}
              <Link
                to="/"
                className={cn(
                  'group flex items-center gap-2.5 overflow-hidden rounded-xl p-2 transition-all duration-200',
                  'hover:bg-accentPrimary/[0.07] border border-transparent hover:border-accentPrimary/20',
                  isSidebarCollapsed ? 'w-full justify-center' : 'flex-1',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,195,255,0.3)' }} />
                  <img src={logoLendas} alt="Logo" className="relative h-8 w-auto drop-shadow-lg transition-transform duration-300 group-hover:scale-110" />
                </div>
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.div variants={textVariants} initial="hidden" animate="visible" exit="hidden"
                      className="flex flex-col leading-none">
                      <span style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 900, fontSize: '17px', letterSpacing: '0.06em',
                        background: 'linear-gradient(135deg, #00C3FF 0%, #7B2FFF 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      }}>FUTLENDAS</span>
                      <span style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontSize: '8px', fontWeight: 600, letterSpacing: '0.22em',
                        color: 'rgba(0,195,255,0.45)', textTransform: 'uppercase',
                      }}>ARENA</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>

              {/* Perfil — expandido */}
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Link to="/perfil" onClick={() => setSidebarOpen(false)}
                      className="group relative flex items-center gap-2 rounded-xl p-2 transition-all duration-200 hover:bg-accentPrimary/[0.07] border border-transparent hover:border-accentPrimary/20">
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105',
                          isAdmin ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-accentPrimary/[0.08] border-accentPrimary/25 text-accentPrimary',
                        )}>
                          <User size={15} />
                        </div>
                        {isAdmin && (
                          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 border border-[#040810]">
                            <Crown size={7} className="text-[#1a0800]" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                        <span className="truncate font-bold text-textPrimary text-xs leading-tight"
                          style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.03em' }}>
                          {user?.username}
                        </span>
                        <span className="text-[9px] font-bold text-textMuted flex items-center gap-1 leading-tight uppercase"
                          style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.12em' }}>
                          {isAdmin ? <><Zap size={8} className="text-yellow-400" />ADMIN</> : 'JOGADOR'}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Perfil — colapsado */}
              {isSidebarCollapsed && (
                <Link to="/perfil" onClick={() => setSidebarOpen(false)}
                  className="relative group flex w-full items-center justify-center rounded-xl p-2 transition-all duration-200 hover:bg-accentPrimary/[0.07] border border-transparent hover:border-accentPrimary/20">
                  <div className="relative">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105',
                      isAdmin ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-accentPrimary/[0.08] border-accentPrimary/25 text-accentPrimary',
                    )}>
                      <User size={15} />
                    </div>
                    {isAdmin && (
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 border border-[#040810]">
                        <Crown size={7} className="text-[#1a0800]" fill="currentColor" />
                      </div>
                    )}
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Divisor */}
          <div className="mb-2 h-px flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.2), transparent)' }}
          />

          {/* ── LINKS ─────────────────────────────────────────────── */}
          <ul className="flex-1 list-none space-y-1 overflow-y-auto overflow-x-hidden pr-0.5 custom-scrollbar min-h-0">
            {navLinks.filter(l => !l.adminOnly || isAdmin).map((link) => {
              const isActive = link.to === '/'
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);

              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    title={link.label}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group relative flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl p-2.5',
                      'transition-all duration-200',
                      isSidebarCollapsed && 'justify-center',
                      isActive
                        ? 'text-white border border-[rgba(0,195,255,0.28)] shadow-[0_0_12px_rgba(0,195,255,0.08),inset_0_1px_0_rgba(0,195,255,0.15)]'
                        : link.highlight
                          ? cn('border border-transparent hover:scale-[1.02] active:scale-95', highlightStyles[link.highlight])
                          : 'text-textMuted border border-transparent hover:bg-accentPrimary/[0.07] hover:text-textSecondary hover:border-accentPrimary/12 hover:scale-[1.02] active:scale-95',
                    )}
                    style={isActive ? {
                      background: 'linear-gradient(90deg, rgba(0,195,255,0.16) 0%, rgba(0,195,255,0.06) 50%, rgba(0,100,200,0.04) 100%)',
                    } : undefined}
                  >
                    {/* Barra esquerda ativa */}
                    {isActive && (
                      <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
                        style={{
                          background: 'linear-gradient(180deg, #00C3FF 0%, #7B2FFF 100%)',
                          boxShadow: '0 0 8px rgba(0,195,255,0.7)',
                        }}
                      />
                    )}

                    {/* Ícone */}
                    <span className={cn(
                      'relative z-10 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                      isSidebarCollapsed && 'm-0',
                      isActive && '[filter:drop-shadow(0_0_5px_rgba(0,195,255,0.6))]',
                    )}>
                      {link.icon}
                    </span>

                    {/* Label */}
                    <AnimatePresence>
                      {!isSidebarCollapsed && (
                        <motion.span
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          className="relative z-10 text-xs"
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            textShadow: isActive ? '0 0 12px rgba(0,195,255,0.5)' : 'none',
                          }}
                        >
                          {link.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* Divisor */}
          <div className="my-2 h-px flex-shrink-0"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,195,255,0.15), transparent)' }}
          />

          {/* ── FOOTER ─────────────────────────────────────────────── */}
          <div className="flex-shrink-0 space-y-1">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                'group relative w-full justify-start gap-3 rounded-xl h-9 p-2',
                'text-textMuted transition-all duration-200',
                'hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25 border border-transparent active:scale-95',
                isSidebarCollapsed && 'justify-center',
              )}
            >
              <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12">
                <LogOut size={18} />
              </span>
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.span variants={textVariants} initial="hidden" animate="visible" exit="hidden"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Sair
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {!isSidebarCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex w-full justify-center gap-2 text-textMuted/50 transition-all duration-200 hover:text-accentPrimary hover:bg-accentPrimary/[0.07] rounded-xl border border-transparent hover:border-accentPrimary/20 h-8"
              >
                <ChevronLeft size={16} />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Recolher
                </span>
              </Button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Overlay Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1040] bg-black/75 backdrop-blur-md lg:hidden"
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,195,255,0.2); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,195,255,0.4); }
      `}</style>
    </>
  );
};
