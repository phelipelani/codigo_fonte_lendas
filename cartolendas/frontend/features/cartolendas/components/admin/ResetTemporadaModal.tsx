import { useState } from 'react';
import { X, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useResetTemporada } from '@/api/cartolendaApi';

interface Props {
  onClose: () => void;
}

export function ResetTemporadaModal({ onClose }: Props) {
  const currentYear = new Date().getFullYear();
  const semester = Math.ceil((new Date().getMonth() + 1) / 6);
  const [nome, setNome] = useState(`${currentYear}-S${semester}`);
  const [confirmText, setConfirmText] = useState('');
  const resetMutation = useResetTemporada();

  const canReset = confirmText === 'RESETAR' && nome.trim().length > 0;

  const handleReset = () => {
    if (!canReset) return;
    resetMutation.mutate({ temporada_nome: nome }, {
      onSuccess: (data) => {
        toast.success(data.message);
        onClose();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message ?? 'Erro ao resetar temporada');
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1f35] border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h2 className="font-black text-lg text-white">Reset de Temporada</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Aviso */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 font-bold text-sm mb-2">Acao irreversivel!</p>
            <ul className="text-xs text-red-300/70 space-y-1">
              <li>- Rankings serao arquivados e zerados</li>
              <li>- Lendas Coins voltam para 100.00</li>
              <li>- Divisoes voltam para Bronze</li>
              <li>- Patrimonio resetado para 100.00</li>
              <li>- Times e escalacoes de rodadas finalizadas serao removidos</li>
              <li>- Precos dos jogadores voltam ao padrao (10.00)</li>
            </ul>
          </div>

          {/* Nome da temporada */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">
              Nome da temporada (para arquivo)
            </label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: 2025-S1"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50"
            />
          </div>

          {/* Confirmacao */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5 block">
              Digite <span className="text-red-400">RESETAR</span> para confirmar
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="RESETAR"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-red-500/50 tracking-widest text-center font-bold"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-bold hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={!canReset || resetMutation.isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {resetMutation.isPending
              ? <RefreshCw size={14} className="animate-spin" />
              : <RotateCcw size={14} />
            }
            Resetar Temporada
          </button>
        </div>
      </div>
    </div>
  );
}
