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
import capaHero from '../assets/capa-hero.png';
import logoLendas from '@/assets/Logo.webp';
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
      <div className="relative h-full w-full flex flex-col md:flex-row bg-black overflow-hidden">
        {/* ===== Metade esquerda — preta com a identidade ===== */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-10 md:py-12">
          {/* ALBUM OFICIAL com tracinhos */}
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

          {/* FUT / LENDAS */}
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

          {/* COLECAO COMPLETA */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 text-[11px] sm:text-sm tracking-[0.42em] text-white/45 font-semibold"
          >
            COLEÇÃO COMPLETA
          </motion.span>

          {/* Logo redondo animado (pulse + glow) */}
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
            className="mt-8 h-24 w-24 sm:h-28 sm:w-28 object-contain"
          />
        </div>

        {/* ===== Metade direita — arte hero ===== */}
        <div className="relative flex-1 min-h-[260px] md:min-h-0">
          <img
            src={capaHero}
            alt="FutLendas — Coleção"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* brilho pulsante sobre o raio da arte */}
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
