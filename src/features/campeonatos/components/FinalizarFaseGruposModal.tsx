// ============================================================================
// ARQUIVO: src/features/Campeonatos/components/FinalizarFaseGruposModal.tsx
// Modal para finalizar fase de grupos e mostrar classificação + preview mata-mata
// ============================================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Trophy, Swords, ArrowRight, Crown, Medal, 
  CheckCircle, Loader2, AlertTriangle, X,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';

interface ClassificacaoTime {
  id: number;
  nome: string;
  logo_url?: string;
  posicao: number;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo_gols: number;
}

interface FinalizarFaseGruposModalProps {
  isOpen: boolean;
  onClose: () => void;
  campeonatoId: number;
  onSuccess: () => void;
}

// ============================================================================
// COMPONENTE: TABELA DE CLASSIFICAÇÃO COMPACTA
// ============================================================================
const TabelaClassificacao = ({ 
  classificacao, 
  highlightSemifinalistas 
}: { 
  classificacao: ClassificacaoTime[];
  highlightSemifinalistas?: boolean;
}) => {
  return (
    <div className="rounded-xl border border-cyan-500/20 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[#0d1f35]">
          <tr className="text-cyan-100/50 text-xs uppercase">
            <th className="px-3 py-2 text-center">#</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-center">P</th>
            <th className="px-3 py-2 text-center">J</th>
            <th className="px-3 py-2 text-center">V</th>
            <th className="px-3 py-2 text-center">SG</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cyan-500/10">
          {classificacao.map((time, index) => {
            const isSemifinalista = highlightSemifinalistas && index < 4;
            
            return (
              <motion.tr 
                key={time.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "transition-colors",
                  isSemifinalista ? "bg-emerald-500/10" : "bg-[#0a1628]/30"
                )}
              >
                <td className="px-3 py-2 text-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto",
                    index === 0 && "bg-amber-500/20 text-amber-400",
                    index === 1 && "bg-gray-400/20 text-gray-300",
                    index === 2 && "bg-orange-500/20 text-orange-400",
                    index === 3 && "bg-cyan-500/20 text-cyan-400",
                    index > 3 && "bg-cyan-500/10 text-cyan-100/50"
                  )}>
                    {time.posicao}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {time.logo_url ? (
                      <img src={time.logo_url} alt={time.nome} className="w-6 h-6 object-contain" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                        {time.nome.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className={cn(
                      "font-medium",
                      isSemifinalista ? "text-white" : "text-cyan-100/70"
                    )}>
                      {time.nome}
                    </span>
                    {isSemifinalista && (
                      <ArrowRight className="w-3 h-3 text-emerald-400 ml-1" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center font-bold text-cyan-400">
                  {time.pontos}
                </td>
                <td className="px-3 py-2 text-center text-cyan-100/50">
                  {time.jogos}
                </td>
                <td className="px-3 py-2 text-center text-emerald-400">
                  {time.vitorias}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={cn(
                    "font-medium",
                    time.saldo_gols > 0 && "text-emerald-400",
                    time.saldo_gols < 0 && "text-red-400",
                    time.saldo_gols === 0 && "text-cyan-100/50"
                  )}>
                    {time.saldo_gols > 0 ? `+${time.saldo_gols}` : time.saldo_gols}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// COMPONENTE: PREVIEW DO CHAVEAMENTO
// ============================================================================
const PreviewBracket = ({ classificacao }: { classificacao: ClassificacaoTime[] }) => {
  if (classificacao.length < 4) return null;

  const time1 = classificacao[0];
  const time2 = classificacao[1];
  const time3 = classificacao[2];
  const time4 = classificacao[3];

  const ConfrontoPreview = ({ 
    timeA, 
    timeB, 
    label 
  }: { 
    timeA: ClassificacaoTime; 
    timeB: ClassificacaoTime; 
    label: string;
  }) => (
    <div className="bg-[#0d1f35]/50 rounded-lg p-3 border border-cyan-500/20">
      <div className="text-[10px] text-cyan-100/50 uppercase tracking-wider mb-2 text-center">
        {label}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 rounded bg-[#0a1628]/50">
          <span className="text-xs font-bold text-amber-400">{timeA.posicao}º</span>
          <span className="text-sm font-medium text-white truncate flex-1">{timeA.nome}</span>
        </div>
        <div className="text-center text-cyan-100/30 text-xs">VS</div>
        <div className="flex items-center gap-2 p-2 rounded bg-[#0a1628]/50">
          <span className="text-xs font-bold text-cyan-400">{timeB.posicao}º</span>
          <span className="text-sm font-medium text-white truncate flex-1">{timeB.nome}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      <h4 className="text-sm font-bold text-cyan-100/70 mb-3 flex items-center gap-2">
        <Swords className="w-4 h-4 text-cyan-400" />
        Próximo: Semifinais
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ConfrontoPreview timeA={time1} timeB={time4} label="Semifinal 1" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ConfrontoPreview timeA={time2} timeB={time3} label="Semifinal 2" />
        </motion.div>
      </div>

      {/* Legenda */}
      <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4" />
          <span>Os 4 primeiros colocados avançam para as semifinais</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: MODAL
// ============================================================================
export function FinalizarFaseGruposModal({
  isOpen,
  onClose,
  campeonatoId,
  onSuccess
}: FinalizarFaseGruposModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'confirmar' | 'sucesso'>('confirmar');

  // Buscar classificação atual
  const { data: classificacao, isLoading } = useQuery<ClassificacaoTime[]>({
    queryKey: ['campeonato', campeonatoId, 'fase-grupos', 'classificacao'],
    queryFn: async () => {
      const res = await api.get(`/campeonatos/${campeonatoId}/fase-grupos/classificacao`);
      return res.data;
    },
    enabled: isOpen
  });

  // Mutation para finalizar
  const finalizarMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/campeonatos/${campeonatoId}/fase-grupos/finalizar`);
      return res.data;
    },
    onSuccess: () => {
      setStep('sucesso');
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId] });
      toast.success('Fase de grupos finalizada! Mata-mata gerado.');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Erro ao finalizar fase de grupos');
    }
  });

  const handleFinalizar = () => {
    finalizarMutation.mutate();
  };

  const handleContinuar = () => {
    onSuccess();
    onClose();
    setStep('confirmar');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#0a1628] border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {step === 'confirmar' ? (
              <>
                <Trophy className="w-6 h-6 text-amber-400" />
                Finalizar Fase de Grupos
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                Mata-Mata Gerado!
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'confirmar' && (
            <motion.div
              key="confirmar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                </div>
              ) : classificacao && classificacao.length > 0 ? (
                <>
                  {/* Classificação */}
                  <div>
                    <h4 className="text-sm font-bold text-cyan-100/70 mb-3 flex items-center gap-2">
                      <Medal className="w-4 h-4 text-amber-400" />
                      Classificação Final
                    </h4>
                    <TabelaClassificacao 
                      classificacao={classificacao} 
                      highlightSemifinalistas 
                    />
                  </div>

                  {/* Preview do Bracket */}
                  <PreviewBracket classificacao={classificacao} />

                  {/* Aviso */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Ao finalizar, a fase de grupos será encerrada e o mata-mata será gerado 
                        automaticamente. Esta ação não pode ser desfeita.
                      </span>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 border-cyan-500/30 text-cyan-300"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleFinalizar}
                      disabled={finalizarMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold"
                    >
                      {finalizarMutation.isPending ? (
                        <><Loader2 className="mr-2 animate-spin" size={16} />Finalizando...</>
                      ) : (
                        <><Trophy className="mr-2" size={16} />Finalizar e Gerar Mata-Mata</>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-cyan-100/50">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma classificação disponível</p>
                </div>
              )}
            </motion.div>
          )}

          {step === 'sucesso' && (
            <motion.div
              key="sucesso"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center"
              >
                <Trophy className="w-10 h-10 text-white" />
              </motion.div>

              <h3 className="text-2xl font-black text-white mb-2">
                Mata-Mata Gerado!
              </h3>
              <p className="text-cyan-100/50 mb-6">
                As semifinais estão prontas. Que comecem os jogos decisivos!
              </p>

              <Button
                onClick={handleContinuar}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
              >
                <Swords className="mr-2" size={16} />
                Ver Chaveamento
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default FinalizarFaseGruposModal;