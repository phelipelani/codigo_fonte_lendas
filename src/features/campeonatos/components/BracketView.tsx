// Arquivo: src/features/Campeonatos/components/BracketView.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/api';
import { 
  Trophy, Swords, GitBranch, Crown, Loader2, 
  ChevronRight, AlertTriangle, Medal 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Partida {
  id: number;
  timeA_id: number;
  timeA_nome: string;
  timeA_logo: string | null;
  timeB_id: number;
  timeB_nome: string;
  timeB_logo: string | null;
  placar_timeA: number | null;
  placar_timeB: number | null;
  placar_penaltis_timeA: number | null;
  placar_penaltis_timeB: number | null;
  status: string;
  fase_mata_mata: string;
  bracket: string;
  ordem_confronto: number;
}

interface BracketData {
  campeonato: {
    id: number;
    nome: string;
    tem_repescagem: boolean;
    tem_terceiro_lugar: boolean;
  };
  bracket: {
    upper: Record<string, Partida[]>;
    lower: Record<string, Partida[]>;
    terceiro_lugar: Partida | null;
    grand_final: Partida | null;
  };
}

// Componente de Card de Partida
const PartidaCard = ({ partida, isGrandFinal = false }: { partida: Partida; isGrandFinal?: boolean }) => {
  const isFinalizada = partida.status === 'finalizada';
  const temPenaltis = partida.placar_penaltis_timeA !== null;
  
  const getVencedor = () => {
    if (!isFinalizada) return null;
    if (partida.placar_timeA! > partida.placar_timeB!) return 'A';
    if (partida.placar_timeB! > partida.placar_timeA!) return 'B';
    if (temPenaltis) {
      if (partida.placar_penaltis_timeA! > partida.placar_penaltis_timeB!) return 'A';
      if (partida.placar_penaltis_timeB! > partida.placar_penaltis_timeA!) return 'B';
    }
    return null;
  };

  const vencedor = getVencedor();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-xl border overflow-hidden",
        isGrandFinal 
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10" 
          : "border-cyan-500/20 bg-[#0a1628]/50"
      )}
    >
      {/* Header da Partida */}
      <div className={cn(
        "px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-center",
        isGrandFinal 
          ? "bg-amber-500/20 text-amber-300" 
          : "bg-cyan-500/10 text-cyan-400"
      )}>
        {partida.fase_mata_mata === 'quartas' && 'Quartas de Final'}
        {partida.fase_mata_mata === 'semifinal' && 'Semifinal'}
        {partida.fase_mata_mata === 'final' && 'Final'}
        {partida.fase_mata_mata === 'terceiro_lugar' && '3º Lugar'}
        {partida.fase_mata_mata === 'upper_r1' && 'Upper Bracket'}
        {partida.fase_mata_mata === 'lower_r1' && 'Lower R1 (Jogo da Vida)'}
        {partida.fase_mata_mata === 'lower_r2' && 'Lower R2 (Repescagem)'}
        {partida.fase_mata_mata === 'grand_final' && 'Grand Final'}
      </div>

      {/* Time A */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b border-cyan-500/10",
        isFinalizada && vencedor === 'A' && "bg-emerald-500/10"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0d1f35] border border-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {partida.timeA_logo ? (
              <img src={partida.timeA_logo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-cyan-400">
                {partida.timeA_nome?.substring(0, 2).toUpperCase() || '??'}
              </span>
            )}
          </div>
          <span className={cn(
            "text-sm font-medium truncate",
            isFinalizada && vencedor === 'A' ? "text-emerald-400 font-bold" : "text-white"
          )}>
            {partida.timeA_nome || 'A definir'}
          </span>
          {isFinalizada && vencedor === 'A' && (
            <Crown size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-lg font-black w-6 text-center",
            isFinalizada ? (vencedor === 'A' ? "text-emerald-400" : "text-white") : "text-cyan-100/30"
          )}>
            {partida.placar_timeA ?? '-'}
          </span>
          {temPenaltis && (
            <span className="text-[10px] text-amber-400">({partida.placar_penaltis_timeA})</span>
          )}
        </div>
      </div>

      {/* Time B */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2",
        isFinalizada && vencedor === 'B' && "bg-emerald-500/10"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0d1f35] border border-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {partida.timeB_logo ? (
              <img src={partida.timeB_logo} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-cyan-400">
                {partida.timeB_nome?.substring(0, 2).toUpperCase() || '??'}
              </span>
            )}
          </div>
          <span className={cn(
            "text-sm font-medium truncate",
            isFinalizada && vencedor === 'B' ? "text-emerald-400 font-bold" : "text-white"
          )}>
            {partida.timeB_nome || 'A definir'}
          </span>
          {isFinalizada && vencedor === 'B' && (
            <Crown size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className={cn(
            "text-lg font-black w-6 text-center",
            isFinalizada ? (vencedor === 'B' ? "text-emerald-400" : "text-white") : "text-cyan-100/30"
          )}>
            {partida.placar_timeB ?? '-'}
          </span>
          {temPenaltis && (
            <span className="text-[10px] text-amber-400">({partida.placar_penaltis_timeB})</span>
          )}
        </div>
      </div>

      {/* Status */}
      <div className={cn(
        "px-3 py-1.5 text-[10px] text-center font-medium",
        isFinalizada ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/5 text-cyan-100/40"
      )}>
        {isFinalizada ? 'Finalizada' : 'Aguardando'}
      </div>
    </motion.div>
  );
};

// Componente Principal
export function BracketView({ campeonatoId }: { campeonatoId: number }) {
  const { data, isLoading, error } = useQuery<BracketData>({
    queryKey: ['bracket', campeonatoId],
    queryFn: async () => {
      const res = await api.get(`/campeonatos/${campeonatoId}/bracket`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-12 w-12 mb-4 text-red-400/50" />
        <p className="text-red-300">Erro ao carregar o bracket</p>
      </div>
    );
  }

  const { bracket, campeonato } = data;
  const hasUpperBracket = Object.keys(bracket.upper).length > 0;
  const hasLowerBracket = Object.keys(bracket.lower).length > 0;

  if (!hasUpperBracket && !hasLowerBracket && !bracket.grand_final && !bracket.terceiro_lugar) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-cyan-500/20 bg-[#0a1628]/30">
        <Swords className="h-12 w-12 mb-4 text-cyan-400/30" />
        <p className="text-cyan-100/50 mb-2">Mata-mata ainda não iniciado</p>
        <p className="text-xs text-cyan-100/30">Finalize a fase de grupos para gerar as chaves</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
            <GitBranch className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Chaves do Mata-Mata</h2>
            <p className="text-xs text-cyan-100/50">
              {campeonato.tem_repescagem ? 'Com Lower Bracket (Repescagem)' : 'Eliminação Simples'}
            </p>
          </div>
        </div>
      </div>

      {/* UPPER BRACKET */}
      {hasUpperBracket && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-cyan-500/20" />
            <span className="text-xs uppercase font-bold text-cyan-400 px-3">
              {campeonato.tem_repescagem ? 'Upper Bracket' : 'Chave Principal'}
            </span>
            <div className="h-px flex-1 bg-cyan-500/20" />
          </div>

          {/* Quartas */}
          {bracket.upper.quartas && (
            <div className="space-y-2">
              <p className="text-xs text-cyan-100/40 font-bold uppercase">Quartas de Final</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {bracket.upper.quartas.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} />
                ))}
              </div>
            </div>
          )}

          {/* Semifinais */}
          {bracket.upper.semifinal && (
            <div className="space-y-2">
              <p className="text-xs text-cyan-100/40 font-bold uppercase">Semifinais</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {bracket.upper.semifinal.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} />
                ))}
              </div>
            </div>
          )}

          {/* Upper R1 (com repescagem) */}
          {bracket.upper.upper_r1 && (
            <div className="space-y-2">
              <p className="text-xs text-cyan-100/40 font-bold uppercase">Upper Bracket - Round 1</p>
              <div className="max-w-sm mx-auto">
                {bracket.upper.upper_r1.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} />
                ))}
              </div>
            </div>
          )}

          {/* Final (sem repescagem) */}
          {bracket.upper.final && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400 font-bold uppercase text-center">🏆 Final</p>
              <div className="max-w-sm mx-auto">
                {bracket.upper.final.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} isGrandFinal />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LOWER BRACKET */}
      {hasLowerBracket && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-amber-500/20" />
            <span className="text-xs uppercase font-bold text-amber-400 px-3">
              Lower Bracket (Repescagem)
            </span>
            <div className="h-px flex-1 bg-amber-500/20" />
          </div>

          {/* Lower R1 */}
          {bracket.lower.lower_r1 && (
            <div className="space-y-2">
              <p className="text-xs text-red-400 font-bold uppercase">Lower R1 - Jogo da Vida</p>
              <div className="max-w-sm mx-auto">
                {bracket.lower.lower_r1.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} />
                ))}
              </div>
            </div>
          )}

          {/* Lower R2 */}
          {bracket.lower.lower_r2 && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400 font-bold uppercase">Lower R2 - Repescagem</p>
              <div className="max-w-sm mx-auto">
                {bracket.lower.lower_r2.map((partida) => (
                  <PartidaCard key={partida.id} partida={partida} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRAND FINAL */}
      {bracket.grand_final && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
            <span className="text-xs uppercase font-bold text-amber-300 px-3 flex items-center gap-2">
              <Trophy size={14} />
              Grand Final
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/50 via-transparent to-transparent" />
          </div>
          <div className="max-w-md mx-auto">
            <PartidaCard partida={bracket.grand_final} isGrandFinal />
          </div>
        </div>
      )}

      {/* TERCEIRO LUGAR */}
      {bracket.terceiro_lugar && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-amber-600/20" />
            <span className="text-xs uppercase font-bold text-amber-600 px-3 flex items-center gap-2">
              <Medal size={14} />
              Disputa de 3º Lugar
            </span>
            <div className="h-px flex-1 bg-amber-600/20" />
          </div>
          <div className="max-w-sm mx-auto">
            <PartidaCard partida={bracket.terceiro_lugar} />
          </div>
        </div>
      )}
    </div>
  );
}