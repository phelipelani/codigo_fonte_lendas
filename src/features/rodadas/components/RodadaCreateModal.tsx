// Arquivo: src/features/rodadas/components/RodadaCreateModal.tsx
import * as React from 'react';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Calendar, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { RodadaForm, RodadaFormSchema } from "./RodadaForm";
import { useCreateRodada } from "../api/useCreateRodada";

type RodadaCreateModalProps = {
  ligaId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RodadaCreateModal = ({ ligaId, isOpen, onClose }: RodadaCreateModalProps) => {
  const createMutation = useCreateRodada();

  const handleSubmit = (values: z.infer<typeof RodadaFormSchema>) => {
    createMutation.mutate({ ...values, ligaId }, {
      onSuccess: () => onClose(),
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden">
        {/* Header com gradiente */}
        <div className="relative p-6 pb-4">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </motion.div>
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Nova Rodada
                  </span>
                </DialogTitle>
                <DialogDescription className="text-cyan-100/50 mt-1">
                  Marque um novo dia de jogo
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
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending}
            onCancel={onClose}
            submitButtonText="Criar Rodada"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}