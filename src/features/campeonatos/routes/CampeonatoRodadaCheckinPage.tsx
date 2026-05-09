// Arquivo: src/features/Campeonatos/routes/CampeonatoRodadaCheckinPage.tsx
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Calendar, RefreshCw, Crown, Rat, Play, 
  AlertTriangle, Users, CheckCircle, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useElencoRodada, ElencoItem } from '@/features/rodadas/api/useCampeonatoRodadas';
import { CampeonatoSubstituicaoModal } from '../components/CampeonatoSubstituicaoModal';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

import { RodadaFinalizadaView } from '@/features/rodadas/components/RodadaFinalizadaView';

interface ElencoItemExt extends ElencoItem {
  is_pe_de_rato?: boolean | number;
}

export function CampeonatoRodadaCheckinPage() {
  const { id, rodadaId } = useParams<{ id: string; rodadaId: string }>();
  const navigate = useNavigate();
  const rId = Number(rodadaId);
  const cId = Number(id);

  // IMPORTANTE: Pegamos o refetch para forçar recarregamento após substituição
  const { data: elenco, isLoading, refetch: refetchElenco } = useElencoRodada(rId);
  
  const { data: rodadaInfo, isLoading: loadingInfo } = useQuery({
    queryKey: ['rodada', rId],
    queryFn: async () => (await api.get(`/rodadas/${rId}`)).data
  });
  
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ timeId: number, jogador: ElencoItemExt } | null>(null);

  // Handler para fechar o modal e recarregar os dados
  const handleCloseSubModal = () => {
    setSubModalOpen(false);
    setSelectedPlayer(null);
    // Força recarregar o elenco após fechar o modal (garante dados atualizados)
    refetchElenco();
  };

  const timesNaRodada = useMemo(() => {
    if (!elenco) return [];
    
    const grupos: Record<number, { id: number, nome: string, logo: string | null, jogadores: ElencoItemExt[] }> = {};
    
    elenco.forEach(item => {
      if (!grupos[item.time_id]) {
        grupos[item.time_id] = {
          id: item.time_id,
          nome: item.nome_time,
          logo: item.logo_time,
          jogadores: []
        };
      }
      grupos[item.time_id].jogadores.push(item);
    });

    return Object.values(grupos);
  }, [elenco]);

  const handleOpenSub = (timeId: number, jogador: ElencoItemExt) => {
    setSelectedPlayer({ timeId, jogador });
    setSubModalOpen(true);
  };

  const handleIniciarPartidas = () => {
    navigate(`/campeonatos/${cId}/rodadas/${rId}/partidas`);
  };

  if (isLoading || loadingInfo) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-cyan-100/50 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Rodada já finalizada
  if (rodadaInfo?.status === 'finalizada') {
    return (
      <div className="min-h-full">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <header className="mb-8">
            <Link
              to={`/campeonatos/${cId}`}
              className="inline-flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-4"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Voltar</span>
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
                    Resumo da Rodada
                  </span>
                </h1>
                <p className="text-cyan-100/50 text-sm">Esta rodada já foi encerrada</p>
              </div>
            </div>
          </header>

          <RodadaFinalizadaView rodadaId={rId} />
        </div>
      </div>
    );
  }

  // Fluxo normal: Check-in
  return (
    <div className="min-h-full pb-24">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Header */}
        <header className="mb-8">
          <Link
            to={`/campeonatos/${cId}`}
            className="inline-flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-4"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Voltar para Campeonato</span>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                    Check-in da Rodada
                  </span>
                </h1>
                <p className="text-cyan-100/50 text-sm">
                  Confirme os jogadores. Clique para substituir.
                </p>
              </div>
            </div>

            <Button
              onClick={handleIniciarPartidas}
              size="lg"
              className="w-full md:w-auto h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25"
            >
              <Play size={20} className="mr-2" />
              Ir para os Jogos
            </Button>
          </div>
        </header>

        {/* Grid de Times */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {timesNaRodada.map((time, index) => (
              <motion.div
                key={time.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 backdrop-blur-md overflow-hidden"
              >
                {/* Header do Time */}
                <div className="p-4 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0d1f35] border border-cyan-500/20 flex items-center justify-center overflow-hidden">
                      {time.logo ? (
                        <img src={time.logo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-cyan-400">{time.nome.substring(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{time.nome}</h3>
                      <span className="text-xs text-cyan-100/40">{time.jogadores.length} jogadores</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Jogadores */}
                <div className="p-2 space-y-1">
                  {time.jogadores.map((jogador, jIndex) => (
                    <motion.button
                      key={jogador.vinculo_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + jIndex * 0.02 }}
                      onClick={() => handleOpenSub(time.id, jogador)}
                      className="group w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-cyan-500/5 border border-transparent hover:border-cyan-500/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400 overflow-hidden">
                          {jogador.foto_url ? (
                            <img src={jogador.foto_url} className="w-full h-full object-cover" />
                          ) : (
                            jogador.nome_jogador.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium text-sm text-white flex items-center gap-2">
                            {jogador.nome_jogador}
                            {!!jogador.is_capitao && (
                              <Crown size={12} className="text-amber-400" fill="currentColor" />
                            )}
                            {!!jogador.is_pe_de_rato && (
                              <Rat size={12} className="text-orange-400" />
                            )}
                          </div>
                          <div className="text-[10px] text-cyan-100/40 uppercase">
                            {jogador.posicao}
                          </div>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg">
                          <RefreshCw size={12} />
                          Trocar
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {timesNaRodada.length === 0 && (
            <div className="col-span-full text-center p-12 rounded-xl border border-dashed border-cyan-500/20 bg-[#0a1628]/30">
              <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-amber-400/50" />
              <p className="text-cyan-100/50">
                Nenhum time encontrado para esta rodada.
              </p>
            </div>
          )}
        </div>

        {/* Modal de Substituição */}
        {subModalOpen && selectedPlayer && (
          <CampeonatoSubstituicaoModal
            isOpen={subModalOpen}
            onClose={handleCloseSubModal}
            rodadaId={rId}
            timeId={selectedPlayer.timeId}
            jogadorSaindo={selectedPlayer.jogador}
            jogadoresNaRodada={elenco || []}
          />
        )}
      </div>
    </div>
  );
}