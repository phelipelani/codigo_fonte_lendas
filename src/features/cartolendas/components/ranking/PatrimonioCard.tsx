import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeuPatrimonio } from '@/api/cartolendaApi';
import { LendaCoin, Avatar } from '../shared';

export function PatrimonioCard() {
  const { data } = useMeuPatrimonio();

  if (!data || !data.patrimonio_atual) return null;

  const atual = parseFloat(data.patrimonio_atual ?? 0);
  const anterior = parseFloat(data.patrimonio_anterior ?? atual);
  const variacao = atual - anterior;
  const jogadores = data.jogadores ?? [];

  return (
    <div className="rounded-2xl overflow-hidden border border-yellow-500/20">
      {/* Header */}
      <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500" />
      <div className="bg-gradient-to-b from-yellow-900/25 to-yellow-950/40 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center">
              <Wallet size={18} className="text-yellow-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-yellow-300 uppercase">Patrimonio</h4>
              <p className="text-[10px] text-white/30">Valor total do time</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-2xl text-yellow-400">{atual.toFixed(1)}</p>
              <LendaCoin size={16} />
            </div>
            {variacao !== 0 && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5',
                variacao > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              )}>
                {variacao > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Jogadores em grid de mini-cards */}
        {jogadores.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {jogadores.map((j: any) => {
              const val = parseFloat(j.variacao ?? 0);
              const precoEsc = parseFloat(j.preco_escalacao ?? 10);
              const precoAtual = parseFloat(j.preco_atual ?? 10);
              return (
                <div key={j.jogador_id} className="rounded-xl border border-white/8 bg-black/20 p-2 flex items-center gap-2">
                  <Avatar src={j.foto_url} nome={j.nome} size={7} className="border border-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-white truncate">{j.nome?.split(' ')[0]}</p>
                    <div className="flex items-center gap-1 text-[8px]">
                      <span className="text-white/30">{precoEsc.toFixed(1)}</span>
                      <span className="text-white/15">→</span>
                      <span className="text-white font-bold">{precoAtual.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold shrink-0',
                    val > 0 ? 'text-emerald-400' : val < 0 ? 'text-red-400' : 'text-white/30'
                  )}>
                    {val > 0 ? '+' : ''}{val.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
