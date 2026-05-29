// Arquivo: src/features/album/components/Figurinha.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Figurinha as FigurinhaType, Raridade } from '../api/albumApi';

// Estilo visual por raridade
const RARIDADE_STYLE: Record<Raridade, { borda: string; glow: string; faixa: string }> = {
  comum: {
    borda: 'border-cyan-400/40',
    glow: '',
    faixa: 'bg-cyan-500/20 text-cyan-200',
  },
  lendaria: {
    borda: 'border-amber-400/70',
    glow: 'shadow-[0_0_18px_-4px_rgba(251,191,36,0.55)]',
    faixa: 'bg-amber-500/25 text-amber-200',
  },
};

type FigurinhaProps = {
  figurinha?: FigurinhaType | null;
  /** Slot vazio no álbum (figurinha não cadastrada nessa posição) */
  vazio?: boolean;
  /** Força exibir como obtida mesmo sem dados de inventário (ex: abrir pacote) */
  forcarObtida?: boolean;
  tamanho?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
};

const TAMANHO_CLASSES = {
  sm: 'w-16 h-[88px] text-[9px]',
  md: 'w-24 h-[132px] text-[11px]',
  lg: 'w-36 h-[200px] text-sm',
};

export const Figurinha: React.FC<FigurinhaProps> = ({
  figurinha,
  vazio,
  forcarObtida,
  tamanho = 'md',
  onClick,
  className,
}) => {
  // Slot completamente vazio
  if (vazio || !figurinha) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-white/10 bg-white/[0.03] flex items-center justify-center',
          TAMANHO_CLASSES[tamanho],
          className
        )}
      >
        <span className="text-white/15 text-2xl font-black">?</span>
      </div>
    );
  }

  const obtida = forcarObtida || figurinha.obtida;
  const estilo = RARIDADE_STYLE[figurinha.raridade] ?? RARIDADE_STYLE.comum;
  const quantidade = figurinha.quantidade ?? 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'group relative rounded-lg border-2 overflow-hidden transition-all duration-200',
        TAMANHO_CLASSES[tamanho],
        obtida
          ? cn(estilo.borda, estilo.glow, 'bg-[#0d1f35]')
          : 'border-white/10 bg-black/40',
        onClick && 'cursor-pointer hover:scale-[1.04] active:scale-95',
        className
      )}
      title={figurinha.nome}
    >
      {obtida ? (
        <>
          {figurinha.imagem_url ? (
            <img
              src={figurinha.imagem_url}
              alt={figurinha.nome}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            // Placeholder visual enquanto não há imagem real
            <div
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1 p-1',
                figurinha.raridade === 'lendaria'
                  ? 'bg-gradient-to-br from-amber-900/40 to-[#0d1f35]'
                  : 'bg-gradient-to-br from-cyan-900/40 to-[#0d1f35]'
              )}
            >
              <span className="font-black text-white/30 text-2xl leading-none">
                #{figurinha.numero}
              </span>
              <span className="font-bold text-white text-center leading-tight px-0.5">
                {figurinha.nome}
              </span>
            </div>
          )}

          {/* Faixa de raridade */}
          <span
            className={cn(
              'absolute bottom-0 inset-x-0 px-1 py-0.5 text-center font-bold uppercase tracking-wide',
              estilo.faixa
            )}
          >
            {figurinha.raridade === 'lendaria' ? '★ Lendária' : 'Comum'}
          </span>

          {/* Badge de repetidas */}
          {quantidade > 1 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow">
              x{quantidade}
            </span>
          )}
        </>
      ) : (
        // Não obtida — silhueta
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-white/15 text-3xl font-black">?</span>
          <span className="text-white/25 font-bold">#{figurinha.numero}</span>
        </div>
      )}
    </button>
  );
};
