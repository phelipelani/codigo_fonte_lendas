// Arquivo: src/features/album/components/PaginaAlbum.tsx
//
// Renderiza UMA pagina do album conforme o tipo.
// v1: layouts essenciais (capa, narrativa, grid de figurinhas,
// agradecimento). Layouts ricos (bracket de copa, arvore da rede)
// ficam para v2 — por ora cada pagina mostra cabecalho + texto +
// grid das figurinhas associadas.

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Figurinha } from './Figurinha';
import type { Pagina, Figurinha as FigurinhaType } from '../api/albumApi';

type PaginaAlbumProps = {
  pagina: Pagina;
  figurinhas: FigurinhaType[]; // figurinhas DESTA pagina
  onFigurinhaClick?: (fig: FigurinhaType) => void;
};

export const PaginaAlbum: React.FC<PaginaAlbumProps> = ({
  pagina,
  figurinhas,
  onFigurinhaClick,
}) => {
  const figsOrdenadas = [...figurinhas].sort(
    (a, b) => (a.slot ?? 999) - (b.slot ?? 999)
  );

  // ---------------- CAPA ----------------
  if (pagina.tipo === 'capa') {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center text-center px-6 py-10">
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] sm:text-xs tracking-[0.4em] text-cyan-300/60 font-semibold mb-3"
        >
          ÁLBUM OFICIAL
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="font-black leading-[0.85] tracking-tight"
        >
          <span className="block text-5xl sm:text-6xl md:text-7xl text-white">FUT</span>
          <span className="block text-5xl sm:text-6xl md:text-7xl text-amber-400">
            LENDAS
          </span>
        </motion.h1>

        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-xs sm:text-sm tracking-[0.3em] text-amber-200/70 font-semibold"
        >
          {pagina.subtitulo ?? 'COLEÇÃO COMPLETA'}
        </motion.span>

        {/* Logo redondo animado (pulse + glow) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: 1,
            scale: [1, 1.06, 1],
            filter: [
              'drop-shadow(0 0 8px rgba(251,191,36,0.4))',
              'drop-shadow(0 0 22px rgba(251,191,36,0.7))',
              'drop-shadow(0 0 8px rgba(251,191,36,0.4))',
            ],
          }}
          transition={{
            opacity: { delay: 0.4 },
            scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
            filter: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="mt-8 h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-amber-400 bg-[#0a1628] flex items-center justify-center"
        >
          <span className="font-black text-amber-400 text-lg leading-none text-center">
            FUT
            <br />
            LENDAS
          </span>
        </motion.div>
      </div>
    );
  }

  // ---------------- AGRADECIMENTO ----------------
  if (pagina.tipo === 'agradecimento') {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center px-8 py-10">
        <h2 className="font-black leading-tight">
          <span className="block text-4xl sm:text-5xl text-white">{pagina.titulo}</span>
          {pagina.subtitulo && (
            <span
              className="block text-2xl sm:text-3xl mt-1"
              style={{ color: pagina.subtitulo_cor ?? '#FFC400' }}
            >
              {pagina.subtitulo}
            </span>
          )}
        </h2>
        {pagina.texto && (
          <p className="mt-6 max-w-md text-sm sm:text-base text-cyan-100/70 leading-relaxed">
            {pagina.texto}
          </p>
        )}
      </div>
    );
  }

  // ---------------- DEMAIS (narrativa, rede, numeros, copa, campeonato, escudos) ----------------
  return (
    <div className="h-full w-full flex flex-col px-5 sm:px-7 py-6 overflow-y-auto">
      {/* Cabecalho */}
      <header className="mb-4">
        {pagina.tag && (
          <span className="inline-block mb-2 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
            {pagina.tag}
          </span>
        )}
        <h2 className="font-black leading-[0.9] tracking-tight">
          <span className="block text-2xl sm:text-3xl md:text-4xl text-white">
            {pagina.titulo}
          </span>
          {pagina.subtitulo && (
            <span
              className="block text-xl sm:text-2xl md:text-3xl"
              style={{ color: pagina.subtitulo_cor ?? '#FFFFFF' }}
            >
              {pagina.subtitulo}
            </span>
          )}
        </h2>
        {pagina.data_referencia && (
          <p className="mt-1 text-[11px] tracking-widest text-cyan-100/40 uppercase">
            {pagina.data_referencia}
          </p>
        )}
      </header>

      {/* Texto narrativo */}
      {pagina.texto && (
        <p className="text-xs sm:text-sm text-cyan-100/70 leading-relaxed whitespace-pre-line mb-5">
          {pagina.texto}
        </p>
      )}

      {/* Grid de figurinhas desta pagina */}
      {figsOrdenadas.length > 0 && (
        <div
          className={cn(
            'mt-auto grid gap-2.5 sm:gap-3 justify-items-center',
            'grid-cols-3 sm:grid-cols-4'
          )}
        >
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
  );
};
