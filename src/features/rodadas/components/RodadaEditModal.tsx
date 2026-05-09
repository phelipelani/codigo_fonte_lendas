// Arquivo: src/features/rodadas/components/RodadaEditModal.tsx
import * as React from 'react';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { RodadaForm, RodadaFormSchema } from "./RodadaForm";
import { useUpdateRodada } from "../api/useUpdateRodada";
import { Rodada } from '@/@types';

type RodadaEditModalProps = {
  rodada: Rodada;
  onClose: () => void;
}

export const RodadaEditModal = ({ rodada, onClose }: RodadaEditModalProps) => {
  const updateMutation = useUpdateRodada();

  const handleSubmit = (values: z.infer<typeof RodadaFormSchema>) => {
    updateMutation.mutate({ 
      ...values, 
      rodadaId: rodada.id, 
      ligaId: rodada.liga_id 
    }, {
      onSuccess: () => onClose(),
    });
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden">
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
                    Editar Rodada
                  </span>
                </DialogTitle>
                <DialogDescription className="text-cyan-100/50 mt-1">
                  Ajuste a data do dia de jogo
                </DialogDescription>
              </div>
            </motion.div>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Formulário */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 pt-4"
        >
          <RodadaForm 
            defaultValues={rodada}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
            onCancel={onClose}
            submitButtonText="Salvar Alteração"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}