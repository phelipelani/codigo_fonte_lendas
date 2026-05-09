// Arquivo: src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { Toaster } from '@/components/ui/Toaster';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// Cliente do React Query com configurações otimizadas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false, // Evita refetch desnecessário ao focar na janela
    },
  },
});

// Componente de Loading Global Premium
const GlobalLoader = () => (
  <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-6">
      {/* Logo ou Ícone Animado */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accentPrimary/20 to-accentSecondary/20 flex items-center justify-center animate-pulse">
          <svg 
            className="w-12 h-12 text-accentPrimary" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" 
            />
          </svg>
        </div>
        
        {/* Círculo Animado */}
        <div className="absolute inset-0 rounded-2xl border-4 border-accentPrimary/30 animate-ping" />
      </div>

      {/* Texto de Carregamento */}
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold heading-gradient">FUTLENDAS</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accentPrimary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-accentPrimary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-accentPrimary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-textMuted">Carregando...</p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<GlobalLoader />}>
            {/* Renderiza as rotas da aplicação */}
            <AppRoutes />

            {/* Container de notificações toast */}
            <Toaster
              richColors
              position="top-right"
              toastOptions={{
                className: 'rounded-xl border-2',
                duration: 3000,
              }}
            />
          </Suspense>
        </BrowserRouter>

        {/* React Query DevTools (apenas em desenvolvimento) */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom-right"
          />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;