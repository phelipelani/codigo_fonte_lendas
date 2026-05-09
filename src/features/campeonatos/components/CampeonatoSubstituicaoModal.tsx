// Arquivo: src/features/Campeonatos/components/CampeonatoSubstituicaoModal.tsx
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, UserPlus, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useJogadores } from '@/features/jogadores/api/useJogadores';
import { useSubstituirJogador, ElencoItem } from '@/features/rodadas/api/useCampeonatoRodadas';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Props = {
  rodadaId: number;
  timeId: number;
  jogadorSaindo: ElencoItem | null;
  jogadoresNaRodada: ElencoItem[];
  isOpen: boolean;
  onClose: () => void;
};

export function CampeonatoSubstituicaoModal({
  rodadaId,
  timeId,
  jogadorSaindo,
  jogadoresNaRodada,
  isOpen,
  onClose
}: Props) {
  const { data: todosJogadores } = useJogadores();
  const substituirMutation = useSubstituirJogador();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filtra jogadores disponíveis (Quem NÃO está nessa rodada em nenhum time)
  const disponiveis = useMemo(() => {
    if (!todosJogadores) return [];
    const idsEmUso = new Set(jogadoresNaRodada.map(j => j.jogador_id));

    return todosJogadores
      .filter(j => !idsEmUso.has(j.id))
      .filter(j => j.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [todosJogadores, jogadoresNaRodada, searchTerm]);

  const jogadorSelecionado = disponiveis.find(j => j.id === selectedId);

  const handleConfirm = () => {
    if (!selectedId || !jogadorSaindo) return;

    substituirMutation.mutate({
      rodadaId,
      timeId,
      jogadorSaiId: jogadorSaindo.jogador_id,
      jogadorEntraId: selectedId
    }, {
      onSuccess: () => {
        toast.success('Substituição realizada!', {
          description: `${jogadorSaindo.nome_jogador} → ${jogadorSelecionado?.nome}`
        });
        onClose();
        setSelectedId(null);
        setSearchTerm('');
      },
      onError: (error: any) => {
        toast.error('Erro na substituição', {
          description: error?.message || 'Tente novamente'
        });
      }
    });
  };

  const handleClose = () => {
    setSelectedId(null);
    setSearchTerm('');
    onClose();
  };

  if (!jogadorSaindo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#0a1628] border-cyan-500/20 flex flex-col max-h-[85vh]">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

        <DialogHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ArrowRight className="text-white" size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                Substituição
              </DialogTitle>
              <p className="text-[11px] text-cyan-100/50">Selecione quem vai entrar</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col relative">

          {/* Visual da Troca */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0d1f35]/50 border border-cyan-500/10">
            {/* Jogador Saindo */}
            <div className="flex flex-col items-center w-2/5">
              <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-2">Sai</span>
              <div className="w-12 h-12 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-2 overflow-hidden">
                {jogadorSaindo.foto_url ? (
                  <img src={jogadorSaindo.foto_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-red-400 text-sm">
                    {jogadorSaindo.nome_jogador.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-bold text-white text-center text-sm truncate w-full">
                {jogadorSaindo.nome_jogador}
              </span>
            </div>

            {/* Seta */}
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <ArrowRight className="text-amber-400" size={18} />
            </div>

            {/* Jogador Entrando */}
            <div className="flex flex-col items-center w-2/5">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-2">Entra</span>
              <div className={cn(
                "w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 overflow-hidden transition-all",
                selectedId
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-[#0d1f35] border-dashed border-cyan-500/30"
              )}>
                {jogadorSelecionado ? (
                  jogadorSelecionado.foto_url ? (
                    <img src={jogadorSelecionado.foto_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-emerald-400 text-sm">
                      {jogadorSelecionado.nome.substring(0, 2).toUpperCase()}
                    </span>
                  )
                ) : (
                  <UserPlus size={18} className="text-cyan-500/50" />
                )}
              </div>
              <span className={cn(
                "font-bold text-center text-sm truncate w-full",
                selectedId ? "text-emerald-400" : "text-cyan-100/40"
              )}>
                {jogadorSelecionado?.nome || 'Selecionar...'}
              </span>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40" />
            <Input
              placeholder="Buscar jogador disponível..."
              className="pl-9 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 focus:border-cyan-400/50 focus:ring-cyan-500/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Lista de Jogadores */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-cyan-500/10 bg-[#0d1f35]/30 p-2 space-y-1 min-h-[200px]">
            {disponiveis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-cyan-100/40 text-sm">
                <AlertCircle className="mb-2 h-8 w-8 opacity-50" />
                Nenhum jogador disponível.
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {disponiveis.map((jogador, index) => (
                  <motion.button
                    key={jogador.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => setSelectedId(jogador.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-lg transition-all",
                      selectedId === jogador.id
                        ? "bg-cyan-500/10 border border-cyan-500/30"
                        : "hover:bg-cyan-500/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 overflow-hidden">
                        {jogador.foto_url ? (
                          <img src={jogador.foto_url} className="w-full h-full object-cover" />
                        ) : (
                          jogador.nome.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-white">{jogador.nome}</span>
                    </div>
                    {selectedId === jogador.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <UserPlus size={16} className="text-cyan-400" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-cyan-100/60 hover:text-white hover:bg-cyan-500/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || substituirMutation.isPending}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
          >
            {substituirMutation.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Trocando...
              </>
            ) : (
              'Confirmar Troca'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}