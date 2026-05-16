// Arquivo: src/features/album/routes/AlbumPage.tsx
//
// Pagina principal do Album de Figurinhas.
// Cada "pagina" e uma tela cheia (spread) — igual ao design do Figma.
// Navegacao: uma pagina por vez.

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Package, Loader2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMeuAlbum,
  useMeuWhatsapp,
  useMeusPacotes,
  type Figurinha as FigurinhaType,
} from '../api/albumApi';
import { PaginaAlbum } from '../components/PaginaAlbum';
import { AbrirPacoteModal } from '../components/AbrirPacoteModal';
import { VincularWhatsappModal } from '../components/VincularWhatsappModal';

export const AlbumPage: React.FC = () => {
  const { data: album, isLoading } = useMeuAlbum();
  const { data: whatsappData, isLoading: loadingWhats } = useMeuWhatsapp();
  const { data: pacotesData } = useMeusPacotes();

  const [indice, setIndice] = React.useState(0);
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
  const paginaAtual = paginas[indice] ?? null;

  const pacotesFechados =
    (pacotesData?.pacotes ?? []).filter((p) => p.status === 'fechado').length;

  const avancar = () => setIndice((i) => Math.min(i + 1, totalPaginas - 1));
  const voltar = () => setIndice((i) => Math.max(i - 1, 0));

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-5 lg:p-8 max-w-7xl mx-auto">
      {precisaWhatsapp && (
        <VincularWhatsappModal onVinculado={() => setWhatsappOk(true)} />
      )}

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

      {/* ===== O LIVRO — uma pagina (spread) por vez ===== */}
      <div className="relative">
        <div
          className={cn(
            'relative rounded-2xl border-2 border-cyan-400/40 overflow-hidden',
            // Altura FIXA — todas as paginas tem o mesmo tamanho de livro
            'h-[600px] sm:h-[680px] lg:h-[780px]',
            // Fundo "Estadio a noite" — holofote radial
            'bg-[radial-gradient(ellipse_75%_55%_at_50%_40%,#243650_0%,#1b2942_48%,#0e1830_100%)]',
            'shadow-[0_0_40px_-12px_rgba(34,211,238,0.3)]'
          )}
        >
          <AnimatePresence mode="wait">
            {paginaAtual && (
              <motion.div
                key={paginaAtual.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28 }}
                className="h-full"
              >
                <PaginaAlbum
                  pagina={paginaAtual}
                  figurinhas={figsPorPagina.get(paginaAtual.id) ?? []}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
            {totalPaginas > 0 ? `${indice + 1} / ${totalPaginas}` : '—'}
          </span>

          <button
            type="button"
            onClick={avancar}
            disabled={indice >= totalPaginas - 1}
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
