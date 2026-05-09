// Arquivo: src/features/ligas/components/LigaEditModal.tsx
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Edit, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/Dialog';
import { useLiga } from '../api/useLigas';
import { useUpdateLiga } from '../api/useUpdateLiga';
import { LigaForm, LigaFormSchema } from './LigaForm';

type LigaEditModalProps = {
  ligaId: number;
  onClose: () => void;
};

export const LigaEditModal = ({ ligaId, onClose }: LigaEditModalProps) => {
  const { data: liga, isLoading: isLoadingLiga, isError } = useLiga(ligaId);
  const updateMutation = useUpdateLiga();

  const handleSubmit = (values: z.infer<typeof LigaFormSchema>) => {
    updateMutation.mutate(
      { ...values, id: ligaId },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-[#0a1628] border-cyan-500/20 p-0 overflow-y-auto">
        {/* Header com gradiente */}
        <div className="relative p-6 pb-4">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
                <Edit className="h-7 w-7 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                    Editar Liga
                  </span>
                </DialogTitle>
                <DialogDescription className="text-cyan-100/50 mt-1">
                  Ajuste os detalhes da temporada
                </DialogDescription>
              </div>
            </motion.div>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Loading State */}
        {isLoadingLiga && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-cyan-100/50 text-sm">Carregando dados...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
              <p className="text-red-400 text-sm">Erro ao carregar liga</p>
            </div>
          </div>
        )}

        {/* Form */}
        {liga && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="p-6 pt-4"
          >
            <LigaForm
              defaultValues={liga}
              onSubmit={handleSubmit}
              isLoading={updateMutation.isPending}
              onCancel={onClose}
              submitButtonText="Salvar Alterações"
            />
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};