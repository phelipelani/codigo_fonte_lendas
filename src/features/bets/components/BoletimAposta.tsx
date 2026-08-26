import React, { useState } from 'react';
import { OpcaoBet, betsApi } from '../api/bets';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface BoletimApostaProps {
  selecoes: OpcaoBet[];
  saldo: number;
  onClear: () => void;
  onRemoveSelecao: (id: number) => void;
}

export function BoletimAposta({ selecoes, saldo, onClear, onRemoveSelecao }: BoletimApostaProps) {
  const [valor, setValor] = useState<number | ''>('');
  const queryClient = useQueryClient();

  const oddTotal = selecoes.reduce((acc, curr) => acc * Number(curr.odd), 1);
  const retornoPotencial = (Number(valor) || 0) * oddTotal;

  const apostaMutation = useMutation({
    mutationFn: () => betsApi.fazerAposta(Number(valor), selecoes.map(s => s.id)),
    onSuccess: (data) => {
      toast.success('Aposta realizada com sucesso!');
      onClear();
      setValor('');
      queryClient.invalidateQueries({ queryKey: ['bets_carteira'] });
      queryClient.invalidateQueries({ queryKey: ['bets_historico'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao fazer aposta');
    }
  });

  if (selecoes.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6 shadow-xl border border-zinc-800 sticky top-24">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <span className="bg-zinc-800 p-2 rounded mr-3">🧾</span> Boletim de Apostas
        </h3>
        <p className="text-zinc-500 text-center py-8">Clique nas odds para adicionar ao boletim.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl shadow-xl border border-zinc-800 overflow-hidden sticky top-24 flex flex-col max-h-[85vh]">
      <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center">
          🧾 Bilhete <span className="ml-2 bg-fut-primary text-black text-xs px-2 py-1 rounded-full font-bold">{selecoes.length}</span>
        </h3>
        <button onClick={onClear} className="text-red-400 text-sm hover:text-red-300">Limpar</button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {selecoes.map((s) => (
          <div key={s.id} className="bg-zinc-800 p-3 rounded-lg relative">
            <button 
              onClick={() => onRemoveSelecao(s.id)}
              className="absolute top-2 right-2 text-zinc-500 hover:text-white"
            >
              &times;
            </button>
            <p className="text-sm font-semibold text-zinc-300 pr-4">{s.descricao}</p>
            <p className="text-fut-primary font-bold mt-1">{Number(s.odd).toFixed(2)}</p>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-black/20">
        <div className="flex justify-between items-center mb-4 text-sm text-zinc-400">
          <span>Odd Total:</span>
          <span className="font-bold text-white text-lg">{oddTotal.toFixed(2)}</span>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-zinc-500 mb-1">Valor da Aposta (Fichas)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">💰</span>
            <input
              type="number"
              min="1"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-fut-primary transition-colors font-semibold"
              placeholder="0.00"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <span className={`text-xs ${saldo < Number(valor) ? 'text-red-400' : 'text-zinc-500'}`}>
              Saldo: {saldo.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <span className="text-sm text-zinc-400">Retorno Potencial:</span>
          <span className="text-fut-primary font-bold text-xl">{retornoPotencial.toFixed(2)}</span>
        </div>

        <button
          onClick={() => apostaMutation.mutate()}
          disabled={!valor || Number(valor) <= 0 || apostaMutation.isPending || saldo < Number(valor)}
          className="w-full bg-fut-primary hover:bg-green-400 text-black font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
        >
          {apostaMutation.isPending ? 'Processando...' : 'Fazer Aposta'}
        </button>
      </div>
    </div>
  );
}
