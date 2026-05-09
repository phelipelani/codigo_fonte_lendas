// ============================================================================
// ARQUIVO: src/features/Campeonatos/components/BracketMataAMata.tsx
// Componente de visualização do chaveamento estilo Copa do Mundo
// ============================================================================

import { motion } from 'framer-motion';
import { Trophy, Swords, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePartida {
  id: number;
  nome: string;
  logo_url?: string;
}

interface PartidaBracket {
  id: number;
  fase_mata_mata: string;
  ordem_confronto: number;
  status: string;
  placar_timeA: number | null;
  placar_timeB: number | null;
  placar_penaltis_timeA?: number | null;
  placar_penaltis_timeB?: number | null;
  timeA_id: number;
  timeA_nome: string;
  timeA_logo?: string;
  timeB_id: number;
  timeB_nome: string;
  timeB_logo?: string;
  vencedor_id?: number | null;
  perdedor_id?: number | null;
}

interface BracketData {
  semifinais: PartidaBracket[];
  final: PartidaBracket | null;
  terceiro_lugar?: PartidaBracket | null;
}

interface BracketMataAMataProps {
  bracket: BracketData;
  onPartidaClick: (partida: PartidaBracket) => void;
  campeaoId?: number | null;
}

// ============================================================================
// COMPONENTE: TIME NO BRACKET
// ============================================================================
interface TimeSlotProps {
  time: {
    id: number;
    nome: string;
    logo?: string;
  } | null;
  placar: number | null;
  penaltis?: number | null;
  isVencedor: boolean;
  isPerdedor: boolean;
  posicao: 'top' | 'bottom';
}

const TimeSlot = ({ time, placar, penaltis, isVencedor, isPerdedor, posicao }: TimeSlotProps) => {
  if (!time) {
    return (
      <div className={cn(
        "flex items-center justify-between px-4 py-3 bg-[#0a1628]/50 border border-dashed border-cyan-500/20",
        posicao === 'top' ? 'rounded-t-lg' : 'rounded-b-lg'
      )}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#0d1f35] animate-pulse" />
          <span className="text-cyan-100/30 text-sm">Aguardando...</span>
        </div>
        <span className="text-cyan-100/20">-</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center justify-between px-4 py-3 transition-all",
        posicao === 'top' ? 'rounded-t-lg border-b border-cyan-500/10' : 'rounded-b-lg',
        isVencedor && "bg-emerald-500/10 border-emerald-500/30",
        isPerdedor && "bg-[#0a1628]/30 opacity-40",
        !isVencedor && !isPerdedor && "bg-[#0a1628]/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Logo ou Iniciais */}
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg overflow-hidden",
          isVencedor ? "ring-2 ring-emerald-400 bg-emerald-500/20" : "bg-[#0d1f35]"
        )}>
          {time.logo ? (
            <img src={time.logo} alt={time.nome} className="w-full h-full object-contain" />
          ) : (
            <span className={isVencedor ? "text-emerald-400" : "text-cyan-400"}>
              {time.nome.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nome do Time */}
        <span className={cn(
          "font-semibold text-sm md:text-base transition-all",
          isVencedor && "text-emerald-400",
          isPerdedor && "text-cyan-100/40 line-through",
          !isVencedor && !isPerdedor && "text-white"
        )}>
          {time.nome}
        </span>

        {/* Ícone de Vencedor */}
        {isVencedor && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-1"
          >
            <Crown className="w-4 h-4 text-amber-400" />
          </motion.div>
        )}
      </div>

      {/* Placar */}
      <div className="flex items-center gap-2">
        {penaltis != null && (
          <span className="text-xs text-cyan-100/50">({penaltis})</span>
        )}
        <span className={cn(
          "text-xl font-black min-w-[2rem] text-center",
          isVencedor && "text-emerald-400",
          isPerdedor && "text-cyan-100/40",
          !isVencedor && !isPerdedor && placar != null ? "text-white" : "text-cyan-100/30"
        )}>
          {placar ?? '-'}
        </span>
      </div>
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE: CARD DE PARTIDA
// ============================================================================
interface PartidaCardProps {
  partida: PartidaBracket;
  onClick: () => void;
  isFinal?: boolean;
  isTerceiroLugar?: boolean;
}

const PartidaCard = ({ partida, onClick, isFinal, isTerceiroLugar }: PartidaCardProps) => {
  const isFinalizada = partida.status === 'finalizada';
  
  const timeAVenceu = isFinalizada && partida.vencedor_id === partida.timeA_id;
  const timeBVenceu = isFinalizada && partida.vencedor_id === partida.timeB_id;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl overflow-hidden transition-all",
        "border-2 shadow-lg",
        isFinal && "border-amber-500/50 shadow-amber-500/20",
        isTerceiroLugar && "border-orange-500/50 shadow-orange-500/20",
        !isFinal && !isTerceiroLugar && "border-cyan-500/30 shadow-cyan-500/10",
        "hover:shadow-xl hover:border-opacity-70"
      )}
    >
      {/* Header da Partida */}
      <div className={cn(
        "px-4 py-2 flex items-center justify-between",
        isFinal && "bg-gradient-to-r from-amber-500/20 to-yellow-600/20",
        isTerceiroLugar && "bg-gradient-to-r from-orange-500/20 to-amber-600/20",
        !isFinal && !isTerceiroLugar && "bg-gradient-to-r from-cyan-500/10 to-teal-500/10"
      )}>
        <div className="flex items-center gap-2">
          {isFinal ? (
            <Trophy className="w-4 h-4 text-amber-400" />
          ) : isTerceiroLugar ? (
            <Medal className="w-4 h-4 text-orange-400" />
          ) : (
            <Swords className="w-4 h-4 text-cyan-400" />
          )}
          <span className={cn(
            "text-xs font-bold uppercase tracking-wider",
            isFinal && "text-amber-400",
            isTerceiroLugar && "text-orange-400",
            !isFinal && !isTerceiroLugar && "text-cyan-400"
          )}>
            {isFinal ? 'Final' : isTerceiroLugar ? '3º Lugar' : `Semi ${partida.ordem_confronto}`}
          </span>
        </div>

        {/* Status */}
        <span className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
          isFinalizada ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
        )}>
          {isFinalizada ? 'Finalizada' : 'Pendente'}
        </span>
      </div>

      {/* Times */}
      <div className="bg-[#0d1f35]/50">
        <TimeSlot
          time={partida.timeA_id ? { id: partida.timeA_id, nome: partida.timeA_nome, logo: partida.timeA_logo } : null}
          placar={partida.placar_timeA}
          penaltis={partida.placar_penaltis_timeA}
          isVencedor={timeAVenceu}
          isPerdedor={timeBVenceu}
          posicao="top"
        />
        <TimeSlot
          time={partida.timeB_id ? { id: partida.timeB_id, nome: partida.timeB_nome, logo: partida.timeB_logo } : null}
          placar={partida.placar_timeB}
          penaltis={partida.placar_penaltis_timeB}
          isVencedor={timeBVenceu}
          isPerdedor={timeAVenceu}
          posicao="bottom"
        />
      </div>

      {/* Indicador de Clique */}
      {!isFinalizada && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
          <span className="opacity-0 hover:opacity-100 text-white font-bold text-sm">
            Clique para jogar
          </span>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// COMPONENTE: LINHA DE CONEXÃO
// ============================================================================
const ConnectorLine = ({ fromTop, toCenter }: { fromTop?: boolean; toCenter?: boolean }) => {
  return (
    <div className="hidden lg:flex items-center justify-center">
      <svg width="60" height="120" className="text-cyan-500/30">
        {/* Linha horizontal saindo da partida */}
        <line x1="0" y1={fromTop ? 30 : 90} x2="30" y2={fromTop ? 30 : 90} stroke="currentColor" strokeWidth="2" />
        {/* Linha vertical */}
        <line x1="30" y1="30" x2="30" y2="90" stroke="currentColor" strokeWidth="2" />
        {/* Linha horizontal indo para a final */}
        <line x1="30" y1="60" x2="60" y2="60" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: BRACKET
// ============================================================================
export function BracketMataAMata({ bracket, onPartidaClick, campeaoId }: BracketMataAMataProps) {
  const { semifinais, final, terceiro_lugar } = bracket;

  // Se não há partidas ainda
  if (semifinais.length === 0 && !final) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Swords className="w-16 h-16 text-cyan-500/30 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Mata-Mata não iniciado</h3>
        <p className="text-cyan-100/50">Finalize a fase de grupos para gerar o chaveamento.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[600px] md:min-w-0">
        
        {/* Título */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black">
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Chaveamento Mata-Mata
            </span>
          </h2>
          <p className="text-cyan-100/50 mt-1">Clique em uma partida para ver detalhes ou jogar</p>
        </div>

        {/* Layout do Bracket */}
        <div className="flex items-center justify-center gap-4 lg:gap-8">
          
          {/* Coluna 1: Semifinais */}
          <div className="flex flex-col gap-8 lg:gap-16">
            {semifinais[0] && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <PartidaCard
                  partida={semifinais[0]}
                  onClick={() => onPartidaClick(semifinais[0])}
                />
              </motion.div>
            )}
            
            {semifinais[1] && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <PartidaCard
                  partida={semifinais[1]}
                  onClick={() => onPartidaClick(semifinais[1])}
                />
              </motion.div>
            )}
          </div>

          {/* Conectores */}
          <div className="hidden lg:flex flex-col gap-4">
            <ConnectorLine fromTop />
            <ConnectorLine />
          </div>

          {/* Coluna 2: Final + Troféu */}
          <div className="flex flex-col items-center gap-6">
            {/* Troféu do Campeão */}
            {campeaoId && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <Crown className="w-3 h-3 text-white" />
                </motion.div>
              </motion.div>
            )}

            {/* Final */}
            {final && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-[280px]"
              >
                <PartidaCard
                  partida={final}
                  onClick={() => onPartidaClick(final)}
                  isFinal
                />
              </motion.div>
            )}

            {/* Terceiro Lugar */}
            {terceiro_lugar && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-[260px] mt-4"
              >
                <PartidaCard
                  partida={terceiro_lugar}
                  onClick={() => onPartidaClick(terceiro_lugar)}
                  isTerceiroLugar
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-cyan-100/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Vencedor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500/30" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-100/20" />
            <span>Eliminado</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BracketMataAMata;