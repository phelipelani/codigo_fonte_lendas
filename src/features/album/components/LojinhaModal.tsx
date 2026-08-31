import React from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useQuery } from '@tanstack/react-query';
import { useComprarPacote } from '../api/albumApi';
import { betsApi } from '../../bets/api/bets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function LojinhaModal({ isOpen, onClose }: Props) {
  const { data: carteira, isLoading: carteiraLoading } = useQuery({
    queryKey: ['bets_carteira'],
    queryFn: betsApi.getCarteira,
  });

  const comprarMutation = useComprarPacote();
  const precoLendacoins = 75;

  const handleComprar = () => {
    if (confirm(`Confirmar a compra de 1 pacote por ${precoLendacoins} Lendacoins?`)) {
      comprarMutation.mutate();
    }
  };

  const saldo = Number(carteira?.saldo || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0a1628] border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-amber-400">
            <ShoppingCart className="h-6 w-6" /> Lojinha
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          
          <div className="text-center mb-6">
            <p className="text-zinc-400 text-sm">Seu saldo atual:</p>
            {carteiraLoading ? (
              <Loader2 className="animate-spin h-6 w-6 mx-auto text-cyan-400" />
            ) : (
              <div className="text-3xl font-black text-white">💰 {saldo.toFixed(2)}</div>
            )}
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-amber-700/20 p-6 rounded-xl border border-amber-500/30 text-center w-full relative overflow-hidden mb-4">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <ShoppingCart className="h-24 w-24" />
            </div>
            <h3 className="font-bold text-xl text-amber-400 mb-2">Pacote Simples</h3>
            <p className="text-zinc-300 text-sm mb-4">Contém 5 figurinhas aleatórias para o seu álbum!</p>
            
            <button
              onClick={handleComprar}
              disabled={comprarMutation.isPending || saldo < precoLendacoins}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                saldo < precoLendacoins 
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
              }`}
            >
              {comprarMutation.isPending ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>Comprar por 💰 {precoLendacoins}</>
              )}
            </button>
            {saldo < precoLendacoins && (
              <p className="text-red-400 text-xs mt-3">Você não tem Lendacoins suficientes!</p>
            )}
          </div>

          {/* SESSÃO PIX */}
          <div className="w-full bg-zinc-900 border border-emerald-500/30 rounded-xl p-5 text-center mt-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2 opacity-5">
              <span className="text-6xl">💸</span>
            </div>
            <h3 className="text-emerald-400 font-bold mb-1">Recarregar Lendacoins</h3>
            <p className="text-zinc-400 text-xs mb-4">Compre mais Lendacoins via PIX para continuar completando o seu álbum!</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => alert("Em breve! Módulo do Mercado Pago será ativado.")} 
                className="bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400 text-sm font-bold py-2 rounded-lg transition-colors"
              >
                10 Lendacoins<br/><span className="text-xs font-normal">R$ 5,00</span>
              </button>
              <button 
                onClick={() => alert("Em breve! Módulo do Mercado Pago será ativado.")} 
                className="bg-emerald-500/20 border border-emerald-500/50 hover:bg-emerald-500/30 text-emerald-400 text-sm font-bold py-2 rounded-lg transition-colors"
              >
                50 Lendacoins<br/><span className="text-xs font-normal">R$ 20,00</span>
              </button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
