// Arquivo: src/components/shared/Sidebar.tsx

import { NavLink, Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import logoLendas from '@/assets/Logo.webp';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

// Ícones customizados
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
  visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
  hidden: { opacity: 0, x: -10, transition: { duration: 0.1 } },
};

const navLinks = [
  { to: '/', icon: <NavIcon src={icDashboard} alt="Dashboard" />, label: 'Dashboard' },
  { to: '/ligas', icon: <NavIcon src={icLigas} alt="Ligas" />, label: 'Ligas', adminOnly: true },
  { to: '/campeonatos', icon: <NavIcon src={icCampeonatos} alt="Campeonatos" />, label: 'Campeonatos' },
  { to: '/cartolendas', icon: <NavIcon src={icCartolendas} alt="Cartolendas" />, label: 'Cartolendas', highlight: true },
  { to: '/partidas', icon: <NavIcon src={icPartidas} alt="Partidas" />, label: 'Partidas' },
  { to: '/hall-da-fama', icon: <NavIcon src={icHallDaFama} alt="Hall da Fama" />, label: 'Hall da Fama' },
  { to: '/times', icon: <NavIcon src={icTimes} alt="Times" />, label: 'Times' },
  { to: '/jogadores', icon: <NavIcon src={icJogadores} alt="Jogadores" />, label: 'Jogadores' },
  { to: '/analytics', icon: <NavIcon src={icEstatisticas} alt="Analytics" />, label: 'Analytics' },
  { to: '/racha', icon: <ClipboardList size={22} />, label: 'Racha' },
  { to: '/album', icon: <Images size={22} />, label: 'Álbum', highlight: true },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, user, isAdmin } = useAuth();
  
  const {
    isSidebarOpen,
    setSidebarOpen,
    isSidebarCollapsed,
    toggleSidebarCollapse
  } = useAppStore();

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
    navigate('/login');
  };

  return (
    <>
      {/* BOTÃO HAMBURGUER – MOBILE (oculto, agora usa BottomNav) */}
      {/* Mantemos apenas como fallback quando sidebar está aberta para fechar */}
      {isSidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
          className={cn(
            "fixed top-4 left-4 z-[1100] rounded-xl p-2.5 transition-all duration-200",
            "bg-[#0a1628]/80 backdrop-blur-md shadow-xl border border-cyan-500/20",
            "hover:bg-[#0a1628] hover:border-cyan-500/40 hover:shadow-2xl",
            "active:scale-95 lg:hidden"
          )}
        >
          <X size={22} className="text-cyan-100" />
        </button>
      )}

      {/* BOTÃO HAMBURGUER – DESKTOP */}
      {isSidebarCollapsed && (
        <button
          onClick={toggleSidebarCollapse}
          aria-label="Expandir menu lateral"
          className={cn(
            "hidden lg:block fixed top-4 left-4 z-[1100] rounded-xl p-2.5 transition-all duration-200",
            "bg-[#0a1628]/80 backdrop-blur-md shadow-xl border border-cyan-500/20",
            "hover:bg-[#0a1628] hover:border-cyan-500/40 hover:shadow-2xl",
            "active:scale-95"
          )}
        >
          <Menu size={22} className="text-cyan-100" />
        </button>
      )}

      {/* SIDEBAR */}
      <motion.nav
        className={cn(
          "fixed top-0 left-0 z-[1050] flex h-full max-h-screen flex-col",
          "bg-[#0a1628]/90 backdrop-blur-xl border-r border-cyan-500/20",
          "text-cyan-100/60 shadow-2xl transition-all duration-300 ease-in-out",
          "overflow-hidden",
          isSidebarOpen ? "left-0 w-[280px]" : "-left-full w-[280px]",
          "lg:left-0 lg:shadow-none",
          isSidebarCollapsed ? "lg:w-[80px]" : "lg:w-[280px]"
        )}
      >
        {/* Linha brilhante no topo */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar py-3 px-3">
          
          {/* HEADER */}
          <div className="flex-shrink-0 mb-3">
            <div className={cn("flex items-center gap-2", isSidebarCollapsed && "flex-col")}>
              <Link 
                to="/" 
                className={cn(
                  "group flex items-center gap-2 overflow-hidden rounded-xl p-2 transition-all duration-300",
                  "hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30",
                  isSidebarCollapsed ? "w-full justify-center" : "flex-1"
                )} 
                onClick={() => setSidebarOpen(false)}
              >
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-cyan-500/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70" />
                  <img src={logoLendas} alt="Lendas Logo" className="relative h-8 w-auto drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" />
                </div>
                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.span 
                      variants={textVariants} 
                      initial="hidden" 
                      animate="visible" 
                      exit="hidden" 
                      className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text font-display text-base font-bold text-transparent truncate"
                    >
                      FutLendas
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* LINK DE PERFIL */}
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="flex-1">
                    <Link 
                      to="/perfil" 
                      onClick={() => setSidebarOpen(false)} 
                      className="group relative flex w-full items-center gap-2 rounded-xl p-2 transition-all duration-200 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-300 shadow-sm transition-all duration-200 group-hover:border-cyan-500/50 group-hover:scale-105">
                          <User size={16} />
                        </div>
                        {user?.role === "admin" && (
                          <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0a1628] bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm">
                            <Crown size={8} className="text-white" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                        <span className="truncate font-semibold text-white text-xs leading-tight">{user?.username}</span>
                        <span className="text-[9px] font-medium text-cyan-100/50 flex items-center gap-0.5 truncate leading-tight">
                          {user?.role === "admin" ? <><Crown size={8} className="text-yellow-400 flex-shrink-0" />Admin</> : "Jogador"}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {isSidebarCollapsed && (
                <Link 
                  to="/perfil" 
                  onClick={() => setSidebarOpen(false)} 
                  className="group relative flex w-full items-center justify-center rounded-lg p-2 transition-all duration-200 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20"
                >
                  <div className="relative">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-[#0d1f35] text-cyan-300 shadow-sm transition-all duration-200 group-hover:border-cyan-500/50 group-hover:scale-105">
                      <User size={16} />
                    </div>
                    {user?.role === "admin" && (
                      <div className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0a1628] bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm">
                        <Crown size={8} className="text-white" fill="currentColor" />
                      </div>
                    )}
                  </div>
                </Link>
              )}
            </div>
          </div>

          <div className="mb-2 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent flex-shrink-0" />

          {/* LINKS */}
          <ul className="flex-1 list-none space-y-1.5 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar min-h-0">
            {navLinks.filter((link) => !link.adminOnly || isAdmin).map((link) => (
              <li key={link.to}>
                <NavLink 
                  to={link.to} 
                  end={link.to === "/"} 
                  title={link.label} 
                  onClick={() => setSidebarOpen(false)} 
                  className={({ isActive }) => cn(
                    "group relative flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl p-2.5 text-sm font-bold transition-all duration-300",
                    isSidebarCollapsed && "justify-center",
                    isActive 
                      ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30 scale-[1.02]" 
                      : link.highlight
                        ? "text-purple-300 hover:bg-purple-500/15 hover:text-purple-200 hover:scale-[1.02] active:scale-95 border border-purple-500/20"
                        : "text-cyan-100/60 hover:bg-cyan-500/10 hover:text-cyan-100 hover:scale-[1.02] active:scale-95"
                  )}
                >
                  <span className={cn("relative z-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110", isSidebarCollapsed && "m-0")}>
                    {link.icon}
                  </span>
                  <AnimatePresence>
                    {!isSidebarCollapsed && (
                      <motion.span variants={textVariants} initial="hidden" animate="visible" exit="hidden" className="relative z-10 uppercase tracking-wide text-xs" style={{ fontFamily: "'Montserrat', Arial, sans-serif", fontWeight: 800 }}>
                        {link.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="my-2 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent flex-shrink-0" />

          {/* FOOTER */}
          <div className="flex-shrink-0 space-y-1.5">
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className={cn(
                "group relative w-full justify-start gap-3 rounded-xl text-cyan-100/60 transition-all duration-300 h-9 p-2",
                "hover:bg-red-500/10 hover:text-red-400 hover:scale-[1.02] border border-transparent hover:border-red-500/30 active:scale-95",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <span className={cn("flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12", isSidebarCollapsed && "m-0")}>
                <LogOut size={18} />
              </span>
              <AnimatePresence>
                {!isSidebarCollapsed && (
                  <motion.span variants={textVariants} initial="hidden" animate="visible" exit="hidden" className="font-bold uppercase tracking-wide text-xs">
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
                className="hidden lg:flex w-full justify-center gap-2 text-cyan-100/40 transition-all duration-300 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl border border-transparent hover:border-cyan-500/20 h-8"
              >
                <ChevronLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Recolher</span>
              </Button>
            )}
          </div>
        </div>
      </motion.nav>

      {/* Overlay Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="mobile-overlay" 
            onClick={() => setSidebarOpen(false)} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="fixed inset-0 z-[1040] bg-black/70 backdrop-blur-md lg:hidden" 
          />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.4); }
      `}</style>
    </>
  );
};