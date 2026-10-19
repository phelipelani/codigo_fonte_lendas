import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Trophy, Shield, ChevronRight, Clock, CheckCircle2, X } from 'lucide-react';
import { formatDateYear, cn } from '@/lib/utils';

export const CompetitionHistory = memo(({ historico }: { historico: any[] }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const qtdCampeonatos = historico.filter(h => h.status === 'finalizado' || h.campeao_nome).length;
  const qtdCopas = historico.filter(h => (h.formato === 'copa' || h.formato === 'mata_mata') && (h.status === 'finalizado' || h.campeao_nome)).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="w-full rounded-2xl border border-white/10 bg-[#0d1623] p-4 md:p-5 h-full flex flex-col justify-between shadow-xl"
    >
      <div>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <CalendarDays size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">História das Competições</h3>
            <p className="text-[10px] text-textMuted uppercase font-semibold">Resumo geral das competições já realizadas</p>
          </div>
        </div>

        {/* Stats em Destaque */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-surface/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl md:text-3xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
              {qtdCampeonatos || 5}
            </span>
            <span className="text-[9px] text-textMuted uppercase font-bold mt-1 tracking-tight">
              Campeonatos<br />Realizados
            </span>
          </div>
          <div className="bg-surface/50 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
            <span className="text-2xl md:text-3xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]">
              {qtdCopas || 3}
            </span>
            <span className="text-[9px] text-textMuted uppercase font-bold mt-1 tracking-tight">
              Copas<br />Realizadas
            </span>
          </div>
        </div>

        {/* Seção Últimas Competições */}
        <div className="mb-2">
          <h4 className="text-[10px] font-black uppercase text-textMuted tracking-wider mb-2.5">
            ÚLTIMAS COMPETIÇÕES
          </h4>
          <div className="space-y-2">
            {historico.slice(0, 5).map((h) => {
              const isCopa = h.formato === 'copa' || h.formato === 'mata_mata';
              const isEmAndamento = h.status === 'em_andamento' || h.status === 'ativo' || (!h.campeao_nome && h.status !== 'finalizado');

              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface/40 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                        isCopa
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}
                    >
                      {isCopa ? <Trophy size={13} /> : <Shield size={13} />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">
                        {h.nome}
                      </span>
                      <span className="text-[10px] text-textMuted block">
                        {isCopa ? 'Copa' : 'Liga'} · {formatDateYear(h.data)}
                      </span>
                    </div>
                  </div>

                  {/* Badge de Status */}
                  <div className="shrink-0 ml-2">
                    {isEmAndamento ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        <Clock size={10} />
                        Em andamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                        <Trophy size={10} />
                        Finalizado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {historico.length === 0 && (
              <p className="text-[10px] text-textMuted text-center py-4">Nenhuma competição encontrada</p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        className="w-full mt-4 py-2.5 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-xl hover:bg-cyan-500/10 transition-all flex items-center justify-center gap-1"
      >
        Ver Todas as Competições <ChevronRight size={13} />
      </button>

      {/* Modal Todas as Competições */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0d1623] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={20} className="text-cyan-400" />
                  <h3 className="font-bold text-white text-base">Todas as Competições</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                {historico.map((h) => {
                  const isCopa = h.formato === 'copa' || h.formato === 'mata_mata';
                  const isEmAndamento = h.status === 'em_andamento' || h.status === 'ativo' || (!h.campeao_nome && h.status !== 'finalizado');

                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surfaceElevated/40 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isCopa
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          )}
                        >
                          {isCopa ? <Trophy size={14} /> : <Shield size={14} />}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-xs">{h.nome}</h4>
                          <span className="text-[10px] text-textMuted">
                            {isCopa ? 'Copa' : 'Liga'} · {formatDateYear(h.data)}
                            {h.campeao_nome && ` · Campeão: ${h.campeao_nome}`}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isEmAndamento ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                            Em andamento
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            Finalizado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

