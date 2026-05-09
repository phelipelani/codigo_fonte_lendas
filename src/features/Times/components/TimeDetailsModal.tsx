// Arquivo: src/features/times/components/TimeDetailsModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/Select';
import { 
  Crown, Rat, Trash2, Plus, UserPlus, Users, 
  Shield, Star, Loader2, X 
} from 'lucide-react';
import { 
  useJogadoresDoTime, useUpdateRole, useRemoveJogadorTime, useAddJogadoresTime 
} from '@/api/timeApi';
import { useJogadores } from '@/features/jogadores/api/useJogadores';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { JogadorNoTime, Time } from '@/@types';
import { useAuth } from '@/hooks/useAuth';

interface TimeDetailsModalProps {
  time: Time | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TimeDetailsModal({ time, isOpen, onClose }: TimeDetailsModalProps) {
  const { isAdmin } = useAuth();
  const timeId = time?.id || 0;
  
  const { data: elenco, isLoading: loadingElenco } = useJogadoresDoTime(isOpen ? timeId : null);
  const { data: todosJogadores } = useJogadores();
  
  const updateRoleMutation = useUpdateRole();
  const removeMutation = useRemoveJogadorTime();
  const addMutation = useAddJogadoresTime();

  const [jogadorToAdd, setJogadorToAdd] = useState<string>('');

  const toggleCapitao = (j: JogadorNoTime) => {
    updateRoleMutation.mutate({
      timeId,
      jogadorId: j.id,
      role: { is_capitao: !j.is_capitao }
    });
  };

  const togglePeDeRato = (j: JogadorNoTime) => {
    updateRoleMutation.mutate({
      timeId,
      jogadorId: j.id,
      role: { is_pe_de_rato: !j.is_pe_de_rato }
    });
  };

  const handleRemove = (id: number) => {
    if(confirm('Remover jogador do time?')) {
      removeMutation.mutate({ timeId, jogadorId: id });
    }
  };

  const handleAdd = () => {
    if (!jogadorToAdd) return;
    addMutation.mutate({ timeId, jogadorIds: [Number(jogadorToAdd)] }, {
      onSuccess: () => {
        toast.success('Jogador adicionado!');
        setJogadorToAdd('');
      }
    });
  };

  const disponiveis = todosJogadores?.filter(j => !elenco?.some(e => e.id === j.id));

  const totalJogadores = elenco?.length || 0;
  const capitao = elenco?.find(j => j.is_capitao);
  const peDeRato = elenco?.find(j => j.is_pe_de_rato);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* ── Logo do time como watermark de fundo ── */}
        {time?.logo_url && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg"
            style={{ zIndex: 0 }}
          >
            {/* Logo grande centralizado */}
            <img
              src={time.logo_url}
              alt=""
              className="absolute"
              style={{
                width: '75%',
                maxWidth: 420,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.045,
                filter: 'blur(2px) saturate(0.5)',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
            {/* Gradiente radial para suavizar as bordas */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, #0a1628 80%)',
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-cyan-500/10" style={{ zIndex: 1 }}>
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                {/* Logo do Time */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/10">
                  {time?.logo_url ? (
                    <img src={time.logo_url} className="w-full h-full object-cover" alt={time.nome} />
                  ) : (
                    <Shield size={24} className="text-cyan-400" />
                  )}
                </div>
                
                <div>
                  <DialogTitle className="text-xl font-black">
                    <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                      {time?.nome}
                    </span>
                  </DialogTitle>
                  <p className="text-xs text-cyan-100/40 mt-0.5">{isAdmin ? 'Gestão de Elenco' : 'Elenco do Time'}</p>
                </div>
              </div>
              
              {/* Badge Total */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 sm:ml-auto">
                <Users size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-300">
                  {totalJogadores} {totalJogadores === 1 ? 'Jogador' : 'Jogadores'}
                </span>
              </div>
            </div>

            {/* Roles Ativas */}
            {(capitao || peDeRato) && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-cyan-500/10">
                {capitao && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30">
                    <Crown size={14} className="text-amber-400" fill="currentColor" />
                    <span className="text-xs font-medium text-amber-300">Capitão: {capitao.nome}</span>
                  </div>
                )}
                {peDeRato && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <Rat size={14} className="text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">Pé de Rato: {peDeRato.nome}</span>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 relative" style={{ zIndex: 1 }}>
          
          {/* Área de Adicionar — apenas admin */}
          {isAdmin && (
          <div className="rounded-xl border border-cyan-500/20 bg-[#0d1f35]/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <UserPlus size={16} className="text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm text-white">Adicionar Jogador</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Select value={jogadorToAdd} onValueChange={setJogadorToAdd}>
                  <SelectTrigger className="h-11 bg-[#0a1628] border-cyan-500/20 text-white hover:border-cyan-500/40">
                    <SelectValue placeholder="Selecione um jogador..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a1628] border-cyan-500/20 max-h-60 overflow-y-auto">
                    {disponiveis?.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-cyan-100/50">
                        Todos os jogadores já estão no time
                      </div>
                    ) : (
                      disponiveis?.map(j => (
                        <SelectItem 
                          key={j.id} 
                          value={String(j.id)}
                          className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{j.nome}</span>
                            <span className="text-xs text-cyan-100/40">• {j.posicao}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAdd} 
                disabled={!jogadorToAdd || addMutation.isPending}
                className="h-11 px-5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
              >
                {addMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={18} className="sm:mr-2" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          )}

          {/* Lista de Jogadores */}
          <div>
            <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Users size={16} className="text-cyan-400" />
              Elenco Atual
            </h3>
            
            {loadingElenco ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl border border-cyan-500/20 bg-[#0d1f35]/50 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {elenco?.map((jogador, index) => (
                    <motion.div
                      key={jogador.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all",
                        "hover:shadow-lg",
                        jogador.is_capitao && "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50",
                        jogador.is_pe_de_rato && !jogador.is_capitao && "bg-orange-500/5 border-orange-500/30 hover:border-orange-500/50",
                        !jogador.is_capitao && !jogador.is_pe_de_rato && "bg-[#0d1f35]/50 border-cyan-500/20 hover:border-cyan-500/40"
                      )}
                    >
                      {/* Foto */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 overflow-hidden">
                          {jogador.foto_url ? (
                            <img src={jogador.foto_url} className="w-full h-full object-cover" alt={jogador.nome} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-cyan-400">
                              {jogador.nome.substring(0,2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Badge de Role */}
                        {jogador.is_capitao && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                            <Crown size={10} className="text-amber-900" fill="currentColor" />
                          </div>
                        )}
                        {jogador.is_pe_de_rato && !jogador.is_capitao && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                            <Rat size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white truncate">{jogador.nome}</p>
                        <p className="text-xs text-cyan-100/40">{jogador.posicao}</p>
                      </div>

                      {/* Ações — apenas admin */}
                      {isAdmin && (
                      <div className="flex items-center gap-1">
                        {/* Capitão */}
                        <button 
                          onClick={() => toggleCapitao(jogador)}
                          title={jogador.is_capitao ? "Remover Capitão" : "Definir como Capitão"}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            jogador.is_capitao 
                              ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" 
                              : "text-cyan-100/30 hover:text-amber-400 hover:bg-amber-500/10"
                          )}
                        >
                          <Crown size={16} fill={jogador.is_capitao ? "currentColor" : "none"} />
                        </button>

                        {/* Pé de Rato */}
                        <button 
                          onClick={() => togglePeDeRato(jogador)}
                          title={jogador.is_pe_de_rato ? "Remover Pé de Rato" : "Definir como Pé de Rato"}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            jogador.is_pe_de_rato 
                              ? "text-orange-400 bg-orange-500/20 hover:bg-orange-500/30" 
                              : "text-cyan-100/30 hover:text-orange-400 hover:bg-orange-500/10"
                          )}
                        >
                          <Rat size={16} />
                        </button>
                        
                        {/* Remover */}
                        <button 
                          onClick={() => handleRemove(jogador.id)}
                          title="Remover do Time"
                          className="p-2 text-cyan-100/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Empty State */}
                {elenco?.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-cyan-500/20 bg-[#0d1f35]/30">
                    <div className="w-16 h-16 rounded-2xl bg-[#0a1628] border border-cyan-500/20 flex items-center justify-center mb-4">
                      <Users size={28} className="text-cyan-400/30" />
                    </div>
                    <p className="text-white font-medium mb-1">Nenhum jogador no elenco</p>
                    <p className="text-cyan-100/40 text-sm text-center">
                      Adicione jogadores usando o seletor acima
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}