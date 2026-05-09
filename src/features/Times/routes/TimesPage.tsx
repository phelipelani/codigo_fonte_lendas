// Arquivo: src/features/times/pages/TimesPage.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Users, Shield, Crown, Calendar, MoreVertical, 
  Pencil, Trash2, Trophy, Star, Loader2, ArrowRight 
} from 'lucide-react';
import { useAllTimes, useCreateTime, useUpdateTime, useDeleteTime } from '@/api/timeApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/Dialog';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/DropdownMenu';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/AlertDialog';
import { toast } from 'sonner';
import { TimeDetailsModal } from '../components/TimeDetailsModal';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import icTimes from '@/assets/icones/times.webp';
import { JogadorPhotoUpload } from '@/features/jogadores/components/JogadorPhotoUpload_S3';
import { Time } from '@/@types';
import PageTitle from '@/components/shared/PageTitle';

export function TimesPage() {
  const { isAdmin } = useAuth();
  const { data: times, isLoading } = useAllTimes();
  const createMutation = useCreateTime();
  const updateMutation = useUpdateTime();
  const deleteMutation = useDeleteTime();
  
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTime, setEditingTime] = useState<Time | null>(null);
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formData, setFormData] = useState('');
  const [managingTime, setManagingTime] = useState<Time | null>(null);
  const [timeToDelete, setTimeToDelete] = useState<Time | null>(null);

  const openCreate = () => {
    setEditingTime(null);
    setFormName('');
    setFormLogo('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormOpen(true);
  };

  const openEdit = (time: Time, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setEditingTime(time);
    setFormName(time.nome);
    setFormLogo(time.logo_url || '');
    const dataValida = time.criadoEm ? new Date(time.criadoEm).toISOString().split('T')[0] : '';
    setFormData(dataValida);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!formName) return;

    if (editingTime) {
      updateMutation.mutate({
        id: editingTime.id,
        nome: formName,
        logo_url: formLogo,
        criadoEm: formData
      }, {
        onSuccess: () => {
          toast.success('Time atualizado!');
          setFormOpen(false);
        },
        onError: () => toast.error('Erro ao atualizar.')
      });
    } else {
      createMutation.mutate({ 
        nome: formName, 
        logo_url: formLogo 
      }, {
        onSuccess: () => {
          toast.success('Time criado com sucesso!');
          setFormOpen(false);
        },
        onError: () => toast.error('Erro ao criar time.')
      });
    }
  };

  const handleDelete = (time: Time, e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setTimeToDelete(time);
  };

  const confirmDelete = () => {
    if(!timeToDelete) return;
    deleteMutation.mutate(timeToDelete.id, {
      onSuccess: () => {
        toast.success('Time removido.');
        setTimeToDelete(null);
      },
      onError: () => toast.error('Erro ao remover time.')
    });
  };

  // Stats
  const totalTimes = times?.length || 0;
  const timesComCapitao = times?.filter(t => t.nome_capitao).length || 0;

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Header */}
        <header className="mb-8">
          <PageTitle
            icon={icTimes}
            title="Times"
            subtitle="Gerencie elencos, capitães e histórico dos times"
          >
            {isAdmin && (
              <Button
                onClick={openCreate}
                className="h-11 px-5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25"
              >
                <Plus size={20} className="mr-2" />
                Novo Time
              </Button>
            )}
          </PageTitle>

          {/* Stats Cards */}
          {times && times.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={16} className="text-cyan-400" />
                  <span className="text-[10px] text-cyan-100/50 uppercase font-bold">Total</span>
                </div>
                <p className="text-2xl font-black text-white">{totalTimes}</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={16} className="text-amber-400" />
                  <span className="text-[10px] text-amber-300/60 uppercase font-bold">Com Capitão</span>
                </div>
                <p className="text-2xl font-black text-amber-400">{timesComCapitao}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-300/60 uppercase font-bold">Ativos</span>
                </div>
                <p className="text-2xl font-black text-emerald-400">{totalTimes}</p>
              </motion.div>
            </div>
          )}
        </header>

        {/* Grid de Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Loading */}
          {isLoading && (
            <>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i} 
                  className="h-56 rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 animate-pulse"
                />
              ))}
            </>
          )}

          {/* Cards de Times */}
          <AnimatePresence mode="popLayout">
            {times?.map((time, index) => (
              <motion.div
                key={time.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setManagingTime(time)}
                className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md cursor-pointer hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 transition-all"
              >
                {/* Linha colorida no topo */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />

                {/* Menu de Ações — apenas admin */}
                {isAdmin && (
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 rounded-lg bg-[#0d1f35]/80 border border-cyan-500/20 flex items-center justify-center text-cyan-100/50 hover:text-white hover:border-cyan-500/40 transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#0a1628] border-cyan-500/20">
                      <DropdownMenuItem 
                        onClick={(e) => openEdit(time, e)}
                        className="text-cyan-100 hover:bg-cyan-500/10 cursor-pointer"
                      >
                        <Pencil size={14} className="mr-2 text-cyan-400" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(time, e)}
                        className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 size={14} className="mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                )}

                {/* Conteúdo */}
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-4">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {time.logo_url ? (
                        <img src={time.logo_url} className="w-full h-full object-cover" alt={time.nome} />
                      ) : (
                        <Shield size={28} className="text-cyan-400" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-white truncate mb-1">
                        {time.nome}
                      </h3>
                      {time.criadoEm && (
                        <div className="flex items-center gap-1.5 text-xs text-cyan-100/40">
                          <Calendar size={12} />
                          <span>Fundado em {formatDate(time.criadoEm)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Capitão */}
                  <div className={cn(
                    "rounded-lg p-3 flex items-center gap-3",
                    time.nome_capitao 
                      ? "bg-amber-500/10 border border-amber-500/20" 
                      : "bg-[#0d1f35]/50 border border-cyan-500/10"
                  )}>
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      time.nome_capitao ? "bg-amber-500/20" : "bg-cyan-500/10"
                    )}>
                      <Crown 
                        size={18} 
                        className={time.nome_capitao ? "text-amber-400" : "text-cyan-100/30"} 
                        fill={time.nome_capitao ? "currentColor" : "none"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-cyan-100/40 uppercase font-bold">Capitão</p>
                      <p className={cn(
                        "text-sm font-semibold truncate",
                        time.nome_capitao ? "text-amber-300" : "text-cyan-100/30"
                      )}>
                        {time.nome_capitao || "Não definido"}
                      </p>
                    </div>
                    {time.nome_capitao && (
                      <Star size={14} className="text-amber-400 flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                </div>

                {/* Rodapé */}
                <div className="px-5 py-3 border-t border-cyan-500/10 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-cyan-100/40 uppercase tracking-wider font-bold group-hover:text-cyan-300 transition-colors">
                      {isAdmin ? 'Gerenciar Elenco' : 'Ver Elenco'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-cyan-100/40 group-hover:text-cyan-400 transition-colors" />
                      <ArrowRight size={14} className="text-cyan-100/40 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {!isLoading && times?.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-2xl bg-[#0d1f35] border-2 border-dashed border-cyan-500/20 flex items-center justify-center mb-6">
                <Shield size={40} className="text-cyan-400/30" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhum time cadastrado</h3>
              <p className="text-cyan-100/50 text-center mb-6 max-w-md text-sm">
                Crie seu primeiro time para começar a gerenciar elencos e capitães.
              </p>
              {isAdmin && (
                <Button 
                  onClick={openCreate} 
                  className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
                >
                  <Plus size={20} className="mr-2" /> 
                  Criar Primeiro Time
                </Button>
              )}
            </div>
          )}
        </div>

        {/* === DIALOG: CRIAR / EDITAR TIME === */}
        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogContent className="bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden">
            {/* Header */}
            <div className="relative p-5 pb-4">
              <div className={cn(
                "absolute top-0 left-0 right-0 h-24 pointer-events-none",
                editingTime 
                  ? "bg-gradient-to-b from-amber-500/10 to-transparent" 
                  : "bg-gradient-to-b from-cyan-500/10 to-transparent"
              )} />
              
              <DialogHeader className="relative">
                <DialogTitle className="flex items-center gap-3 text-xl font-black">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                    editingTime
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30"
                      : "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-cyan-500/30"
                  )}>
                    {editingTime ? (
                      <Pencil className="h-5 w-5 text-white" />
                    ) : (
                      <Plus className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className={cn(
                    "bg-clip-text text-transparent",
                    editingTime
                      ? "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300"
                      : "bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300"
                  )}>
                    {editingTime ? 'Editar Time' : 'Novo Time'}
                  </span>
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

            {/* Form */}
            <div className="p-5 space-y-6">
              {/* Upload de Logo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32">
                  <JogadorPhotoUpload 
                    currentPhotoUrl={formLogo} 
                    onPhotoChange={setFormLogo}
                    playerName={formName || 'Time'} 
                  />
                </div>
                <p className="text-xs text-cyan-100/40 text-center">
                  Clique para upload do logo
                </p>
              </div>

              {/* Nome do Time */}
              <div>
                <label className="text-xs text-cyan-100/50 uppercase font-bold mb-2 flex items-center gap-2">
                  <Shield size={12} className="text-cyan-400" />
                  Nome do Time
                </label>
                <Input 
                  placeholder="Ex: Dragões da Fiel" 
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Data de Fundação */}
              <div>
                <label className="text-xs text-cyan-100/50 uppercase font-bold mb-2 flex items-center gap-2">
                  <Calendar size={12} className="text-cyan-400" />
                  Data de Fundação
                </label>
                <Input 
                  type="date"
                  value={formData}
                  onChange={e => setFormData(e.target.value)}
                  className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="p-5 pt-0 gap-2">
              <Button 
                variant="ghost" 
                onClick={() => setFormOpen(false)}
                className="h-11 text-cyan-100/70 hover:text-white hover:bg-cyan-500/10"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formName || createMutation.isPending || updateMutation.isPending}
                className="h-11 px-6 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* === ALERT: DELETAR TIME === */}
        <AlertDialog open={!!timeToDelete} onOpenChange={() => setTimeToDelete(null)}>
          <AlertDialogContent className="bg-[#0a1628] border-red-500/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-3 text-xl font-black">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-red-300 via-rose-200 to-red-300 bg-clip-text text-transparent">
                  Excluir Time?
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-cyan-100/60 mt-3">
                Você tem certeza que deseja excluir{' '}
                <span className="font-bold text-white">{timeToDelete?.nome}</span>?
                <br /><br />
                <span className="text-red-400 font-semibold">⚠️ Atenção:</span>{' '}
                Isso removerá o time e todos os vínculos de elenco atuais.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="h-11 bg-transparent border-cyan-500/20 text-cyan-100/70 hover:text-white hover:bg-cyan-500/10">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="h-11 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold"
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Sim, Excluir'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Detalhes (Gestão de Elenco) */}
        {managingTime && (
          <TimeDetailsModal 
            time={managingTime} 
            isOpen={!!managingTime} 
            onClose={() => setManagingTime(null)} 
          />
        )}
      </div>
    </div>
  );
}