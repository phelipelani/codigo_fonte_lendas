import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shirt, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CopaJogador {
  id: number;
  nome: string;
  foto_url?: string | null;
}

export interface CopaTime {
  id: number;
  nome: string;
  cor: string;
  logo_url?: string | null;
}

export interface CopaItem {
  id: number;
  nome: string;
  data: string;
  status?: string;
  time_campeao: CopaTime;
  campeoes: CopaJogador[];
}

function formatPtDate(dateStr?: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Configuração estética por edição para combinar troféus com tons vibrantes
const copaColors: Record<number, { trophy: string; glow: string; border: string }> = {
  0: {
    trophy: 'text-[#FACC15]',
    glow: 'shadow-[0_0_15px_rgba(250,204,21,0.15)]',
    border: 'border-[#FACC15]/20',
  },
  1: {
    trophy: 'text-[#38BDF8]',
    glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]',
    border: 'border-[#38BDF8]/20',
  },
  2: {
    trophy: 'text-[#F472B6]',
    glow: 'shadow-[0_0_15px_rgba(244,114,182,0.15)]',
    border: 'border-[#F472B6]/20',
  },
};

export const CupsHistory = memo(({ copas }: { copas: CopaItem[] }) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Ordena por data (as 3 mais recentes ou em ordem cronológica)
  const sortedCopas = [...(copas || [])].sort((a, b) => (a.data > b.data ? 1 : -1));
  const hasData = sortedCopas.length > 0;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0d1623] p-4 md:p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Background sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Trophy size={22} className="fill-purple-400/20" />
          </div>
          <div>
            <h3 className="font-black text-white text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
              COPAS
            </h3>
            <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
              HISTÓRICO DAS COPAS E EQUIPES CAMPEÃS
            </p>
          </div>
        </div>

        {hasData && (
          <button
            onClick={() => setModalOpen(true)}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 hover:bg-cyan-500/10 transition-all flex items-center gap-1 shrink-0"
          >
            Ver histórico completo <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Cards de Copas */}
      <div className="relative z-10 w-full flex-1 flex">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center w-full">
            <Trophy size={40} className="text-white/10 mb-3" />
            <h4 className="text-base font-bold text-white/50 mb-1">Ainda não há copas realizadas</h4>
            <p className="text-xs text-textMuted max-w-xs">
              Quando a primeira copa for finalizada, o histórico de equipes e jogadores campeões aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
            {sortedCopas.map((copa, idx) => {
              const theme = copaColors[idx % 3] || copaColors[0];
              const teamColor = copa.time_campeao?.cor || '#38BDF8';

              return (
                <motion.div
                  key={copa.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={cn(
                    "flex flex-col rounded-xl border bg-black/40 p-3 relative transition-all duration-300 hover:border-white/20",
                    theme.border
                  )}
                >
                  {/* Topo: Nome da Copa e Data */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                    <Trophy size={18} className={cn("shrink-0", theme.trophyIcon || theme.trophy)} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-white text-xs uppercase tracking-wide truncate">
                        {copa.nome}
                      </h4>
                      <span className="text-[10px] text-textMuted block">
                        {formatPtDate(copa.data)}
                      </span>
                    </div>
                  </div>

                  {/* Badge do Time Campeão com Cor Real do Banco */}
                  <div
                    className="flex items-center gap-2.5 p-2 rounded-lg mb-3 border transition-transform"
                    style={{
                      backgroundColor: `${teamColor}15`,
                      borderColor: `${teamColor}40`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-inner"
                      style={{
                        backgroundColor: `${teamColor}25`,
                        color: teamColor,
                      }}
                    >
                      <Shirt size={18} style={{ color: teamColor }} className="fill-current/30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5
                        className="text-[11px] font-black tracking-wide uppercase truncate"
                        style={{ color: teamColor }}
                      >
                        {copa.time_campeao?.nome || 'Time Campeão'}
                      </h5>
                      <span className="text-[9px] font-bold text-white/60 uppercase">
                        {copa.campeoes?.length || 0} Campeões
                      </span>
                    </div>
                  </div>

                  {/* Lista de Jogadores Campeões */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    {copa.campeoes?.map((jogador) => (
                      <div
                        key={jogador.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg bg-surface/50 border border-white/5 hover:border-white/10 transition-all"
                      >
                        {jogador.foto_url ? (
                          <img
                            src={jogador.foto_url}
                            alt={jogador.nome}
                            className="w-6 h-6 rounded-full object-cover border border-white/15 shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/15 flex items-center justify-center text-[9px] font-bold text-white/70 shrink-0">
                            {jogador.nome.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-white/90 truncate">
                          {jogador.nome}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Histórico Completo de Copas */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0d1623] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-purple-400" />
                  <h3 className="font-bold text-white text-base">Histórico Completo das Copas</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {sortedCopas.map((copa) => {
                  const teamColor = copa.time_campeao?.cor || '#38BDF8';
                  return (
                    <div
                      key={copa.id}
                      className="p-4 rounded-xl bg-surfaceElevated/40 border border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm">{copa.nome}</h4>
                          <span className="text-xs text-textMuted">{formatPtDate(copa.data)}</span>
                        </div>
                        <div
                          className="px-3 py-1 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5"
                          style={{
                            backgroundColor: `${teamColor}20`,
                            color: teamColor,
                            borderColor: `${teamColor}40`,
                            borderWidth: '1px',
                          }}
                        >
                          <Shirt size={14} />
                          <span>{copa.time_campeao?.nome}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                        {copa.campeoes?.map((j) => (
                          <div
                            key={j.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-xs text-white"
                          >
                            {j.foto_url ? (
                              <img src={j.foto_url} alt={j.nome} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold">
                                {j.nome.substring(0, 1)}
                              </div>
                            )}
                            <span>{j.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
