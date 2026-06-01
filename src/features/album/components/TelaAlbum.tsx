// Arquivo: src/features/album/components/TelaAlbum.tsx
//
// Versao MOBILE do album — uma tela por vez, coluna unica.
// Cada "spread" antigo (2 paginas) vira 2 telas, pra nada ficar
// espremido em tela pequena.

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Figurinha } from './Figurinha';
import { FotoDividida } from './FotoDividida';
import { FotoQuadripartida } from './FotoQuadripartida';
import type { Pagina, Figurinha as FigurinhaType } from '../api/albumApi';
import capaHero from '../assets/capa-hero.png';
import logoLendas from '@/assets/Logo.webp';
import fotoAmigos1 from '../assets/image_1.png';
import fotoAmigos2 from '../assets/image_2.png';
import paginaRede from '../assets/pagina-03-rede.png';

// =============================================================
// Modelo de "tela": cada pagina do album vira 1 ou 2 telas.
// =============================================================
export type Parte =
  | 'capa'
  | 'fim'
  | 'n-texto'
  | 'n-foto'
  | 'n5-esq'
  | 'n5-dir'
  | 'num-texto'
  | 'num-grid'
  | 'rede-img'
  | 'rede-grid'
  | 'copa-texto'
  | 'copa-figs'
  | 'camp-texto'
  | 'camp-figs'
  | 'esc-grid'
  | 'esc-fotos'
  | 'elenco-ab'
  | 'elenco-cd'
  | 'generico';

/** Quais telas uma pagina gera. */
export function partesDaPagina(p: Pagina): Parte[] {
  switch (p.tipo) {
    case 'capa':
      return ['capa'];
    case 'agradecimento':
      return ['fim'];
    case 'numeros':
      return ['num-texto', 'num-grid'];
    case 'rede':
      return ['rede-img', 'rede-grid'];
    case 'copa':
      return ['copa-texto', 'copa-figs'];
    case 'campeonato':
      return ['camp-texto', 'camp-figs'];
    case 'elenco':
      return ['elenco-ab', 'elenco-cd'];
    case 'escudos':
      return ['esc-grid', 'esc-fotos'];
    case 'narrativa':
      if (p.numero === 5) return ['n5-esq', 'n5-dir'];
      if (p.numero === 2) return ['n-texto', 'n-foto'];
      return ['n-texto'];
    default:
      return ['generico'];
  }
}

/** Rotulo curto da parte (mostrado na navegacao). */
export function rotuloParte(parte: Parte): string {
  switch (parte) {
    case 'num-grid':
    case 'rede-grid':
    case 'copa-figs':
    case 'camp-figs':
      return 'Figurinhas';
    case 'esc-grid':
      return 'Escudos';
    case 'esc-fotos':
    case 'n-foto':
      return 'Fotos';
    case 'n5-dir':
      return 'Continuação';
    case 'elenco-ab':
      return 'Times A e B';
    case 'elenco-cd':
      return 'Times C e D';
    default:
      return 'História';
  }
}

// =============================================================
// Helpers de conteudo
// =============================================================
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
        if (lt.startsWith('[[PILL]]')) pills.push(lt.replace('[[PILL]]', '').trim());
        else if (lt.startsWith('[[DESTAQUE]]'))
          destaque = lt.replace('[[DESTAQUE]]', '').trim();
        else corpo.push(l);
      }
      return { titulo, texto: corpo.join('\n').trim(), pills, destaque };
    });
}

const COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

// =============================================================
// Sub-componentes
// =============================================================
const CabecalhoTela: React.FC<{
  titulo: string;
  subtitulo?: string | null;
  cor?: string | null;
  tag?: string | null;
  data?: string | null;
}> = ({ titulo, subtitulo, cor, tag, data }) => (
  <header className="mb-1">
    <div className="flex items-center gap-1.5">
      <span className="h-px w-4 bg-amber-400/50" />
      <span className="text-[8px] tracking-[0.3em] text-white/40 font-semibold uppercase">
        Álbum Oficial
      </span>
    </div>
    <h2 className="mt-1 font-black italic leading-[0.86] tracking-tight">
      <span className="block text-2xl sm:text-3xl text-white">{titulo}</span>
      {subtitulo && (
        <span
          className="block text-2xl sm:text-3xl"
          style={{ color: cor ?? '#FFC400' }}
        >
          {subtitulo}
        </span>
      )}
    </h2>
    {(data || tag) && (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {data && (
          <span className="text-[9px] tracking-widest text-white/40 uppercase">
            {data}
          </span>
        )}
        {tag &&
          tag.split('|').map((t, i) => (
            <span
              key={i}
              className="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black"
              style={{ background: cor ?? '#FFC400' }}
            >
              {t.trim()}
            </span>
          ))}
      </div>
    )}
  </header>
);

const GridFigs: React.FC<{
  figs: FigurinhaType[];
  cols: number;
  onClick?: (f: FigurinhaType) => void;
}> = ({ figs, cols, onClick }) => (
  <div className={cn('grid gap-2', COLS[cols] ?? 'grid-cols-3')}>
    {figs.map((f) => (
      <Figurinha
        key={f.id}
        figurinha={f}
        tamanho="fluid"
        onClick={onClick ? () => onClick(f) : undefined}
      />
    ))}
  </div>
);

const RotuloSecao: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300/70">
    {children}
  </span>
);

// =============================================================
// Componente principal — renderiza UMA tela (coluna unica)
// =============================================================
type TelaAlbumProps = {
  pagina: Pagina;
  figurinhas: FigurinhaType[];
  parte: Parte;
  onFigurinhaClick?: (fig: FigurinhaType) => void;
};

export const TelaAlbum: React.FC<TelaAlbumProps> = ({
  pagina,
  figurinhas,
  parte,
  onFigurinhaClick,
}) => {
  const figs = [...figurinhas].sort((a, b) => (a.slot ?? 999) - (b.slot ?? 999));
  const cor = pagina.subtitulo_cor ?? '#FFC400';

  // ---------- CAPA ----------
  if (parte === 'capa') {
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <div className="flex items-center gap-2">
          <span className="h-px w-6 bg-amber-400/60" />
          <span className="text-[10px] tracking-[0.4em] text-white/60 font-semibold">
            ÁLBUM OFICIAL
          </span>
          <span className="h-px w-6 bg-amber-400/60" />
        </div>
        <h1 className="mt-5 font-black italic leading-[0.82] tracking-tight">
          <span className="block text-6xl sm:text-7xl text-white drop-shadow-lg">
            FUT
          </span>
          <span className="block text-6xl sm:text-7xl text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">
            LENDAS
          </span>
        </h1>
        <span className="mt-3 text-xs sm:text-sm tracking-[0.4em] text-white/45 font-semibold">
          COLEÇÃO COMPLETA
        </span>
        <motion.img
          src={logoLendas}
          alt="FutLendas"
          animate={{
            filter: [
              'drop-shadow(0 0 6px rgba(251,191,36,0.35))',
              'drop-shadow(0 0 20px rgba(251,191,36,0.65))',
              'drop-shadow(0 0 6px rgba(251,191,36,0.35))',
            ],
          }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-7 h-36 w-36 sm:h-44 sm:w-44 object-contain"
        />
        <div className="mt-7 w-full overflow-hidden rounded-xl border border-cyan-400/20">
          <img src={capaHero} alt="FutLendas — Coleção" className="w-full object-contain" />
        </div>
      </div>
    );
  }

  // ---------- AGRADECIMENTO ----------
  if (parte === 'fim') {
    return (
      <div className="relative flex flex-col items-center px-7 py-12 text-center overflow-hidden">
        <img
          src={capaHero}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-[0.1] blur-sm scale-110"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_40%,rgba(251,191,36,0.16)_0%,transparent_70%)]"
        />
        <div className="relative z-10 flex flex-col items-center">
          <motion.img
            src={logoLendas}
            alt="FutLendas"
            animate={{
              scale: [1, 1.05, 1],
              filter: [
                'drop-shadow(0 0 10px rgba(251,191,36,0.4))',
                'drop-shadow(0 0 26px rgba(251,191,36,0.75))',
                'drop-shadow(0 0 10px rgba(251,191,36,0.4))',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="h-28 w-28 sm:h-32 sm:w-32 object-contain"
          />
          <div className="mt-4 flex items-center gap-2 text-amber-400/80">
            <span className="h-px w-8 bg-amber-400/40" />
            <span className="text-sm">★ ★ ★</span>
            <span className="h-px w-8 bg-amber-400/40" />
          </div>
          <h2 className="mt-5 font-black leading-[0.9] tracking-tight">
            <span className="block text-4xl sm:text-5xl text-white">
              {pagina.titulo}
            </span>
            {pagina.subtitulo && (
              <span
                className="mt-1 block text-2xl sm:text-3xl"
                style={{ color: cor }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </h2>
          {pagina.texto && (
            <p className="mt-6 text-sm sm:text-base text-cyan-100/80 leading-relaxed">
              {pagina.texto}
            </p>
          )}
          <span className="mt-8 text-[10px] tracking-[0.3em] text-amber-200/40 font-semibold uppercase">
            Álbum Oficial · Coleção Completa
          </span>
        </div>
      </div>
    );
  }

  // ---------- NARRATIVA — texto (pag 2) ----------
  if (parte === 'n-texto') {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <CabecalhoTela
          titulo={pagina.titulo ?? ''}
          subtitulo={pagina.subtitulo}
          cor={cor}
          tag={pagina.tag}
          data={pagina.data_referencia}
        />
        {pagina.texto && (
          <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed whitespace-pre-line">
            {pagina.texto}
          </p>
        )}
      </div>
    );
  }

  // ---------- NARRATIVA — foto (pag 2) ----------
  if (parte === 'n-foto') {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <RotuloSecao>A primeira foto</RotuloSecao>
        <FotoDividida
          parte1={figs.find((f) => (f.slot ?? 0) === 1)}
          parte2={figs.find((f) => (f.slot ?? 0) === 2)}
          fallback1={fotoAmigos1}
          fallback2={fotoAmigos2}
          onFigurinhaClick={onFigurinhaClick}
        />
        <p className="text-center text-xs text-cyan-100/45">
          O começo de tudo — Arena Caiçara, agosto de 2022.
        </p>
      </div>
    );
  }

  // ---------- NARRATIVA pag 5 — esquerda ----------
  if (parte === 'n5-esq') {
    const textoEsq = (pagina.texto ?? '').split('[[DIR]]')[0]?.trim() ?? '';
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <h2 className="font-black text-2xl sm:text-3xl text-white leading-tight">
          {pagina.titulo}
        </h2>
        <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed whitespace-pre-line">
          {textoEsq}
        </p>
      </div>
    );
  }

  // ---------- NARRATIVA pag 5 — direita ----------
  if (parte === 'n5-dir') {
    const textoDir = (pagina.texto ?? '').split('[[DIR]]')[1]?.trim() ?? '';
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <RotuloSecao>Continuação</RotuloSecao>
        <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed whitespace-pre-line">
          {textoDir}
        </p>
        {figs.length > 0 && (
          <FotoQuadripartida
            partes={[
              figs.find((f) => (f.slot ?? 0) === 1),
              figs.find((f) => (f.slot ?? 0) === 2),
              figs.find((f) => (f.slot ?? 0) === 3),
              figs.find((f) => (f.slot ?? 0) === 4),
            ]}
            onFigurinhaClick={onFigurinhaClick}
          />
        )}
      </div>
    );
  }

  // ---------- NUMEROS — texto ----------
  if (parte === 'num-texto') {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <CabecalhoTela
          titulo={pagina.titulo ?? ''}
          subtitulo={pagina.subtitulo}
          cor={cor}
          tag={pagina.tag}
        />
        {pagina.texto && (
          <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed whitespace-pre-line">
            {pagina.texto}
          </p>
        )}
      </div>
    );
  }

  // ---------- NUMEROS — grid 2x2 (4 figurinhas) ----------
  if (parte === 'num-grid') {
    return (
      <div className="flex flex-col gap-3 px-6 py-8">
        <RotuloSecao>Os números da lenda</RotuloSecao>
        <GridFigs figs={figs} cols={2} onClick={onFigurinhaClick} />
      </div>
    );
  }

  // ---------- REDE — imagem ----------
  if (parte === 'rede-img') {
    return (
      <div className="flex flex-col gap-4 px-5 py-8">
        <h2 className="font-black text-2xl sm:text-3xl text-white leading-tight">
          {pagina.titulo}
        </h2>
        {pagina.texto && (
          <p className="text-sm text-cyan-100/75 leading-relaxed">{pagina.texto}</p>
        )}
        <img
          src={paginaRede}
          alt={pagina.titulo ?? 'A Rede que Cresceu'}
          className="w-full rounded-xl border border-cyan-400/20 object-contain"
        />
      </div>
    );
  }

  // ---------- REDE — grid de figurinhas ----------
  if (parte === 'rede-grid') {
    return (
      <div className="flex flex-col gap-3 px-5 py-8">
        <RotuloSecao>Os atletas — {figs.length} figurinhas</RotuloSecao>
        <GridFigs figs={figs} cols={3} onClick={onFigurinhaClick} />
      </div>
    );
  }

  // ---------- COPA — texto ----------
  if (parte === 'copa-texto') {
    const secoes = parseSecoes(pagina.texto ?? '');
    return (
      <div className="flex flex-col gap-3 px-6 py-8">
        <CabecalhoTela
          titulo={pagina.titulo ?? ''}
          subtitulo={pagina.subtitulo}
          cor={cor}
          tag={pagina.tag}
          data={pagina.data_referencia}
        />
        <RotuloSecao>A história por trás do título</RotuloSecao>
        <div className="flex flex-col gap-4">
          {secoes.map((sec, i) => (
            <div key={i}>
              <h3
                className="text-sm sm:text-base font-black uppercase tracking-wide border-b border-white/10 pb-1"
                style={{ color: cor }}
              >
                {sec.titulo}
              </h3>
              {sec.texto && (
                <p className="mt-1.5 text-sm text-cyan-100/75 leading-relaxed">
                  {sec.texto}
                </p>
              )}
              {sec.pills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sec.pills.map((p, j) => (
                    <span
                      key={j}
                      className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {sec.destaque && (
                <p
                  className="mt-2 border-l-2 pl-3 italic text-sm text-amber-100/85"
                  style={{ borderColor: cor }}
                >
                  {sec.destaque}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- COPA — figurinhas ----------
  if (parte === 'copa-figs') {
    const nJogadores = (pagina.meta_json as { jogadores?: number } | null)?.jogadores ?? 5;
    const slotChave1 = 5 + nJogadores;
    const timeCampeao = [1, 2, 3, 4].map((s) =>
      figs.find((f) => (f.slot ?? 0) === s)
    );
    const jogadores = figs.filter(
      (f) => (f.slot ?? 0) >= 5 && (f.slot ?? 0) <= 4 + nJogadores
    );
    const chave = figs.filter(
      (f) => (f.slot ?? 0) === slotChave1 || (f.slot ?? 0) === slotChave1 + 1
    );
    const temTime = timeCampeao.some(Boolean);
    const colsJogadores = nJogadores >= 6 ? 3 : nJogadores >= 5 ? 5 : 4;
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <RotuloSecao>O time campeão</RotuloSecao>
        {temTime && (
          <FotoQuadripartida
            partes={timeCampeao}
            onFigurinhaClick={onFigurinhaClick}
          />
        )}
        {jogadores.length > 0 && (
          <>
            <RotuloSecao>Os campeões</RotuloSecao>
            <GridFigs figs={jogadores} cols={colsJogadores} onClick={onFigurinhaClick} />
          </>
        )}
        {chave.length > 0 && (
          <>
            <RotuloSecao>Chaveamento</RotuloSecao>
            <FotoDividida
              parte1={chave.find((f) => (f.slot ?? 0) === slotChave1)}
              parte2={chave.find((f) => (f.slot ?? 0) === slotChave1 + 1)}
              onFigurinhaClick={onFigurinhaClick}
            />
          </>
        )}
      </div>
    );
  }

  // ---------- CAMPEONATO — texto ----------
  if (parte === 'camp-texto') {
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <CabecalhoTela
          titulo={pagina.titulo ?? ''}
          subtitulo={pagina.subtitulo}
          cor={cor}
          tag={pagina.tag}
          data={pagina.data_referencia}
        />
        {pagina.texto && (
          <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed whitespace-pre-line">
            {pagina.texto}
          </p>
        )}
      </div>
    );
  }

  // ---------- CAMPEONATO — foto do campeao em 4 partes ----------
  if (parte === 'camp-figs') {
    const partesCampeao = [1, 2, 3, 4].map((s) =>
      figs.find((f) => (f.slot ?? 0) === s)
    );
    const temCampeao = partesCampeao.some(Boolean);
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        <RotuloSecao>O time campeão</RotuloSecao>
        {temCampeao && (
          <FotoQuadripartida
            partes={partesCampeao}
            onFigurinhaClick={onFigurinhaClick}
          />
        )}
      </div>
    );
  }

  // ---------- ELENCO — 2 times por tela ----------
  if (parte === 'elenco-ab' || parte === 'elenco-cd') {
    const isAB = parte === 'elenco-ab';
    const metaTimes = (pagina.meta_json as { times?: { nome?: string; cor?: string; jogadores?: number }[] } | null)?.times ?? [];
    // Tamanho dos 4 times (default 7 = 2 + 5 jogadores)
    const tamanhos = [0, 1, 2, 3].map((i) => 2 + (metaTimes[i]?.jogadores ?? 5));
    const inicios = tamanhos.reduce<number[]>((acc, _, i) => {
      acc.push(i === 0 ? 1 : acc[i - 1] + tamanhos[i - 1]);
      return acc;
    }, []);
    const padroes = isAB ? ['Time A', 'Time B'] : ['Time C', 'Time D'];
    const idxs = isAB ? [0, 1] : [2, 3];
    const time1Nome = metaTimes[idxs[0]]?.nome ?? padroes[0];
    const time2Nome = metaTimes[idxs[1]]?.nome ?? padroes[1];
    const time1Cor = metaTimes[idxs[0]]?.cor ?? '#FFFFFF';
    const time2Cor = metaTimes[idxs[1]]?.cor ?? '#FFFFFF';
    const sliceFigs = (idx: number) => {
      const ini = inicios[idx];
      const fim = ini + tamanhos[idx] - 1;
      return figs.filter((f) => (f.slot ?? 0) >= ini && (f.slot ?? 0) <= fim);
    };
    const time1 = sliceFigs(idxs[0]);
    const time2 = sliceFigs(idxs[1]);

    const TimeBloco: React.FC<{ nome: string; corNome: string; lista: FigurinhaType[] }> = ({
      nome,
      corNome,
      lista,
    }) => (
      <div className="rounded-xl border border-cyan-400/20 bg-black/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: corNome, textShadow: '0 0 8px rgba(0,0,0,0.6)' }}
          >
            {nome}
          </span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-200">
            ★ Logo + Capitão
          </span>
        </div>
        <GridFigs figs={lista} cols={4} onClick={onFigurinhaClick} />
      </div>
    );

    return (
      <div className="flex flex-col gap-4 px-5 py-7">
        <header>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-200/70">
            {isAB ? 'Times que disputaram — parte 1' : 'Times que disputaram — parte 2'}
          </span>
          <h2 className="mt-1 font-black italic leading-[0.9] tracking-tight">
            <span className="block text-xl sm:text-2xl text-white">
              {pagina.titulo}
            </span>
            {pagina.subtitulo && (
              <span
                className="block text-lg sm:text-xl"
                style={{ color: pagina.subtitulo_cor ?? '#A855F7' }}
              >
                {pagina.subtitulo}
              </span>
            )}
          </h2>
        </header>
        <TimeBloco nome={time1Nome} corNome={time1Cor} lista={time1} />
        <TimeBloco nome={time2Nome} corNome={time2Cor} lista={time2} />
      </div>
    );
  }

  // ---------- ESCUDOS — grid ----------
  if (parte === 'esc-grid') {
    const escudos = figs.filter((f) => (f.slot ?? 0) >= 1 && (f.slot ?? 0) <= 9);
    return (
      <div className="flex flex-col gap-3 px-6 py-8">
        <h2 className="font-black text-2xl sm:text-3xl text-white/90 leading-tight">
          {pagina.titulo}
        </h2>
        <RotuloSecao>Escudos dos times</RotuloSecao>
        <GridFigs figs={escudos} cols={3} onClick={onFigurinhaClick} />
      </div>
    );
  }

  // ---------- ESCUDOS — textos + fotos ----------
  if (parte === 'esc-fotos') {
    const partes = (pagina.texto ?? '').split('[[DIR]]');
    const texto1 = partes[0]?.trim() ?? '';
    const texto2 = partes[1]?.trim() ?? '';
    const foto1 = figs.filter((f) => (f.slot ?? 0) >= 10 && (f.slot ?? 0) <= 11);
    const foto2 = figs.filter((f) => (f.slot ?? 0) >= 12);
    return (
      <div className="flex flex-col gap-4 px-6 py-8">
        {texto1 && (
          <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed">
            {texto1}
          </p>
        )}
        {foto1.length > 0 && (
          <FotoDividida
            parte1={foto1.find((f) => (f.slot ?? 0) === 10)}
            parte2={foto1.find((f) => (f.slot ?? 0) === 11)}
            onFigurinhaClick={onFigurinhaClick}
          />
        )}
        {texto2 && (
          <p className="text-sm sm:text-base text-cyan-100/80 leading-relaxed">
            {texto2}
          </p>
        )}
        {foto2.length > 0 && (
          <FotoDividida
            parte1={foto2.find((f) => (f.slot ?? 0) === 12)}
            parte2={foto2.find((f) => (f.slot ?? 0) === 13)}
            onFigurinhaClick={onFigurinhaClick}
          />
        )}
      </div>
    );
  }

  // ---------- GENERICO (fallback) ----------
  return (
    <div className="flex flex-col gap-4 px-6 py-8">
      <CabecalhoTela
        titulo={pagina.titulo ?? ''}
        subtitulo={pagina.subtitulo}
        cor={cor}
        tag={pagina.tag}
        data={pagina.data_referencia}
      />
      {pagina.texto && (
        <p className="text-sm text-cyan-100/75 leading-relaxed whitespace-pre-line">
          {pagina.texto}
        </p>
      )}
      {figs.length > 0 && <GridFigs figs={figs} cols={3} onClick={onFigurinhaClick} />}
    </div>
  );
};
