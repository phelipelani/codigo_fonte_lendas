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
          'rounded-lg border border-dashed border-white/10 flex items-center justify-center',
          TAMANHO_CLASSES[tamanho],
          className
        )}
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.2) 100%)' }}
      >
        <span className="text-white/10 text-2xl font-black" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>?</span>
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
            // Placeholder FIFA-style sem imagem
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-1.5"
              style={{
                background: figurinha.raridade === 'lendaria'
                  ? 'linear-gradient(160deg, #1A1200 0%, #3D2E00 50%, #1A1200 100%)'
                  : 'linear-gradient(160deg, #061428 0%, #0d1f35 50%, #061428 100%)',
              }}
            >
              {/* Shimmer overlay lendária */}
              {figurinha.raridade === 'lendaria' && (
                <div className="absolute inset-0 opacity-20"
                  style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(255,215,0,0.4) 50%, transparent 70%)', backgroundSize: '200% 200%' }}
                />
              )}
              <span
                className="font-black leading-none relative z-10"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: tamanho === 'sm' ? '22px' : tamanho === 'lg' ? '38px' : '28px',
                  color: figurinha.raridade === 'lendaria' ? '#FFD700' : '#00C3FF',
                  textShadow: figurinha.raridade === 'lendaria' ? '0 0 12px rgba(255,215,0,0.6)' : '0 0 10px rgba(0,195,255,0.5)',
                  opacity: 0.9,
                }}
              >
                #{figurinha.numero}
              </span>
              <span
                className="text-center leading-tight relative z-10 truncate w-full"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: tamanho === 'sm' ? '7px' : '9px',
                  color: figurinha.raridade === 'lendaria' ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
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
            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '8px', letterSpacing: '0.12em' }}
          >
            {figurinha.raridade === 'lendaria' ? '★ LENDÁRIA' : 'COMUM'}
          </span>

          {/* Badge de repetidas */}
          {quantidade > 1 && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow">
              x{quantidade}
            </span>
          )}
        </>
      ) : (
        // Não obtida — mystery card com padrão hexagonal sutil
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5"
          style={{
            background: 'linear-gradient(160deg, #060E1A 0%, #0A1628 50%, #060E1A 100%)',
            backgroundImage: `linear-gradient(160deg, #060E1A 0%, #0A1628 50%, #060E1A 100%), repeating-linear-gradient(60deg, rgba(255,255,255,0.01) 0px, rgba(255,255,255,0.01) 1px, transparent 1px, transparent 12px)`,
          }}
        >
          <span
            className="font-black leading-none"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: tamanho === 'sm' ? '24px' : '30px',
              color: 'rgba(255,255,255,0.08)',
            }}
          >?</span>
          <span
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: '8px',
              color: 'rgba(255,255,255,0.15)',
              letterSpacing: '0.1em',
            }}
          >#{figurinha.numero}</span>
        </div>
      )}
    </button>
  );
};
