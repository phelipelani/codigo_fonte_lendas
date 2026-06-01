// Arquivo: src/features/album/components/FotoDividida.tsx
//
// Componente para fotos compostas por 2 figurinhas (parte 1 + parte 2).
// - Quando AS DUAS sao obtidas: renderiza as metades coladas, SEM separador,
//   parecendo uma foto unica. Borda dourada brilhando + selo "Completa".
// - Quando 0 ou 1 obtidas: silhueta nas partes que faltam e linha sutil
//   no meio mostrando que sao 2 figurinhas a ser coletadas.

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Figurinha as FigurinhaType } from '../api/albumApi';

type FotoDivididaProps = {
  parte1?: FigurinhaType | null;
  parte2?: FigurinhaType | null;
  /** Imagem padrao (mostrada quando a figurinha nao tem imagem_url propria) */
  fallback1?: string;
  fallback2?: string;
  /** Forca exibir como obtidas (ex: tela de admin / preview) */
  forcarObtida?: boolean;
  onFigurinhaClick?: (fig: FigurinhaType) => void;
  className?: string;
};

export const FotoDividida: React.FC<FotoDivididaProps> = ({
  parte1,
  parte2,
  fallback1,
  fallback2,
  forcarObtida,
  onFigurinhaClick,
  className,
}) => {
  const obtida1 = !!(forcarObtida || parte1?.obtida);
  const obtida2 = !!(forcarObtida || parte2?.obtida);
  const ambas = obtida1 && obtida2;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border-2 transition-all duration-500',
        ambas
          ? 'border-amber-400 shadow-[0_0_30px_-6px_rgba(251,191,36,0.6)]'
          : 'border-amber-400/40',
        className
      )}
    >
      <div className="flex items-stretch">
        <Metade
          fig={parte1}
          fallback={fallback1}
          lado="esq"
          obtida={obtida1}
          ambas={ambas}
          onClick={onFigurinhaClick}
        />
        <Metade
          fig={parte2}
          fallback={fallback2}
          lado="dir"
          obtida={obtida2}
          ambas={ambas}
          onClick={onFigurinhaClick}
        />
      </div>

      {ambas && (
        <span className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#0b1a30] shadow">
          ✓ Completa
        </span>
      )}
    </div>
  );
};

const Metade: React.FC<{
  fig?: FigurinhaType | null;
  fallback?: string;
  lado: 'esq' | 'dir';
  obtida: boolean;
  ambas: boolean;
  onClick?: (fig: FigurinhaType) => void;
}> = ({ fig, fallback, lado, obtida, ambas, onClick }) => {
  const src = fig?.imagem_url || fallback;
  const podeClicar = !!(fig && onClick);
  // Separador interno: aparece sempre que NAO esta completa
  const separador =
    !ambas &&
    (lado === 'esq'
      ? 'after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-amber-400/30'
      : '');

  if (obtida && src) {
    return (
      <div
        className={cn('relative flex-1', separador)}
        // garante area minima quando a outra metade nao tiver imagem
        style={{ minHeight: 1 }}
      >
        <img src={src} alt="" className="block h-full w-full object-cover" />
      </div>
    );
  }

  // Placeholder com "?"
  const Conteudo = (
    <div className="flex aspect-[3/2] w-full flex-col items-center justify-center bg-[#0d1f35]">
      <span className="text-5xl font-black leading-none text-white/15">?</span>
      {fig && (
        <span className="mt-1 text-[10px] font-bold text-white/40">
          #{fig.numero}
        </span>
      )}
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300/40">
        parte {lado === 'esq' ? '1' : '2'}
      </span>
    </div>
  );

  return podeClicar ? (
    <button
      type="button"
      onClick={() => onClick!(fig!)}
      className={cn('relative flex-1 cursor-pointer text-left', separador)}
    >
      {Conteudo}
    </button>
  ) : (
    <div className={cn('relative flex-1', separador)}>{Conteudo}</div>
  );
};
