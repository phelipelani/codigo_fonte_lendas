// Arquivo: src/features/album/routes/AlbumPage.tsx
//
// Pagina principal do Album de Figurinhas — formato livro.
// Desktop: 2 paginas lado a lado (spread). Mobile: 1 pagina.

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMeuAlbum,
  useMeuWhatsapp,
  type Figurinha as FigurinhaType,
} from '../api/albumApi';
import { PaginaAlbum } from '../components/PaginaAlbum';
import { AbrirPacoteModal } from '../components/AbrirPacoteModal';
import { VincularWhatsappModal } from '../components/VincularWhatsappModal';
import { useMeusPacotes } from '../api/albumApi';

// Hook simples de media query
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  React.useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isDesktop;
}

export const AlbumPage: React.FC = () => {
  const isDesktop = useIsDesktop();
  const { data: album, isLoading } = useMeuAlbum();
  const { data: whatsappData, isLoading: loadingWhats } = useMeuWhatsapp();
  const { data: pacotesData } = useMeusPacotes();

  const [indice, setIndice] = React.useState(0); // indice da pagina (0-based)
  const [pacoteAberto, setPacoteAberto] = React.useState<number | null>(null);
  const [whatsappOk, setWhatsappOk] = React.useState(false);

  const precisaWhatsapp =
    !loadingWhats && !whatsappData?.whatsapp && !whatsappOk;

  // Figurinhas agrupadas por pagina_id
  const figsPorPagina = React.useMemo(() => {
    const map = new Map<number, FigurinhaType[]>();
    (album?.figurinhas ?? []).forEach((f) => {
      if (f.pagina_id == null) return;
      const arr = map.get(f.pagina_id) ?? [];
      arr.push(f);
      map.set(f.pagina_id, arr);
    });
    return map;
  }, [album?.figurinhas]);

  const paginas = album?.paginas ?? [];
  const totalPaginas = paginas.length;
  const passo = isDesktop ? 2 : 1;
  const pacotesFechados =
    (pacotesData?.pacotes ?? []).filter((p) => p.status === 'fechado').length;

  const avancar = () =>
    setIndice((i) => Math.min(i + passo, Math.max(0, totalPaginas - 1)));
  const voltar = () => setIndice((i) => Math.max(i - passo, 0));

  // Paginas visiveis
  const paginasVisiveis = isDesktop
    ? paginas.slice(indice, indice + 2)
    : paginas.slice(indice, indice + 1);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto">
      {/* Modal de vinculo WhatsApp (bloqueante na 1a visita) */}
      {precisaWhatsapp && (
        <VincularWhatsappModal onVinculado={() => setWhatsappOk(true)} />
      )}

      {/* Modal de abrir pacote */}
      <AbrirPacoteModal
        pacoteId={pacoteAberto}
        onClose={() => setPacoteAberto(null)}
      />

      {/* ===== Header ===== */}
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">
              Álbum de Figurinhas
            </span>
          </h1>
          {album?.progresso && (
            <p className="mt-0.5 text-xs sm:text-sm text-cyan-100/50">
              {album.progresso.obtidas}/{album.progresso.total} figurinhas •{' '}
              {album.progresso.percentual}% completo
            </p>
          )}
        </div>

        {/* Botao de pacotes */}
        <button
          type="button"
          onClick={() => {
            const fechado = (pacotesData?.pacotes ?? []).find(
              (p) => p.status === 'fechado'
            );
            if (fechado) setPacoteAberto(fechado.id);
          }}
          disabled={pacotesFechados === 0}
          className={cn(
            'relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-bold transition-all',
            pacotesFechados > 0
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a1628] hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          )}
        >
          <Package className="h-5 w-5" />
          {pacotesFechados > 0
            ? `Abrir pacote (${pacotesFechados})`
            : 'Sem pacotes'}
          {pacotesFechados > 0 && (
            <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center animate-pulse">
              {pacotesFechados}
            </span>
          )}
        </button>
      </header>

      {/* ===== Barra de progresso ===== */}
      {album?.progresso && (
        <div className="mb-5 h-2.5 w-full rounded-full bg-cyan-500/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${album.progresso.percentual}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
          />
        </div>
      )}

      {/* ===== O LIVRO ===== */}
      <div className="relative">
        <div
          className={cn(
            'relative rounded-2xl border-2 border-cyan-400/40 bg-[#060d1a] overflow-hidden',
            'shadow-[0_0_40px_-12px_rgba(34,211,238,0.3)]'
          )}
        >
          <div
            className={cn(
              'grid',
              isDesktop ? 'grid-cols-2' : 'grid-cols-1'
            )}
          >
            <AnimatePresence mode="wait">
              {paginasVisiveis.map((pg) => (
                <motion.div
                  key={pg.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'min-h-[520px] sm:min-h-[600px] relative',
                    // lombada entre as duas paginas (desktop)
                    isDesktop &&
                      'first:border-r first:border-cyan-400/20'
                  )}
                >
                  <PaginaAlbum
                    pagina={pg}
                    figurinhas={figsPorPagina.get(pg.id) ?? []}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Navegacao */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={voltar}
            disabled={indice === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <span className="text-xs text-cyan-100/50 tabular-nums">
            {totalPaginas > 0
              ? `${indice + 1}${
                  isDesktop && paginasVisiveis.length > 1
                    ? `-${indice + paginasVisiveis.length}`
                    : ''
                } / ${totalPaginas}`
              : '—'}
          </span>

          <button
            type="button"
            onClick={avancar}
            disabled={indice + passo >= totalPaginas}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Album completo */}
      {album?.progresso && album.progresso.percentual >= 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-center"
        >
          <Trophy className="mx-auto h-10 w-10 text-amber-400" />
          <h3 className="mt-2 text-lg font-black text-amber-200">
            Álbum completo! 🎉
          </h3>
          <p className="text-sm text-amber-100/70">
            Você coletou todas as {album.progresso.total} figurinhas. Lenda!
          </p>
        </motion.div>
      )}
    </div>
  );
};
