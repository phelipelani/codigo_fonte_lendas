// Arquivo: src/components/shared/AppLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from './ErrorBoundary';

const PageFallback = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="h-8 w-48 rounded-lg" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-48 w-full rounded-2xl" />
    <Skeleton className="h-32 w-full rounded-2xl" />
  </div>
);

export const AppLayout = () => {
  const location = useLocation();
  const { isSidebarCollapsed } = useAppStore();

  return (
    <div className="relative flex h-screen w-full overflow-hidden">
      <AnimatedBackground showWaves showCircles showTriangles intensity="medium" />

      {/* Mobile Header — logo + notificações + perfil */}
      <MobileHeader />

      {/* Sidebar — desktop permanente; mobile via menu hamburger */}
      <Sidebar />

      {/*
        Mobile  : pt-2 (sem mais top bar!) + pb-20 (bottom nav 64px + safe area)
        Desktop : pl = largura da sidebar, sem pt/pb extra
      */}
      <div
        className={cn(
          'relative z-10 flex h-full flex-1 flex-col overflow-y-auto overflow-x-hidden',
          'transition-[padding] duration-300 ease-in-out',
          // Mobile: pt-14 (header) + pb-20 (bottom nav)
          'pt-14 pb-20 lg:pt-0 lg:pb-0',
          // Desktop: recua conforme sidebar
          isSidebarCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[280px]',
        )}
      >
        <main className="flex-1 px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer — só aparece no desktop */}
        <footer className="mt-auto border-t border-cyan-500/10 bg-[#0a1628]/40 backdrop-blur-md py-4 px-4 sm:px-6 lg:px-8 hidden lg:block">
          <div className="mx-auto w-full max-w-[1600px] flex items-center justify-between text-xs text-cyan-100/40">
            <p className="flex items-center gap-2">
              <span className="font-semibold text-cyan-400">FUTLENDAS</span>
              <span>•</span>
              <span>Sistema de Gestão de Futebol Amador</span>
            </p>
            <p className="flex items-center gap-1">
              Feito Por Lani <span className="text-cyan-400 animate-pulse">❤️</span>
            </p>
          </div>
        </footer>
      </div>

      {/* Bottom Navigation — somente mobile */}
      <BottomNav />
    </div>
  );
};