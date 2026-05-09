// Arquivo: src/features/jogadores/routes/JogadorEditPage.tsx
import { useParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { JogadorForm, JogadorFormSchema } from "../components/JogadorForm";
import { useJogador } from "../api/useJogador";
import { useUpdateJogador } from "../api/useUpdateJogador";

export const JogadorEditPage = () => {
  const { id } = useParams<{ id: string }>();
  
  // 1. Busca os dados atuais do jogador
  const { data: jogador, isLoading, isError } = useJogador(id!);
  
  // 2. Prepara a mutação de update
  const updateMutation = useUpdateJogador();

  const handleSubmit = (values: z.infer<typeof JogadorFormSchema>) => {
    updateMutation.mutate({ ...values, id: Number(id) });
  };

  // Estados de carregamento/erro da busca
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-textMuted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando dados do jogador...
      </div>
    );
  }
  if (isError || !jogador) {
    return (
       <div className="flex items-center justify-center p-8 text-danger">
        <AlertTriangle className="mr-2 h-5 w-5" />
        Não foi possível carregar os dados do jogador.
      </div>
    );
  }

  // 3. Renderiza o formulário com os dados pré-preenchidos
  return (
    <div className="container mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-bold text-textPrimary mb-6">
        Editar Jogador
      </h1>
      <div className="rounded-lg border border-border bg-surface p-6 shadow-md">
        <JogadorForm
          defaultValues={jogador}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          submitButtonText="Salvar Alterações"
        />
      </div>
    </div>
  );
};