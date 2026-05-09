import { X, Crown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, LendaCoin, PosicaoBadge, PontosDisplay } from '../shared';
import { getPosicaoTipo } from '@/@types/cartolendas';
import type { PosicaoTipo } from '@/@types/cartolendas';

const BORDA_COR: Record<PosicaoTipo, { card: string; top: string; avatar: string }> = {
  goleiro:  { card: 'border-blue-500/30',    top: 'bg-gradient-to-r from-blue-400 to-blue-600',    avatar: 'ring-blue-400/50' },
  zagueiro: { card: 'border-emerald-500/30', top: 'bg-gradient-to-r from-emerald-400 to-emerald-600', avatar: 'ring-emerald-400/50' },
  linha:    { card: 'border-purple-500/30',  top: 'bg-gradient-to-r from-purple-400 to-purple-600',  avatar: 'ring-purple-400/50' },
};

export function JogadorNoCampo({ jogador, label, onRemover, isCapitao, onCapitao, obrigatorio, pontosRodada }: {
  jogador: any | null;
  label: string;
  onRemover?: () => void;
  isCapitao?: boolean;
  onCapitao?: () => void;
  obrigatorio?: boolean;
  pontosRodada?: number | null;
}) {
  // Slot vazio
  if (!jogador) return (
    <div className="flex flex-col items-center w-[72px] sm:w-[80px]">
      <div className="w-full bg-black/40 backdrop-blur-sm rounded-xl border-2 border-dashed border-white/10 p-2 flex flex-col items-center gap-1.5 hover:border-white/20 transition-all cursor-pointer">
        <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center">
          <span className="text-white/15 text-xl font-light">+</span>
        </div>
        <span className="text-[8px] text-white/25 font-bold uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );

  const variacao = parseFloat(jogador.variacao ?? 0);
  const preco = parseFloat(jogador.preco ?? jogador.preco_atual ?? 10);
  const posicaoTipo = getPosicaoTipo(jogador.posicao_real ?? jogador.posicao, jogador.joga_recuado);
  const cores = BORDA_COR[posicaoTipo];
  const temPontos = pontosRodada != null && pontosRodada !== 0;

  return (
    <div className="flex flex-col items-center w-[72px] sm:w-[80px] group">
      {/* Card */}
      <div className={cn(
        'relative w-full rounded-xl overflow-hidden border transition-all duration-200',
        isCapitao
          ? 'bg-gradient-to-b from-yellow-900/50 to-yellow-950/70 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
          : obrigatorio
            ? 'bg-gradient-to-b from-emerald-900/40 to-emerald-950/60 border-emerald-500/30'
            : `bg-gradient-to-b from-slate-800/60 to-slate-900/80 ${cores.card} group-hover:border-purple-500/40`,
      )}>
        {/* Barra de posição colorida */}
        <div className={cn(
          'h-1',
          isCapitao ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
          : obrigatorio ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
          : cores.top,
        )} />

        <div className="px-1.5 py-2 flex flex-col items-center gap-1">
          {/* Avatar com ring de posição */}
          <div className="relative">
            <Avatar
              src={jogador.foto_url ?? jogador.avatar_url}
              nome={jogador.nome}
              size={11}
              className={cn('ring-2 shadow-md', cores.avatar)}
            />
            {/* Badge Capitão */}
            {isCapitao && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-md text-[9px] font-black text-black border border-yellow-300/80">
                C
              </div>
            )}
            {/* Badge Obrigatório */}
            {obrigatorio && !isCapitao && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow border border-emerald-400">
                <Crown size={8} className="text-white" />
              </div>
            )}
            {/* Badge posição */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <PosicaoBadge tipo={posicaoTipo} className="text-[7px] px-1 py-0 shadow-md" />
            </div>
          </div>

          {/* Nome */}
          <p className="text-[9px] font-bold text-white text-center leading-tight truncate w-full mt-1">
            {jogador.nome?.split(' ')[0]}
          </p>

          {/* Pontos da rodada (quando calculado) */}
          {temPontos ? (
            <PontosDisplay valor={pontosRodada!} size="xs" className="px-1 py-0" />
          ) : (
            /* Preço */
            <div className="flex items-center gap-0.5 text-[8px] font-bold text-yellow-400">
              <LendaCoin size={8} />
              {preco.toFixed(1)}
            </div>
          )}

          {/* Variação (se tiver e não mostrou pontos) */}
          {!temPontos && variacao !== 0 && (
            <PontosDisplay valor={variacao} size="xs" showArrow className="px-1 py-0 text-[7px]" />
          )}
        </div>

        {/* Botão remover */}
        {onRemover && !obrigatorio && (
          <button
            onClick={onRemover}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400 shadow"
          >
            <X size={8} className="text-white" />
          </button>
        )}
      </div>

      {/* Botão capitão */}
      {onCapitao && (
        <button
          onClick={onCapitao}
          className={cn(
            'mt-1 text-[8px] font-bold px-2 py-0.5 rounded-full transition-all',
            isCapitao
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-white/5 text-white/20 hover:bg-yellow-500/10 hover:text-yellow-400 border border-transparent',
          )}
        >
          {isCapitao ? <><Star size={8} className="inline mr-0.5 fill-yellow-400" /> CAP</> : '☆ cap'}
        </button>
      )}
    </div>
  );
}
