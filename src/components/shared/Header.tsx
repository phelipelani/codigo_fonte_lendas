// Arquivo: src/components/shared/Header.tsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Menu, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { user } = useAuth();
  const { setSidebarOpen } = useAppStore();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-borderLight bg-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/60">
      {/* Container do Header */}
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Lado Esquerdo: Botão Menu Mobile + Título Desktop */}
        <div className="flex items-center gap-3">
          {/* Botão Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="text-textSecondary transition-all duration-300 hover:text-accentPrimary md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo/Título (Desktop) */}
          <Link to="/" className="hidden items-center gap-2 md:flex">
            <span className="bg-gradient-hero bg-clip-text font-display text-2xl font-bold text-transparent">
              FUTLENDAS
            </span>
          </Link>
        </div>

        {/* Lado Direito: Informações do Usuário */}
        <div className="flex items-center gap-4">
          {/* Nome do usuário (hidden em mobile pequeno) */}
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-medium text-textPrimary">
              {user?.username}
            </span>
            <span className="text-xs text-textMuted">
              {user?.role === 'admin' ? 'Administrador' : 'Jogador'}
            </span>
          </div>

          {/* Avatar do Usuário */}
          <div className="group relative">
            {/* Glow effect no hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-hero opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-50" />
            
            {/* Avatar */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-borderLight bg-gradient-surface text-textPrimary shadow-card transition-all duration-300 group-hover:border-accentPrimary group-hover:scale-110">
              <User size={20} />
            </div>

            {/* Badge de role (opcional) */}
            {user?.role === 'admin' && (
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-gradient-gold text-xs font-bold text-background shadow-glow-gold">
                A
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};