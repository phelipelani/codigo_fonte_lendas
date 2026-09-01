import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import api from "@/api";
import { useJogadores } from "@/features/jogadores/api/useJogadores";

import { RivalidadeHeader } from "./RivalidadeHeader";
import { PlayerSelector } from "./PlayerSelector";
import { PlayerSelectionSheet } from "./PlayerSelectionSheet";
import { ComparisonMetric } from "./ComparisonMetric";
import { DirectConfrontation } from "./DirectConfrontation";
import { RivalryHighlights } from "./RivalryHighlights";
import { RivalryInsight } from "./RivalryInsight";
import { TacticalReading } from "./TacticalReading";

export function RivalidadesPage() {
  const { data: todosJogadores } = useJogadores();

  const [jogadorAId, setJogadorAId] = useState<string>("");
  const [jogadorBId, setJogadorBId] = useState<string>("");

  const [isSheetAOpen, setIsSheetAOpen] = useState(false);
  const [isSheetBOpen, setIsSheetBOpen] = useState(false);

  const { data: confronto, isLoading } = useQuery({
    queryKey: ["analytics", "confronto", jogadorAId, jogadorBId],
    queryFn: async () => {
      if (!jogadorAId || !jogadorBId) return null;
      const res = await api.get(
        `/analytics/confronto/${jogadorAId}/${jogadorBId}`,
      );
      return res.data;
    },
    enabled: !!jogadorAId && !!jogadorBId && jogadorAId !== jogadorBId,
  });

  const listaJogadores = todosJogadores || [];

  const jogA = confronto?.jogadorA;
  const jogB = confronto?.jogadorB;
  const statsA = jogA?.stats || {};
  const statsB = jogB?.stats || {};
  const desA = jogA?.desempenho || {
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
  };
  const desB = jogB?.desempenho || {
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
  };
  const conf = confronto?.confronto || {
    jogos: 0,
    vitorias_A: 0,
    vitorias_B: 0,
    empates: 0,
    gols_A: 0,
    gols_B: 0,
  };
  const parc = confronto?.parceria || {
    jogos_juntos: 0,
    vitorias_juntos: 0,
    gols_A_assistidos_por_B: 0,
    gols_B_assistidos_por_A: 0,
  };

  const calcAprov = (v: number = 0, e: number = 0, j: number = 0) => {
    if (!j) return 0;
    return Math.round(((v * 3 + e) / (j * 3)) * 100);
  };
  const aprovA = calcAprov(
    desA.vitorias || 0,
    desA.empates || 0,
    desA.jogos || 0,
  );
  const aprovB = calcAprov(
    desB.vitorias || 0,
    desB.empates || 0,
    desB.jogos || 0,
  );

  // Auto-open second selector
  useEffect(() => {
    if (jogadorAId && !jogadorBId) {
      // Pequeno delay para a animação do bottom sheet do A terminar
      const t = setTimeout(() => setIsSheetBOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [jogadorAId, jogadorBId]);

  const handleSwap = () => {
    setJogadorAId(jogadorBId);
    setJogadorBId(jogadorAId);
  };

  const getJogadorFromList = (id: string) =>
    listaJogadores.find((j: any) => String(j.id) === id) || null;

  return (
    <div className="w-full max-w-[1350px] mx-auto pb-24 sm:pb-8">
      <RivalidadeHeader
        jogadorA={getJogadorFromList(jogadorAId)?.nome}
        jogadorB={getJogadorFromList(jogadorBId)?.nome}
      />

      <PlayerSelector
        jogadorA={getJogadorFromList(jogadorAId)}
        jogadorB={getJogadorFromList(jogadorBId)}
        onOpenSelectorA={() => setIsSheetAOpen(true)}
        onOpenSelectorB={() => setIsSheetBOpen(true)}
        onSwap={handleSwap}
      />

      <PlayerSelectionSheet
        open={isSheetAOpen}
        onOpenChange={setIsSheetAOpen}
        title="ESCOLHER JOGADOR"
        jogadores={listaJogadores}
        onSelect={setJogadorAId}
        excludeId={jogadorBId}
        playerColor="cyan"
      />

      <PlayerSelectionSheet
        open={isSheetBOpen}
        onOpenChange={setIsSheetBOpen}
        title="ESCOLHER JOGADOR"
        jogadores={listaJogadores}
        onSelect={setJogadorBId}
        excludeId={jogadorAId}
        playerColor="purple"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      <AnimatePresence mode="wait">
        {confronto && jogA && jogB && !isLoading && (
          <motion.div
            key={`${jogadorAId}-${jogadorBId}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12"
          >
            {/* Coluna 2: Confronto Direto, Jogaram Juntos e Insights */}
            <div>
              <DirectConfrontation
                confronto={conf}
                jogadorA_nome={jogA.nome}
                jogadorB_nome={jogB.nome}
              />

              <div className="bg-surface/30 rounded-2xl p-5 border border-border/50 mt-8">
                <RivalryInsight
                  jogadorA_nome={jogA.nome}
                  jogadorB_nome={jogB.nome}
                  confronto={conf}
                  statsA={statsA}
                  statsB={statsB}
                />

                <TacticalReading
                  jogadorA_nome={jogA.nome}
                  jogadorB_nome={jogB.nome}
                  statsA={statsA}
                  statsB={statsB}
                  aprovA={aprovA}
                  aprovB={aprovB}
                />
              </div>
            </div>
            {/* Coluna 1: Comparação Principal e Destaques */}
            <div>
              <div className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6">
                  Resumo do Confronto
                </h3>
                <div className="bg-surface/30 rounded-3xl p-5 sm:p-8 border border-border/50 shadow-xl">
                  <ComparisonMetric
                    label="Jogos"
                    valueA={statsA.jogos || 0}
                    valueB={statsB.jogos || 0}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                  />
                  <ComparisonMetric
                    label="Gols"
                    valueA={statsA.gols || 0}
                    valueB={statsB.gols || 0}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                  />
                  <ComparisonMetric
                    label="Assistências"
                    valueA={statsA.assists || 0}
                    valueB={statsB.assists || 0}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                  />
                  <ComparisonMetric
                    label="Clean Sheets"
                    valueA={statsA.clean_sheets || 0}
                    valueB={statsB.clean_sheets || 0}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                  />
                  <ComparisonMetric
                    label="Vitórias"
                    valueA={desA.vitorias || 0}
                    valueB={desB.vitorias || 0}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                  />
                  <ComparisonMetric
                    label="Aproveitamento"
                    valueA={aprovA}
                    valueB={aprovB}
                    jogadorA_nome={jogA.nome}
                    jogadorB_nome={jogB.nome}
                    suffix="%"
                  />
                </div>
              </div>

              <RivalryHighlights
                jogadorA_nome={jogA.nome}
                jogadorB_nome={jogB.nome}
                desA={desA}
                desB={desB}
                statsA={statsA}
                statsB={statsB}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
