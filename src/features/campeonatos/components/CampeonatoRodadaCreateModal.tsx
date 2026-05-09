// Arquivo: src/features/Campeonatos/components/CampeonatoRodadaCreateModal.tsx
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Sparkles, ArrowRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateRodadaCampeonato } from '@/features/rodadas/api/useCampeonatoRodadas';

const formSchema = z.object({
  data: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Data inválida",
  }),
});

type Props = {
  campeonatoId: number;
  isOpen: boolean;
  onClose: () => void;
};

export function CampeonatoRodadaCreateModal({ campeonatoId, isOpen, onClose }: Props) {
  const createMutation = useCreateRodadaCampeonato();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      data: new Date().toISOString().split('T')[0],
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    createMutation.mutate({
      campeonatoId,
      data: values.data
    }, {
      onSuccess: () => {
        onClose();
        form.reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a1628] border-cyan-500/20 p-0 overflow-hidden max-w-sm">
        {/* Header */}
        <div className="relative p-5 pb-4">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

          <DialogHeader className="relative">
            <DialogTitle className="flex items-center gap-3 text-xl font-black">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                </motion.div>
              </motion.div>
              <div>
                <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent block">
                  Nova Rodada
                </span>
                <span className="text-xs text-cyan-100/40 font-normal">
                  Defina a data do jogo
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-5 space-y-6">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-cyan-100/50 uppercase font-bold flex items-center gap-2">
                    <Calendar size={12} className="text-cyan-400" />
                    Data do Jogo
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      className="h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="h-11 text-cyan-100/70 hover:text-white hover:bg-cyan-500/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="h-11 px-5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    Criar Rodada
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}