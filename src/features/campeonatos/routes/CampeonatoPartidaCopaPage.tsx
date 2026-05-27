// Arquivo: src/features/campeonatos/routes/CampeonatoPartidaCopaPage.tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Loader2, Minus, Plus, Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api';

interface PartidaDetalhe {
  id: number;
  campeonato_id: number;
  timeA_id: number;
  timeB_id: number;
  placar_timeA?: number;
  placar_timeB?: number;
  status: string;
  timeA_nome?: string;
  timeB_nome?: string;
  timeA_logo?: string;
  timeB_logo?: string;
}

const ScoreControl = ({
  nome,
  logo,
  score,
  onChange,
}: {
  nome: string;
  logo?: string;
  score: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex flex-col items-center gap-4 flex-1">
    <div className="w-20 h-20 rounded-2xl bg-[#0a1628] border border-cyan-500/20 flex items-center justify-center overflow-hidden">
      {logo ? (
        <img src={logo} alt={nome} className="w-16 h-16 object-contain" />
      ) : (
        <span className="text-2xl font-black text-cyan-400">{nome.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
    <span className="font-bold text-white text-center text-sm px-2">{nome}</span>
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, score - 1))}
        className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
      >
        <Minus size={18} />
      </button>
      <span className="text-5xl font-black text-white tabular-nums w-16 text-center">{score}</span>
      <button
        onClick={() => onChange(score + 1)}
        className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/30 transition-colors"
      >
        <Plus size={18} />
      </button>
    </div>
  </div>
);

export function CampeonatoPartidaCopaPage() {
  const { id, partidaId } = useParams<{ id: string; partidaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const campeonatoId = Number(id);
  const pId = Number(partidaId);

  const [placarA, setPlacarA] = useState(0);
  const [placarB, setPlacarB] = useState(0);

  const { data: partida, isLoading } = useQuery<PartidaDetalhe>({
    queryKey: ['partida', pId, 'detalhe'],
    queryFn: async () => {
      const { data } = await api.get(`/partidas/${pId}/detalhes`);
      const p = data.partida ?? data;
      setPlacarA(p.placar_timeA ?? 0);
      setPlacarB(p.placar_timeB ?? 0);
      return p as PartidaDetalhe;
    },
    enabled: !!pId,
  });

  const finalizarMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/partidas/${pId}/finalizar`, {
        placar_timeA: placarA,
        placar_timeB: placarB,
        timeA_id: partida?.timeA_id,
        timeB_id: partida?.timeB_id,
      });
    },
    onSuccess: () => {
      toast.success('Partida finalizada!');
      queryClient.invalidateQueries({ queryKey: ['campeonato', campeonatoId, 'fase-grupos', 'partidas'] });
      queryClient.invalidateQueries({ queryKey: ['campeonatos', campeonatoId] });
      navigate(`/campeonatos/${campeonatoId}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erro ao finalizar partida'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!partida) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white">Partida não encontrada.</p>
        <Link to={`/campeonatos/${campeonatoId}`}><Button>Voltar</Button></Link>
      </div>
    );
  }

  const nomeA = partida.timeA_nome || 'Time A';
  const nomeB = partida.timeB_nome || 'Time B';
  const logoA = partida.timeA_logo;
  const logoB = partida.timeB_logo;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Header */}
        <header className="mb-8">
          <Link
            to={`/campeonatos/${campeonatoId}`}
            className="inline-flex items-center gap-2 text-cyan-100/50 hover:text-cyan-400 transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Voltar ao Campeonato</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Trophy className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Jogar Partida</h1>
              <p className="text-cyan-100/50 text-sm">Fase de Grupos</p>
            </div>
          </div>
        </header>

        {/* Placar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-purple-500/30 bg-[#0a1628]/80 p-8 mb-6"
        >
          <div className="flex items-center gap-4">
            <ScoreControl nome={nomeA} logo={logoA} score={placarA} onChange={setPlacarA} />

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <span className="text-4xl font-black text-cyan-500/30">×</span>
            </div>

            <ScoreControl nome={nomeB} logo={logoB} score={placarB} onChange={setPlacarB} />
          </div>

          {/* Resultado parcial */}
          <div className={cn(
            "mt-6 text-center text-sm font-semibold",
            placarA > placarB ? "text-emerald-400" : placarB > placarA ? "text-pink-400" : "text-cyan-100/50"
          )}>
            {placarA > placarB ? `${nomeA} vencendo` : placarB > placarA ? `${nomeB} vencendo` : 'Empate'}
          </div>
        </motion.div>

        {/* Botão finalizar */}
        <Button
          onClick={() => finalizarMutation.mutate()}
          disabled={finalizarMutation.isPending}
          className="w-full h-14 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold"
        >
          {finalizarMutation.isPending ? (
            <><Loader2 className="mr-2 animate-spin" size={20} />Finalizando...</>
          ) : (
            <><Flag className="mr-2" size={20} />Finalizar Partida</>
          )}
        </Button>
      </div>
    </div>
  );
}

export default CampeonatoPartidaCopaPage;
