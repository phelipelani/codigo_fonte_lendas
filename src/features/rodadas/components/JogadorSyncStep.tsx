// Arquivo: src/features/rodadas/components/JogadorSyncStep.tsx
import * as React from 'react';
import { Loader2, ClipboardList, Sparkles, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { useSyncJogadores } from '../api/useSyncJogadores';
import { toast } from 'sonner';

type JogadorSyncStepProps = {
  rodadaId: number;
}

export const JogadorSyncStep = ({ rodadaId }: JogadorSyncStepProps) => {
  const [listaTexto, setListaTexto] = React.useState('');
  const syncMutation = useSyncJogadores(rodadaId);

  const handleValidar = () => {
    const nomesDaLista = listaTexto
      .split('\n')
      .map(line => {
        // Remove TUDO que vier antes da primeira letra (Unicode-aware):
        // numeros, espacos, traco, ponto, parenteses, emojis, simbolos.
        // Ex: "- 01 Higor" -> "Higor", "1) João" -> "João", "🆐 Caio" -> "Caio"
        const semPrefixo = line.replace(/^[^\p{L}]+/u, '');

        // Remove TUDO que nao for letra/numero/apostrofo/hifen/ponto no fim
        // (preserva nomes como "D'Alessandro", "Jean-Baptiste", "Junior Jr.").
        const semSufixo = semPrefixo.replace(/[^\p{L}\p{N}.'\- ]+$/u, '');

        // Colapsa multiplos espacos internos em um so e tira borda
        return semSufixo.replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean);

    if (nomesDaLista.length === 0) {
      toast.error("Lista de jogadores está vazia ou não foi possível ler os nomes.");
      return;
    }

    syncMutation.mutate({ nomes: nomesDaLista });
  };

  const linhasPreenchidas = listaTexto.split('\n').filter(l => l.trim()).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full max-w-2xl mx-auto flex-col items-center"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/30 mb-4">
          <ClipboardList className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Lista de Jogadores
          </span>
        </h3>
        <p className="mt-2 text-cyan-100/50 text-sm">
          Cole a lista de jogadores confirmados (copiada do WhatsApp)
        </p>
      </div>

      {/* Textarea estilizado */}
      <div className="w-full relative">
        <Textarea
          value={listaTexto}
          onChange={(e) => setListaTexto(e.target.value)}
          placeholder="01 Lani 🆐🆐🆐💸&#10;02 Diego Borges 🆐🆐💵&#10;03 Caio 💴 &#10;O4 guedes 🀀&#10;05 Afranio 💴"
          className="min-h-[300px] w-full font-mono text-sm bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 
            focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl resize-none"
        />
        
        {/* Contador de linhas */}
        {linhasPreenchidas > 0 && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-medium">
            <Users size={12} />
            {linhasPreenchidas} jogadores
          </div>
        )}
      </div>

      {/* Dica */}
      <div className="w-full mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-xs text-amber-300/80 flex items-start gap-2">
          <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>Dica:</strong> A lista é limpa automaticamente, removendo números, emojis e símbolos. 
            Apenas os nomes serão extraídos.
          </span>
        </p>
      </div>

      {/* Botão */}
      <Button
        onClick={handleValidar}
        disabled={syncMutation.isPending || linhasPreenchidas === 0}
        className="mt-6 w-full max-w-md h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 
          text-white font-bold shadow-lg shadow-cyan-500/25 disabled:opacity-50"
        size="lg"
      >
        {syncMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <Users className="mr-2 h-5 w-5" />
            Validar e Carregar Jogadores
          </>
        )}
      </Button>
    </motion.div>
  );
};