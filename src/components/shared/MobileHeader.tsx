// Arquivo: src/components/shared/MobileHeader.tsx
// Header fixo no topo do mobile com logo, notificações e perfil
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Crown, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/useAppStore';
import { NotificacoesSino } from '@/features/notificacoes/components/NotificacoesSino';
import logoLendas from '@/assets/Logo.webp';
import { cn } from '@/lib/utils';

const MobileHeader = React.memo(function MobileHeader() {
  const { user } = useAuth();
  const { setSidebarOpen } = useAppStore();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[1055] lg:hidden',
        'flex items-center justify-between h-14 px-4',
        'bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/[0.06]',
      )}
    >
      {/* Logo + Menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] active:scale-90 transition-transform"
          aria-label="Menu"
        >
          <Menu size={16} className="text-cyan-300" />
        </button>

        <Link to="/" className="flex items-center gap-2">
          <img src={logoLendas} alt="FutLendas" className="h-7 w-auto" />
          <span className="text-sm font-black bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
            FutLendas
          </span>
        </Link>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {/* Notificações */}
        <NotificacoesSino />

        {/* Avatar do perfil */}
        <Link to="/perfil">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-cyan-500/20 bg-[#0d1f35] text-cyan-300"
          >
            <User size={14} />
            {user?.role === 'admin' && (
              <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#0a1628] bg-gradient-to-br from-yellow-400 to-yellow-600">
                <Crown size={7} className="text-white" fill="currentColor" />
              </div>
            )}
          </motion.div>
        </Link>
      </div>
    </header>
  );
});

export default MobileHeader;
