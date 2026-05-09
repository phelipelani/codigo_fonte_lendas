import { X, Crown, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, LendaCoin } from '../shared';

export function JogadorNoCampo({ jogador, label, onRemover, isCapitao, onCapitao, obrigatorio }: {
  jogador: any | null;
  label: string;
  onRemover?: () => void;
  isCapitao?: boolean;
  onCapitao?: () => void;
  obrigatorio?: boolean;
}) {
  // Slot vazio — cartãozinho com borda tracejada
  if (!jogador) return (
    <div className="flex flex-col items-center w-[68px] sm:w-[76px]">
      <div className="w-full bg-black/30 backdrop-blur-sm rounded-xl border-2 border-dashed border-white/10 p-2 flex flex-col items-center gap-1">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <span className="text-white/15 text-xl">+</span>
        </div>
        <span className="text-[8px] text-white/20 font-bold uppercase">{label}</span>
      </div>
    </div>
  );

  const variacao = parseFloat(jogador.variacao ?? 0);
  const preco = parseFloat(jogador.preco ?? 10);

  return (
    <div className="flex flex-col items-center w-[68px] sm:w-[76px] group">
      {/* Card do jogador */}
      <div className={cn(
        'relative w-full rounded-xl overflow-hidden border transition-all duration-200',
        isCapitao
          ? 'bg-gradient-to-b from-yellow-900/60 to-yellow-950/80 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
          : obrigatorio
            ? 'bg-gradient-to-b from-emerald-900/50 to-emerald-950/70 border-emerald-500/30'
            : 'bg-gradient-to-b from-slate-800/70 to-slate-900/90 border-white/10 group-hover:border-purple-500/30'
      )}>
        {/* Topo colorido */}
        <div className={cn(
          'h-1',
          isCapitao ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
          : obrigatorio ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
          : 'bg-gradient-to-r from-purple-500 to-purple-700'
        )} />

        {/* Conteúdo */}
        <div className="px-1.5 py-1.5 flex flex-col items-center gap-1">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              src={jogador.foto_url ?? jogador.avatar_url}
              nome={jogador.nome}
              size={10}
              className="border border-white/20 shadow-md"
            />
            {/* Badge Capitão */}
            {isCapitao && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow text-[9px] font-black text-black border border-yellow-300">
                C
              </div>
            )}
            {/* Badge Obrigatório */}
            {obrigatorio && !isCapitao && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow border border-emerald-400">
                <Crown size={8} className="text-white" />
              </div>
            )}
          </div>

          {/* Nome */}
          <p className="text-[9px] font-bold text-white text-center leading-tight truncate w-full">
            {jogador.nome?.split(' ')[0]}
          </p>

          {/* Preço */}
          <div className="flex items-center gap-0.5 text-[8px] font-bold text-yellow-400">
            <LendaCoin size={8} />
            {preco.toFixed(1)}
          </div>

          {/* Variação */}
          {variacao !== 0 && (
            <div className={cn(
              'flex items-center gap-0.5 text-[8px] font-bold rounded-full px-1.5 py-0.5',
              variacao > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            )}>
              {variacao > 0 ? <TrendingUp size={7} /> : <TrendingDown size={7} />}
              {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}
            </div>
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

      {/* Botão capitão (fora do card) */}
      {onCapitao && (
        <button
          onClick={onCapitao}
          className={cn(
            'mt-1 text-[8px] font-bold px-2 py-0.5 rounded-full transition-all',
            isCapitao
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-white/5 text-white/20 hover:bg-yellow-500/10 hover:text-yellow-400 border border-transparent'
          )}
        >
          {isCapitao ? '★ CAP' : '☆ cap'}
        </button>
      )}
    </div>
  );
}
