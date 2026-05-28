// Arquivo: src/features/album/components/PaginaAlbum.tsx
//
// Versao DESKTOP do album — renderiza UMA pagina do album como spread
// de 2 colunas com a "lombada" no meio, fiel ao design do Figma.
//
// Para a versao MOBILE (coluna unica, telas separadas) ver TelaAlbum.tsx.

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Figurinha } from './Figurinha';
import type { Pagina, Figurinha as FigurinhaType } from '../api/albumApi';
import capaHero from '../assets/capa-hero.png';
import logoLendas from '@/assets/Logo.webp';
import fotoAmigos1 from '../assets/image_1.png';
import fotoAmigos2 from '../assets/image_2.png';
import paginaRede from '../assets/pagina-03-rede.png';

type PaginaAlbumProps = {
  pagina: Pagina;
  figurinhas: FigurinhaType[];
  onFigurinhaClick?: (fig: FigurinhaType) => void;
};

// Toda pagina preenche a altura fixa do livro (definida no AlbumPage).
const ALTURA_PAGINA = 'h-full';

// Interpreta o texto de copa/campeonato em secoes.
// Formato: "## Titulo" inicia secao; [[PILL]] vira badge; [[DESTAQUE]] frase.
type SecaoNarrativa = {
  titulo: string;
  texto: string;
  pills: string[];
  destaque: string | null;
};

function parseSecoes(texto: string): SecaoNarrativa[] {
  return texto
    .split(/^## /m)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((bloco) => {
      const linhas = bloco.split('\n');
      const titulo = (linhas[0] ?? '').trim();
      const pills: string[] = [];
      let destaque: string | null = null;
      const corpo: string[] = [];
      for (const l of linhas.slice(1)) {
        const lt = l.trim();
        if (lt.startsWith('[[PILL]]'))
          pills.push(lt.replace('[[PILL]]', '').trim());
        else if (lt.startsWith('[[DESTAQUE]]'))
          destaque = lt.replace('[[DESTAQUE]]', '').trim();
        else corpo.push(l);
      }
      return { titulo, texto: corpo.join('\n').trim(), pills, destaque };
    });
}

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
  // AGRADECIMENTO — ultima pagina, encerramento epico (sem figurinhas)
  // ============================================================
  if (pagina.tipo === 'agradecimento') {
    return (
      <div
        className={cn(
          'relative w-full flex flex-col items-center justify-center text-center px-8 py-12 overflow-hidden',
          ALTURA_PAGINA
        )}
      >
        {/* Camada 1 — arte da capa, bem sutil ao fundo */}
        <img
          src={capaHero}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-[0.12] blur-sm scale-110"
        />
        {/* Camada 2 — brilho dourado central */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_40%,rgba(251,191,36,0.16)_0%,transparent_70%)]"
        />
        {/* Camada 3 — vinheta escura nas bordas */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.65)_100%)]"
        />

        {/* ===== Conteudo ===== */}
        <div className="relative z-10 flex flex-col items-center max-w-lg">
          {/* Logo com glow pulsante */}
          <motion.img
            src={logoLendas}
            alt="FutLendas"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{
              opacity: 1,
              scale: [1, 1.05, 1],
              filter: [
                'drop-shadow(0 0 10px rgba(251,191,36,0.4))',
                'drop-shadow(0 0 26px rgba(251,191,36,0.75))',
                'drop-shadow(0 0 10px rgba(251,191,36,0.4))',
              ],
            }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              filter: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="h-28 w-28 sm:h-36 sm:w-36 object-contain"
          />

          {/* Estrelas decorativas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex items-center gap-2 text-amber-400/80"
          >
            <span className="h-px w-8 bg-amber-400/40" />
            <span className="text-sm">★ ★ ★</span>
            <span className="h-px w-8 bg-amber-400/40" />
          </motion.div>

          {/* OBRIGADO / POR FAZER PARTE */}
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 font-black leading-[0.9] tracking-tight"
          >
            <span className="block text-4xl sm:text-6xl lg:text-7xl text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {pagina.titulo}
            </span>
            {pagina.subtitulo && (
              <span
                className="block text-2xl sm:text-4xl lg:text-5xl mt-1 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                style={{ color: pagina.subtitulo_cor ?? '#FFC400' }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </motion.h2>

          {/* Divisoria com losango */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex items-center gap-2"
          >
            <span className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-amber-400/60" />
            <span className="h-2 w-2 rotate-45 bg-amber-400" />
            <span className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-amber-400/60" />
          </motion.div>

          {/* Texto de agradecimento */}
          {pagina.texto && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-sm sm:text-base lg:text-lg text-cyan-100/80 leading-relaxed"
            >
              {pagina.texto}
            </motion.p>
          )}

          {/* Rodape */}
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-8 text-[10px] sm:text-xs tracking-[0.35em] text-amber-200/40 font-semibold uppercase"
          >
            Álbum Oficial · Coleção Completa
          </motion.span>
        </div>
      </div>
    );
  }

  // ============================================================
  // CAMPEONATOS-INTRO — pagina 5 "Por que comecamos os campeonatos?"
  // 2 colunas de texto + figurinha larga (2 slots) na direita.
  // ============================================================
  if (pagina.tipo === 'narrativa' && pagina.numero === 5) {
    const partes = (pagina.texto ?? '').split('[[DIR]]');
    const textoEsq = partes[0]?.trim() ?? '';
    const textoDir = partes[1]?.trim() ?? '';

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — titulo + texto */}
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col overflow-y-auto">
          <h2 className="font-black text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
            {pagina.titulo}
          </h2>
          <p className="mt-4 text-xs sm:text-sm lg:text-base text-cyan-100/75 leading-relaxed whitespace-pre-line">
            {textoEsq}
          </p>
        </div>

        {/* Direita — logo + texto + figurinha larga (2 slots) */}
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col overflow-y-auto">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          <p className="mt-2 text-xs sm:text-sm lg:text-base text-cyan-100/75 leading-relaxed whitespace-pre-line">
            {textoDir}
          </p>
          {figsOrdenadas.length > 0 && (
            <div className="mt-4 shrink-0 grid grid-cols-2 gap-1.5">
              {figsOrdenadas.slice(0, 2).map((fig) => (
                <div key={fig.id} className="h-[150px] sm:h-[190px]">
                  <Figurinha
                    figurinha={fig}
                    tamanho="cell"
                    onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
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
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col overflow-y-auto">
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
  // NUMEROS — "Os Numeros da Lenda"
  // Esquerda: header + texto. Direita: logo + grid 3x3 de stats.
  // ============================================================
  if (pagina.tipo === 'numeros') {
    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — header + texto */}
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col overflow-y-auto">
          <header>
            <h2 className="font-black italic leading-[0.85] tracking-tight">
              <span className="block text-2xl sm:text-4xl lg:text-5xl text-white">
                {pagina.titulo}
              </span>
              {pagina.subtitulo && (
                <span
                  className="block text-2xl sm:text-4xl lg:text-5xl"
                  style={{ color: pagina.subtitulo_cor ?? '#FFC400' }}
                >
                  {pagina.subtitulo}
                </span>
              )}
            </h2>
            {pagina.tag && (
              <span
                className="inline-block mt-2 px-2 py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-black"
                style={{ background: pagina.subtitulo_cor ?? '#FFC400' }}
              >
                {pagina.tag}
              </span>
            )}
          </header>
          {pagina.texto && (
            <p className="mt-5 text-xs sm:text-sm lg:text-base text-cyan-100/75 leading-relaxed whitespace-pre-line">
              {pagina.texto}
            </p>
          )}
        </div>

        {/* Direita — logo + grid 3x3 das estatisticas */}
        <div className="h-full px-5 sm:px-7 py-6 flex flex-col">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          <div className="flex-1 min-h-0 mt-3 grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3">
            {figsOrdenadas.map((fig) => (
              <Figurinha
                key={fig.id}
                figurinha={fig}
                tamanho="cell"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // REDE — "A Rede que Cresceu"
  // Esquerda: imagem do fluxograma + 5 figurinhas embaixo.
  // Direita: logo + grid das demais figurinhas.
  // ============================================================
  if (pagina.tipo === 'rede') {
    const primeiros5 = figsOrdenadas.slice(0, 5);
    const restante = figsOrdenadas.slice(5);

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — imagem do fluxograma (encolhe) + 5 figurinhas embaixo */}
        <div className="h-full px-4 sm:px-6 py-5 flex flex-col">
          <img
            src={paginaRede}
            alt={pagina.titulo ?? 'A Rede que Cresceu'}
            className="flex-1 min-h-0 w-full object-contain rounded-lg"
          />
          {primeiros5.length > 0 && (
            <div className="shrink-0 mt-2 grid grid-cols-5 gap-1.5 h-[92px] sm:h-[116px] lg:h-[140px]">
              {primeiros5.map((fig) => (
                <Figurinha
                  key={fig.id}
                  figurinha={fig}
                  tamanho="cell"
                  onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direita — grid 5 colunas x 6 linhas preenchendo a altura */}
        <div className="h-full px-4 sm:px-6 py-5">
          <div className="h-full grid grid-cols-5 grid-rows-6 gap-1.5">
            {restante.slice(0, 4).map((fig) => (
              <Figurinha
                key={fig.id}
                figurinha={fig}
                tamanho="cell"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
              />
            ))}
            {/* logo no lugar da 5a figurinha da 1a linha */}
            <div className="flex items-center justify-center">
              <img
                src={logoLendas}
                alt="FutLendas"
                className="max-h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
              />
            </div>
            {restante.slice(4).map((fig) => (
              <Figurinha
                key={fig.id}
                figurinha={fig}
                tamanho="cell"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // COPA — "1a/2a/3a Copa Fut Lendas"
  // Esquerda: header + secoes narrativas + figurinha do chaveamento.
  // Direita: logo + figurinha grande do campeao + grid 3x2 de etiquetas.
  // ============================================================
  if (pagina.tipo === 'copa') {
    const campeao = figsOrdenadas.find((f) => (f.slot ?? 0) === 1);
    const etiquetas = figsOrdenadas.filter(
      (f) => (f.slot ?? 0) >= 2 && (f.slot ?? 0) <= 7
    );
    const chaveamento = figsOrdenadas.filter((f) => (f.slot ?? 0) >= 8);
    const secoes = parseSecoes(pagina.texto ?? '');
    const cor = pagina.subtitulo_cor ?? '#FFC400';

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — header + secoes + chaveamento */}
        <div className="h-full px-6 sm:px-8 py-6 flex flex-col overflow-y-auto">
          <span className="text-[8px] tracking-[0.3em] text-cyan-100/40 font-semibold uppercase">
            Fut Lendas · Edição Histórica · Copa
          </span>
          <h2 className="mt-1 font-black italic leading-[0.82] tracking-tight">
            <span className="block text-3xl sm:text-4xl lg:text-5xl text-white">
              {pagina.titulo}
            </span>
            {pagina.subtitulo && (
              <span
                className="block text-3xl sm:text-4xl lg:text-5xl"
                style={{ color: cor }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {pagina.data_referencia && (
              <span className="text-[9px] text-white/40 uppercase tracking-widest">
                {pagina.data_referencia}
              </span>
            )}
            {pagina.tag && (
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-black"
                style={{ background: cor }}
              >
                {pagina.tag}
              </span>
            )}
          </div>

          <span className="mt-4 text-[9px] tracking-[0.25em] text-cyan-100/40 uppercase font-semibold">
            A história por trás do título
          </span>

          <div className="mt-2 space-y-2.5">
            {secoes.map((sec, i) => (
              <div key={i}>
                <h3
                  className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-wide border-b border-white/10 pb-1"
                  style={{ color: cor }}
                >
                  {sec.titulo}
                </h3>
                {sec.texto && (
                  <p className="mt-1 text-[11px] sm:text-xs lg:text-sm text-cyan-100/70 leading-relaxed">
                    {sec.texto}
                  </p>
                )}
                {sec.pills.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {sec.pills.map((p, j) => (
                      <span
                        key={j}
                        className="inline-block px-2.5 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-[10px] text-amber-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                {sec.destaque && (
                  <p
                    className="mt-2 border-l-2 pl-3 italic text-[11px] sm:text-xs text-amber-100/85"
                    style={{ borderColor: cor }}
                  >
                    {sec.destaque}
                  </p>
                )}
              </div>
            ))}
          </div>

          {chaveamento.length > 0 && (
            <div className="mt-3 shrink-0">
              <span className="text-[9px] tracking-widest text-cyan-100/40 uppercase">
                Chaveamento
              </span>
              <div className="mt-1 grid grid-cols-2 gap-1.5">
                {chaveamento.map((fig) => (
                  <div key={fig.id} className="h-[92px] sm:h-[112px]">
                    <Figurinha
                      figurinha={fig}
                      tamanho="cell"
                      onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direita — logo + campeao grande + 6 etiquetas */}
        <div className="h-full px-5 sm:px-7 py-6 flex flex-col">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          {campeao && (
            <div className="mt-2 shrink-0 h-[200px] sm:h-[244px]">
              <Figurinha
                figurinha={campeao}
                tamanho="cell"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(campeao) : undefined}
              />
            </div>
          )}
          {etiquetas.length > 0 && (
            <div className="mt-2 flex-1 min-h-0 grid grid-cols-3 grid-rows-2 gap-2">
              {etiquetas.map((fig) => (
                <Figurinha
                  key={fig.id}
                  figurinha={fig}
                  tamanho="cell"
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
  // CAMPEONATO — "1o/2o/3o Campeonato Pontos Corridos"
  // Esquerda: header + texto corrido + 3 figurinhas de destaque.
  // Direita: logo + Time Campeao grande + grid 3x2 (6 jogadores).
  // ============================================================
  if (pagina.tipo === 'campeonato') {
    const campeao = figsOrdenadas.find((f) => (f.slot ?? 0) === 1);
    const jogadores = figsOrdenadas.filter(
      (f) => (f.slot ?? 0) >= 2 && (f.slot ?? 0) <= 7
    );
    const destaques = figsOrdenadas.filter((f) => (f.slot ?? 0) >= 8);
    const cor = pagina.subtitulo_cor ?? '#A855F7';

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — header + texto (scroll) + 3 figurinhas de destaque */}
        <div className="h-full px-6 sm:px-8 py-6 flex flex-col overflow-y-auto">
          <span className="text-[8px] tracking-[0.3em] text-cyan-100/40 font-semibold uppercase">
            Fut Lendas · Pontos Corridos
          </span>
          <h2 className="mt-1 font-black italic leading-[0.82] tracking-tight">
            <span className="block text-2xl sm:text-4xl lg:text-5xl text-white">
              {pagina.titulo}
            </span>
            {pagina.subtitulo && (
              <span
                className="block text-2xl sm:text-4xl lg:text-5xl"
                style={{ color: cor }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {pagina.data_referencia && (
              <span className="text-[9px] text-white/40 uppercase tracking-widest">
                {pagina.data_referencia}
              </span>
            )}
            {pagina.tag &&
              pagina.tag.split('|').map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ background: cor }}
                >
                  {t.trim()}
                </span>
              ))}
          </div>

          {pagina.texto && (
            <p className="mt-4 text-[11px] sm:text-xs lg:text-sm text-cyan-100/75 leading-relaxed whitespace-pre-line">
              {pagina.texto}
            </p>
          )}

          {destaques.length > 0 && (
            <div className="mt-4 shrink-0">
              <span className="text-[9px] tracking-widest text-cyan-100/40 uppercase">
                Destaques do campeonato
              </span>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {destaques.map((fig) => (
                  <div key={fig.id} className="h-[120px] sm:h-[150px]">
                    <Figurinha
                      figurinha={fig}
                      tamanho="cell"
                      onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Direita — logo + campeao grande + 6 jogadores */}
        <div className="h-full px-5 sm:px-7 py-6 flex flex-col">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          {campeao && (
            <div className="mt-2 shrink-0 h-[200px] sm:h-[244px]">
              <Figurinha
                figurinha={campeao}
                tamanho="cell"
                onClick={onFigurinhaClick ? () => onFigurinhaClick(campeao) : undefined}
              />
            </div>
          )}
          {jogadores.length > 0 && (
            <div className="mt-2 flex-1 min-h-0 grid grid-cols-3 grid-rows-2 gap-2">
              {jogadores.map((fig) => (
                <Figurinha
                  key={fig.id}
                  figurinha={fig}
                  tamanho="cell"
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
  // ELENCO — "Elencos que disputaram a Nª edição"
  // Esquerda: header + Time A + Time B (2 cards).
  // Direita: logo + Time C + Time D (2 cards).
  // Cada time tem 7 figurinhas (Logo + Capitao lendarias + 5 jogadores).
  // ============================================================
  if (pagina.tipo === 'elenco') {
    const cor = pagina.subtitulo_cor ?? '#A855F7';
    const times = [
      { titulo: 'Time A', figs: figsOrdenadas.filter((f) => (f.slot ?? 0) >= 1 && (f.slot ?? 0) <= 7) },
      { titulo: 'Time B', figs: figsOrdenadas.filter((f) => (f.slot ?? 0) >= 8 && (f.slot ?? 0) <= 14) },
      { titulo: 'Time C', figs: figsOrdenadas.filter((f) => (f.slot ?? 0) >= 15 && (f.slot ?? 0) <= 21) },
      { titulo: 'Time D', figs: figsOrdenadas.filter((f) => (f.slot ?? 0) >= 22 && (f.slot ?? 0) <= 28) },
    ];

    const TimeCard: React.FC<{ titulo: string; figs: FigurinhaType[] }> = ({ titulo, figs }) => (
      <div className="rounded-xl border border-cyan-400/20 bg-black/30 p-2.5 sm:p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">
            {titulo}
          </span>
          <span
            className="text-[8px] font-bold uppercase tracking-widest text-black px-1.5 py-0.5 rounded"
            style={{ background: cor }}
          >
            ★ Logo + Capitão
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {figs.map((fig) => (
            <Figurinha
              key={fig.id}
              figurinha={fig}
              tamanho="fluid"
              onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
            />
          ))}
          {Array.from({ length: Math.max(0, 8 - figs.length) }).map((_, i) => (
            <div
              key={'vazio-' + i}
              className="aspect-[114/155] rounded-lg border border-dashed border-white/5"
            />
          ))}
        </div>
      </div>
    );

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — header + Time A + Time B */}
        <div className="h-full px-5 sm:px-7 py-6 flex flex-col gap-3 overflow-y-auto">
          <header>
            <span className="text-[8px] tracking-[0.3em] text-cyan-100/40 font-semibold uppercase">
              Fut Lendas · Elencos
            </span>
            <h2 className="mt-1 font-black italic leading-[0.85] tracking-tight">
              <span className="block text-xl sm:text-2xl lg:text-3xl text-white">
                {pagina.titulo}
              </span>
              {pagina.subtitulo && (
                <span
                  className="block text-xl sm:text-2xl lg:text-3xl"
                  style={{ color: cor }}
                >
                  {pagina.subtitulo}
                </span>
              )}
            </h2>
          </header>
          <TimeCard titulo={times[0].titulo} figs={times[0].figs} />
          <TimeCard titulo={times[1].titulo} figs={times[1].figs} />
        </div>

        {/* Direita — logo + Time C + Time D */}
        <div className="h-full px-5 sm:px-7 py-6 flex flex-col gap-3 overflow-y-auto">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          <TimeCard titulo={times[2].titulo} figs={times[2].figs} />
          <TimeCard titulo={times[3].titulo} figs={times[3].figs} />
        </div>
      </div>
    );
  }

  // ============================================================
  // ESCUDOS — "Escudos dos Times"
  // Esquerda: titulo + grid 3x3 dos 9 escudos.
  // Direita: logo + texto+foto (1) + texto+foto (2). Cada foto = 2 slots.
  // ============================================================
  if (pagina.tipo === 'escudos') {
    const partes = (pagina.texto ?? '').split('[[DIR]]');
    const texto1 = partes[0]?.trim() ?? '';
    const texto2 = partes[1]?.trim() ?? '';
    const escudos = figsOrdenadas.filter(
      (f) => (f.slot ?? 0) >= 1 && (f.slot ?? 0) <= 9
    );
    const foto1 = figsOrdenadas.filter(
      (f) => (f.slot ?? 0) >= 10 && (f.slot ?? 0) <= 11
    );
    const foto2 = figsOrdenadas.filter((f) => (f.slot ?? 0) >= 12);

    return (
      <div className={cn('relative w-full grid grid-cols-1 md:grid-cols-2', ALTURA_PAGINA)}>
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" />

        {/* Esquerda — titulo + grid de escudos */}
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col">
          <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl text-white/90 leading-[0.95]">
            {pagina.titulo}
          </h2>
          {escudos.length > 0 && (
            <div className="mt-5 flex-1 min-h-0 grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3">
              {escudos.map((fig) => (
                <Figurinha
                  key={fig.id}
                  figurinha={fig}
                  tamanho="cell"
                  onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direita — logo + textos + fotos (cada foto = 2 slots) */}
        <div className="h-full px-6 sm:px-8 py-7 flex flex-col overflow-y-auto">
          <div className="flex justify-end shrink-0">
            <LogoCanto />
          </div>
          {texto1 && (
            <p className="mt-1 text-xs sm:text-sm lg:text-base text-cyan-100/80 leading-relaxed">
              {texto1}
            </p>
          )}
          {foto1.length > 0 && (
            <div className="mt-2 shrink-0 grid grid-cols-2 gap-1.5">
              {foto1.map((fig) => (
                <div key={fig.id} className="h-[130px] sm:h-[160px]">
                  <Figurinha
                    figurinha={fig}
                    tamanho="cell"
                    onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
          {texto2 && (
            <p className="mt-4 text-xs sm:text-sm lg:text-base text-cyan-100/80 leading-relaxed">
              {texto2}
            </p>
          )}
          {foto2.length > 0 && (
            <div className="mt-2 shrink-0 grid grid-cols-2 gap-1.5">
              {foto2.map((fig) => (
                <div key={fig.id} className="h-[130px] sm:h-[160px]">
                  <Figurinha
                    figurinha={fig}
                    tamanho="cell"
                    onClick={onFigurinhaClick ? () => onFigurinhaClick(fig) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // DEMAIS (fallback generico)
  // Layout generico: cabecalho + texto a esquerda, grid a direita.
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
