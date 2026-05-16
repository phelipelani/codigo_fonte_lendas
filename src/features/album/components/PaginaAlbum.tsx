// Arquivo: src/features/album/components/PaginaAlbum.tsx
//
// Renderiza UMA pagina do album (tela cheia / spread) conforme o tipo.
// Cada pagina tem layout interno de 2 colunas com a "lombada" no meio,
// fiel ao design do Figma.

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Figurinha } from './Figurinha';
import type { Pagina, Figurinha as FigurinhaType } from '../api/albumApi';
import capaHero from '../assets/capa-hero.png';
import logoLendas from '@/assets/Logo.webp';
import fotoAmigos1 from '../assets/image_1.png';
import fotoAmigos2 from '../assets/image_2.png';

type PaginaAlbumProps = {
  pagina: Pagina;
  figurinhas: FigurinhaType[];
  onFigurinhaClick?: (fig: FigurinhaType) => void;
};

// Altura MINIMA de uma pagina (capa preenche o livro). A pagina
// CRESCE livremente se o conteudo (ex: texto longo) for maior.
const ALTURA_PAGINA = 'min-h-[560px] sm:min-h-[640px] lg:min-h-[760px]';

// =============================================================
// Mini-cabecalho da identidade (canto superior das paginas internas)
// =============================================================
const MiniHeaderIdentidade: React.FC = () => (
  <div className="select-none">
    <div className="flex items-center gap-1.5">
      <span className="h-px w-3 bg-amber-400/50" />
      <span className="text-[7px] tracking-[0.35em] text-white/45 font-semibold">
        ÁLBUM OFICIAL
      </span>
    </div>
    <div className="font-black italic leading-[0.85] mt-0.5">
      <span className="block text-lg sm:text-xl lg:text-2xl text-white">FUT</span>
      <span className="block text-lg sm:text-xl lg:text-2xl text-amber-400">LENDAS</span>
    </div>
    <span className="text-[7px] tracking-[0.3em] text-white/30 font-semibold">
      COLEÇÃO COMPLETA
    </span>
  </div>
);

// Logo no canto da pagina
const LogoCanto: React.FC = () => (
  <img
    src={logoLendas}
    alt="FutLendas"
    className="h-14 w-14 sm:h-16 sm:w-16 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
  />
);

export const PaginaAlbum: React.FC<PaginaAlbumProps> = ({
  pagina,
  figurinhas,
  onFigurinhaClick,
}) => {
  const figsOrdenadas = [...figurinhas].sort(
    (a, b) => (a.slot ?? 999) - (b.slot ?? 999)
  );

  // ============================================================
  // CAPA
  // ============================================================
  if (pagina.tipo === 'capa') {
    return (
      <div className={cn('relative w-full flex flex-col md:flex-row bg-black overflow-hidden', ALTURA_PAGINA)}>
        {/* Metade esquerda — preta com a identidade */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-10 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <span className="h-px w-6 bg-amber-400/60" />
            <span className="text-[9px] sm:text-[10px] tracking-[0.45em] text-white/70 font-semibold">
              ÁLBUM OFICIAL
            </span>
            <span className="h-px w-6 bg-amber-400/60" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="font-black italic leading-[0.82] tracking-tight"
          >
            <span className="block text-6xl sm:text-7xl md:text-8xl text-white drop-shadow-lg">
              FUT
            </span>
            <span className="block text-6xl sm:text-7xl md:text-8xl text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
              LENDAS
            </span>
          </motion.h1>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-[11px] sm:text-sm tracking-[0.42em] text-white/45 font-semibold"
          >
            COLEÇÃO COMPLETA
          </motion.span>

          <motion.img
            src={logoLendas}
            alt="FutLendas"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: [1, 1.05, 1],
              filter: [
                'drop-shadow(0 0 6px rgba(251,191,36,0.35))',
                'drop-shadow(0 0 20px rgba(251,191,36,0.65))',
                'drop-shadow(0 0 6px rgba(251,191,36,0.35))',
              ],
            }}
            transition={{
              opacity: { delay: 0.45 },
              scale: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
              filter: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="mt-8 h-36 w-36 sm:h-44 sm:w-44 object-contain"
          />
        </div>

        {/* Metade direita — arte hero */}
        <div className="relative flex-1 min-h-[300px] md:min-h-0 bg-black">
          <img
            src={capaHero}
            alt="FutLendas — Coleção"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <motion.div
            aria-hidden
            animate={{ opacity: [0.0, 0.35, 0.0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-gradient-to-t from-cyan-400/30 via-transparent to-transparent mix-blend-screen pointer-events-none"
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // AGRADECIMENTO
  // ============================================================
  if (pagina.tipo === 'agradecimento') {
    return (
      <div className={cn('w-full flex flex-col items-center justify-center text-center px-8 py-12', ALTURA_PAGINA)}>
        <img src={logoLendas} alt="" className="h-20 w-20 object-contain mb-5 opacity-80" />
        <h2 className="font-black leading-tight">
          <span className="block text-3xl sm:text-5xl lg:text-6xl text-white">{pagina.titulo}</span>
          {pagina.subtitulo && (
            <span
              className="block text-xl sm:text-3xl lg:text-4xl mt-1"
              style={{ color: pagina.subtitulo_cor ?? '#FFC400' }}
            >
              {pagina.subtitulo}
            </span>
          )}
        </h2>
        {pagina.texto && (
          <p className="mt-6 max-w-md text-sm sm:text-base lg:text-lg text-cyan-100/70 leading-relaxed">
            {pagina.texto}
          </p>
        )}
      </div>
    );
  }

  // ============================================================
  // NARRATIVA — pagina dupla (texto a esquerda, foto a direita)
  // Fiel ao Figma da pagina "O Comeco de Tudo".
  // ============================================================
  if (pagina.tipo === 'narrativa') {
    const temFoto = pagina.numero === 2; // pagina "O comeco de tudo"

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        {/* lombada central */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* ---- Pagina esquerda: cabecalho + narrativa ---- */}
        <div className="px-6 sm:px-8 py-7 flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <MiniHeaderIdentidade />
            {/* Titulo da secao */}
            <div className="text-right">
              <h2 className="font-black italic leading-[0.85] tracking-tight">
                <span className="block text-2xl sm:text-4xl lg:text-5xl text-white">
                  {pagina.titulo}
                </span>
                {pagina.subtitulo && (
                  <span
                    className="block text-2xl sm:text-4xl lg:text-5xl"
                    style={{ color: pagina.subtitulo_cor ?? '#00C46A' }}
                  >
                    {pagina.subtitulo}
                  </span>
                )}
              </h2>
              <div className="mt-1.5 flex items-center justify-end gap-2">
                {pagina.data_referencia && (
                  <span className="text-[9px] tracking-widest text-white/40 uppercase">
                    {pagina.data_referencia}
                  </span>
                )}
                {pagina.tag && (
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-black"
                    style={{ background: pagina.subtitulo_cor ?? '#00C46A' }}
                  >
                    {pagina.tag}
                  </span>
                )}
              </div>
            </div>
          </div>

          {pagina.texto && (
            <p className="mt-6 text-xs sm:text-sm lg:text-base text-cyan-100/75 leading-relaxed whitespace-pre-line">
              {pagina.texto}
            </p>
          )}
        </div>

        {/* ---- Pagina direita: logo + foto historica ---- */}
        <div className="relative px-6 sm:px-8 py-7 flex flex-col">
          <div className="flex justify-end">
            <LogoCanto />
          </div>

          {temFoto && (
            <div className="flex-1 flex items-center justify-center py-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="rounded-lg border-2 border-amber-400/50 overflow-hidden shadow-[0_0_36px_-6px_rgba(251,191,36,0.45)] w-full max-w-2xl"
              >
                {/* a foto = duas metades lado a lado (viram 2 figurinhas) */}
                <div className="flex">
                  <img src={fotoAmigos1} alt="Os amigos — começo" className="w-1/2 object-cover" />
                  <img src={fotoAmigos2} alt="Os amigos — começo" className="w-1/2 object-cover" />
                </div>
              </motion.div>
            </div>
          )}

          {/* figurinhas extras desta pagina, se houver */}
          {!temFoto && figsOrdenadas.length > 0 && (
            <div className="flex-1 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 justify-items-center content-start">
              {figsOrdenadas.map((fig) => (
                <Figurinha
                  key={fig.id}
                  figurinha={fig}
                  tamanho="md"
                  onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // DEMAIS (rede, numeros, copa, campeonato, escudos)
  // Layout generico: cabecalho + texto a esquerda, grid a direita.
  // (refinamento fiel ao Figma vem nas proximas iteracoes)
  // ============================================================
  return (
    <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
      <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

      {/* Esquerda — cabecalho + texto */}
      <div className="px-6 sm:px-8 py-7 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <MiniHeaderIdentidade />
        </div>
        <header className="mt-5">
          {pagina.tag && (
            <span
              className="inline-block mb-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase text-black"
              style={{ background: pagina.subtitulo_cor ?? '#22d3ee' }}
            >
              {pagina.tag}
            </span>
          )}
          <h2 className="font-black italic leading-[0.88] tracking-tight">
            <span className="block text-2xl sm:text-4xl lg:text-5xl text-white">{pagina.titulo}</span>
            {pagina.subtitulo && (
              <span
                className="block text-xl sm:text-3xl lg:text-4xl"
                style={{ color: pagina.subtitulo_cor ?? '#FFFFFF' }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </h2>
          {pagina.data_referencia && (
            <p className="mt-1 text-[10px] tracking-widest text-cyan-100/40 uppercase">
              {pagina.data_referencia}
            </p>
          )}
        </header>
        {pagina.texto && (
          <p className="mt-4 text-xs sm:text-sm lg:text-base text-cyan-100/70 leading-relaxed whitespace-pre-line">
            {pagina.texto}
          </p>
        )}
      </div>

      {/* Direita — logo + grid de figurinhas */}
      <div className="px-6 sm:px-8 py-7 flex flex-col">
        <div className="flex justify-end mb-3">
          <LogoCanto />
        </div>
        {figsOrdenadas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 justify-items-center content-start">
            {figsOrdenadas.map((fig) => (
              <Figurinha
                key={fig.id}
                figurinha={fig}
                tamanho="md"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-cyan-100/30 text-sm italic">
              Figurinhas desta página em breve
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
