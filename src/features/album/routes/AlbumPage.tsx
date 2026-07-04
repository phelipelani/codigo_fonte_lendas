// Arquivo: src/features/album/routes/AlbumPage.tsx
//
// Pagina principal do Album de Figurinhas.
//   - Desktop (>= 1024px): "livro" spread de 2 paginas — PaginaAlbum
//   - Mobile  (< 1024px) : telas separadas em coluna unica — TelaAlbum

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Loader2,
  Trophy,
  ArrowLeftRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  useMeuAlbum,
  useMeuWhatsapp,
  useMeusPacotes,
  type Figurinha as FigurinhaType,
  type Pagina,
} from '../api/albumApi';
import { PaginaAlbum } from '../components/PaginaAlbum';
import { AlbumErrorBoundary } from '../components/AlbumErrorBoundary';
import {
  TelaAlbum,
  partesDaPagina,
  rotuloParte,
  type Parte,
} from '../components/TelaAlbum';
import { AbrirPacoteModal } from '../components/AbrirPacoteModal';
import { VincularWhatsappModal } from '../components/VincularWhatsappModal';
import { OrigemFigurinhaModal } from '../components/OrigemFigurinhaModal';
import { AlbumRankingModal } from '../components/AlbumRankingModal';

// =============================================================
// Hook simples para media-query (sem dependencia extra)
// =============================================================
function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = React.useState<boolean>(get);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const AlbumPage: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const { data: album, isLoading } = useMeuAlbum();
  const { data: whatsappData, isLoading: loadingWhats } = useMeuWhatsapp();
  const { data: pacotesData } = useMeusPacotes();

  // Indices separados para desktop (spreads) e mobile (telas).
  // Assim se o user redimensionar a janela, cada visualizacao mantem
  // sua propria posicao sem ficar inconsistente.
  const [indiceDesktop, setIndiceDesktop] = React.useState(0);
  const [indiceMobile, setIndiceMobile] = React.useState(0);

  const [pacoteAberto, setPacoteAberto] = React.useState<number | null>(null);
  const [rankingAberto, setRankingAberto] = React.useState(false);
  const [whatsappOk, setWhatsappOk] = React.useState(false);
  const [figClicada, setFigClicada] = React.useState<FigurinhaType | null>(null);

  const precisaWhatsapp = !loadingWhats && !whatsappData?.whatsapp && !whatsappOk;

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

  // Lista plana de telas para o mobile
  const telas = React.useMemo(() => {
    const lista: { pagina: Pagina; parte: Parte }[] = [];
    paginas.forEach((p) => {
      partesDaPagina(p).forEach((parte) => lista.push({ pagina: p, parte }));
    });
    return lista;
  }, [paginas]);

  const totalDesktop = paginas.length;
  const totalMobile = telas.length;

  const idxD = Math.min(indiceDesktop, Math.max(0, totalDesktop - 1));
  const idxM = Math.min(indiceMobile, Math.max(0, totalMobile - 1));

  const paginaAtual = paginas[idxD] ?? null;
  const telaAtual = telas[idxM] ?? null;

  const pacotesFechados =
    (pacotesData?.pacotes ?? []).filter((p) => p.status === 'fechado').length;

  const avancar = () => {
    if (isDesktop) setIndiceDesktop((i) => Math.min(i + 1, totalDesktop - 1));
    else setIndiceMobile((i) => Math.min(i + 1, totalMobile - 1));
  };
  const voltar = () => {
    if (isDesktop) setIndiceDesktop((i) => Math.max(i - 1, 0));
    else setIndiceMobile((i) => Math.max(i - 1, 0));
  };

  // No mobile, sobe para o topo ao trocar de tela.
  React.useEffect(() => {
    if (!isDesktop) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idxM, isDesktop]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Largura do container muda conforme breakpoint:
  // mobile = max-w-3xl (coluna unica), desktop = max-w-7xl (livro largo)
  const containerCls = isDesktop ? 'max-w-7xl' : 'max-w-3xl';

  return (
    <div className={cn('p-3 sm:p-5 lg:p-8 mx-auto', containerCls)}>
      {precisaWhatsapp && (
        <VincularWhatsappModal onVinculado={() => setWhatsappOk(true)} />
      )}

      <AbrirPacoteModal
        pacoteId={pacoteAberto}
        onClose={() => setPacoteAberto(null)}
      />

      <AlbumRankingModal
        isOpen={rankingAberto}
        onClose={() => setRankingAberto(false)}
      />

      <AnimatePresence>
        {figClicada && (
          <OrigemFigurinhaModal
            figurinha={figClicada}
            onClose={() => setFigClicada(null)}
          />
        )}
      </AnimatePresence>

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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRankingAberto(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-[#0d1f35] px-4 py-2.5 font-bold text-yellow-400 transition-all hover:bg-yellow-500/10"
          >
            <Trophy className="h-5 w-5" />
            Disputa
          </button>

          <Link
            to="/album/mural"
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#0d1f35] px-4 py-2.5 font-bold text-cyan-200 transition-all hover:bg-cyan-500/10"
          >
            <ArrowLeftRight className="h-5 w-5" />
            Mural de trocas
          </Link>

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
        </div>
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

      {/* ===== O conteudo do album ===== */}
      <div className="relative">
      <AlbumErrorBoundary>
        {isDesktop ? (
          // -------- DESKTOP: livro (spread de 2 paginas) --------
          <div
            className={cn(
              'relative rounded-2xl border-2 border-cyan-400/40 overflow-hidden',
              'h-[600px] sm:h-[680px] lg:h-[780px]',
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
                    onFigurinhaClick={setFigClicada}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          // -------- MOBILE: tela unica (coluna) --------
          <div
            className={cn(
              'relative rounded-2xl border-2 border-cyan-400/40 overflow-hidden',
              'min-h-[60vh]',
              'bg-[radial-gradient(ellipse_85%_55%_at_50%_30%,#243650_0%,#1b2942_48%,#0e1830_100%)]',
              'shadow-[0_0_40px_-12px_rgba(34,211,238,0.3)]'
            )}
          >
            <AnimatePresence mode="wait">
              {telaAtual && (
                <motion.div
                  key={idxM}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                >
                  <TelaAlbum
                    pagina={telaAtual.pagina}
                    figurinhas={figsPorPagina.get(telaAtual.pagina.id) ?? []}
                    parte={telaAtual.parte}
                    onFigurinhaClick={setFigClicada}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </AlbumErrorBoundary>
        {/* ===== Navegacao ===== */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={voltar}
            disabled={(isDesktop ? idxD : idxM) === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="text-center">
            <div className="text-xs font-bold text-cyan-100/70 tabular-nums">
              {isDesktop
                ? totalDesktop > 0
                  ? `${idxD + 1} / ${totalDesktop}`
                  : '—'
                : totalMobile > 0
                  ? `${idxM + 1} / ${totalMobile}`
                  : '—'}
            </div>
            {!isDesktop && telaAtual && (
              <div className="text-[10px] uppercase tracking-widest text-cyan-100/35">
                Pág. {telaAtual.pagina.numero} · {rotuloParte(telaAtual.parte)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={avancar}
            disabled={
              isDesktop
                ? idxD >= totalDesktop - 1
                : idxM >= totalMobile - 1
            }
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
