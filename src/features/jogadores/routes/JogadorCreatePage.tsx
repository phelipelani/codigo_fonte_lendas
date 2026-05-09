// Arquivo: src/features/jogadores/routes/JogadorCreatePage.tsx
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { JogadorForm, JogadorFormSchema } from "../components/JogadorForm";
import { useCreateJogador } from "../api/useCreateJogador";
import { z } from "zod";

export const JogadorCreatePage = () => {
  const createMutation = useCreateJogador();

  const handleSubmit = (values: z.infer<typeof JogadorFormSchema>) => {
    createMutation.mutate(values);
  };

  return (
    <div className="space-y-6">
      {/* Header com animação */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-hero shadow-glow-cyan">
          <UserPlus className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="heading-gradient text-4xl md:text-5xl">
            Novo Jogador
          </h1>
          <p className="mt-1 text-textMuted">
            Cadastre um novo jogador no sistema
          </p>
        </div>
      </motion.div>

      {/* Card do Formulário */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-gradient rounded-2xl border border-borderLight p-6 shadow-card-hover md:p-8"
      >
        <JogadorForm
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
          submitButtonText="Criar Jogador"
        />
      </motion.div>
    </div>
  );
};