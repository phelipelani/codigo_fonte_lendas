// Arquivo: src/features/album/components/FotoQuadripartida.tsx
//
// Foto composta por 4 figurinhas em 2x2 (quadrantes).
// - Quando AS 4 sao obtidas: aparecem sem separadores, parecendo
//   uma foto unica. Borda dourada brilhando + selo "Completa".
// - Quando 0-3 obtidas: cada metade obtida mostra sua imagem; as
//   nao obtidas mostram silhueta "?" com numero/parte. Linhas sutis
//   no meio mostrando que sao 4 pecas.
//
// Ordem das partes:
//   parte[0] = superior esquerdo
//   parte[1] = superior direito
//   parte[2] = inferior esquerdo
//   parte[3] = inferior direito

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Figurinha as FigurinhaType } from '../api/albumApi';

type FotoQuadripartidaProps = {
  partes: (FigurinhaType | undefined | null)[]; // 4 itens
  fallbacks?: (string | undefined)[];           // 4 imagens fallback
  forcarObtida?: boolean;
  onFigurinhaClick?: (fig: FigurinhaType) => void;
  className?: string;
};

export const FotoQuadripartida: React.FC<FotoQuadripartidaProps> = ({
  partes,
  fallbacks,
  forcarObtida,
  onFigurinhaClick,
  className,
}) => {
  const obtidas = partes.map((p) => !!(forcarObtida || p?.obtida));
  const todas = obtidas.every(Boolean);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border-2 transition-all duration-500',
        todas
          ? 'border-amber-400 shadow-[0_0_36px_-6px_rgba(251,191,36,0.6)]'
          : 'border-amber-400/40',
        className
      )}
    >
      <div className="grid grid-cols-2 grid-rows-2">
        {[0, 1, 2, 3].map((i) => (
          <Quadrante
            key={i}
            fig={partes[i]}
            fallback={fallbacks?.[i]}
            posicao={i as 0 | 1 | 2 | 3}
            obtida={obtidas[i]}
            todas={todas}
            onClick={onFigurinhaClick}
          />
        ))}
      </div>

      {todas && (
        <span className="pointer-events-none absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#0b1a30] shadow">
          ✓ Completa
        </span>
      )}
    </div>
  );
};

const Quadrante: React.FC<{
  fig?: FigurinhaType | null;
  fallback?: string;
  posicao: 0 | 1 | 2 | 3; // TL=0, TR=1, BL=2, BR=3
  obtida: boolean;
  todas: boolean;
  onClick?: (fig: FigurinhaType) => void;
}> = ({ fig, fallback, posicao, obtida, todas, onClick }) => {
  const src = fig?.imagem_url || fallback;
  const podeClicar = !!(fig && onClick);

  // Separadores internos (so quando NAO esta completa)
  // posicao 0 (TL): direita + baixo
  // posicao 1 (TR):           baixo
  // posicao 2 (BL): direita
  // posicao 3 (BR):  nada
  const temBordaDireita = !todas && (posicao === 0 || posicao === 2);
  const temBordaBaixo   = !todas && (posicao === 0 || posicao === 1);
  const bordas = cn(
    temBordaDireita && 'border-r border-amber-400/30',
    temBordaBaixo   && 'border-b border-amber-400/30'
  );

  if (obtida && src) {
    return (
      <div className={cn('relative', bordas)}>
        <img src={src} alt="" className="block h-full w-full object-cover" />
      </div>
    );
  }

  const Conteudo = (
    <div className="flex aspect-[3/2] w-full flex-col items-center justify-center bg-[#0d1f35]">
      <span className="text-4xl font-black leading-none text-white/15">?</span>
      {fig && (
        <span className="mt-1 text-[10px] font-bold text-white/40">
          #{fig.numero}
        </span>
      )}
      <span className="mt-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300/40">
        parte {posicao + 1}
      </span>
    </div>
  );

  return podeClicar ? (
    <button
      type="button"
      onClick={() => onClick!(fig!)}
      className={cn('relative cursor-pointer text-left', bordas)}
    >
      {Conteudo}
    </button>
  ) : (
    <div className={cn('relative', bordas)}>{Conteudo}</div>
  );
};
