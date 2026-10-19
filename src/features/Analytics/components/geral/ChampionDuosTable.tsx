import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Shield, ChevronDown, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompeticaoTag {
  id: number;
  formato: string;
  nome: string;
  tag: string;
}

export interface ChampionDuoItem {
  j1: {
    id: number;
    nome: string;
    foto_url?: string | null;
  };
  j2: {
    id: number;
    nome: string;
    foto_url?: string | null;
  };
  total_titulos: number;
  copas: number;
  ligas: number;
  competicoes: CompeticaoTag[];
}

export const ChampionDuosTable = memo(({ duplas }: { duplas: ChampionDuoItem[] }) => {
  const [filtro, setFiltro] = useState<'todas' | 'ligas' | 'copas'>('todas');
  const [modalOpen, setModalOpen] = useState(false);

  // Filtra e ordena
  const filteredDuos = useMemo(() => {
    let list = [...(duplas || [])];

    if (filtro === 'ligas') {
      list = list.filter(d => d.ligas > 0);
      list.sort((a, b) => b.ligas - a.ligas || b.copas - a.copas || a.j1.nome.localeCompare(b.j1.nome));
    } else if (filtro === 'copas') {
      list = list.filter(d => d.copas > 0);
      list.sort((a, b) => b.copas - a.copas || b.ligas - a.ligas || a.j1.nome.localeCompare(b.j1.nome));
    } else {
      list = list.filter(d => d.total_titulos > 0);
      list.sort((a, b) => b.total_titulos - a.total_titulos || b.copas - a.copas || b.ligas - a.ligas || a.j1.nome.localeCompare(b.j1.nome));
    }

    return list;
  }, [duplas, filtro]);

  const top5 = filteredDuos.slice(0, 5);
  const hasData = top5.length > 0;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0d1623] p-4 md:p-6 shadow-xl relative overflow-hidden">
      {/* Background sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none" />

      {/* Header com Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Users size={22} className="fill-indigo-400/20" />
          </div>
          <div>
            <h3 className="font-black text-white text-base md:text-lg uppercase tracking-wider flex items-center gap-2">
              DUPLAS QUE MAIS VENCERAM JUNTAS
            </h3>
            <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
              TÍTULOS CONQUISTADOS EM LIGAS E COPAS JOGANDO NO MESMO TIME
            </p>
          </div>
        </div>

        {/* Dropdown de Filtro */}
        <div className="relative">
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as any)}
            className="appearance-none bg-black/40 border border-white/10 text-white text-xs font-bold rounded-xl px-4 py-2 pr-9 focus:outline-none focus:border-indigo-400/50 cursor-pointer shadow-sm hover:border-white/20 transition-all"
          >
            <option value="todas" className="bg-[#0d1623] text-white">Todas as competições</option>
            <option value="ligas" className="bg-[#0d1623] text-white">Apenas Ligas</option>
            <option value="copas" className="bg-[#0d1623] text-white">Apenas Copas</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none" />
        </div>
      </div>

      {/* Tabela de Duplas */}
      <div className="relative z-10 overflow-x-auto">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users size={36} className="text-white/10 mb-2" />
            <p className="text-xs text-textMuted">Nenhuma dupla encontrada para este filtro</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-textMuted font-black">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-4">DUPLA</th>
                <th className="py-2.5 px-4 text-center">TOTAL DE TÍTULOS</th>
                <th className="py-2.5 px-4 text-center">COPAS</th>
                <th className="py-2.5 px-4 text-center">LIGAS</th>
                <th className="py-2.5 px-4">COMPETIÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {top5.map((dupla, idx) => (
                <tr
                  key={`${dupla.j1.id}-${dupla.j2.id}`}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Posição */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-lg inline-flex items-center justify-center font-black text-xs shadow-md",
                        idx === 0
                          ? "bg-amber-400 text-black font-black"
                          : idx === 1
                          ? "bg-slate-300 text-black font-black"
                          : idx === 2
                          ? "bg-[#D39A62] text-white font-black"
                          : "bg-white/5 text-white/60"
                      )}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* Dupla */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {/* Jogador 1 */}
                      <div className="flex items-center gap-1.5">
                        {dupla.j1.foto_url ? (
                          <img
                            src={dupla.j1.foto_url}
                            alt={dupla.j1.nome}
                            className="w-7 h-7 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                            {dupla.j1.nome.substring(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-white tracking-wide">
                          {dupla.j1.nome}
                        </span>
                      </div>

                      <span className="text-white/30 font-bold text-xs px-0.5">×</span>

                      {/* Jogador 2 */}
                      <div className="flex items-center gap-1.5">
                        {dupla.j2.foto_url ? (
                          <img
                            src={dupla.j2.foto_url}
                            alt={dupla.j2.nome}
                            className="w-7 h-7 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                            {dupla.j2.nome.substring(0, 1)}
                          </div>
                        )}
                        <span className="font-bold text-white tracking-wide">
                          {dupla.j2.nome}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Total de Títulos */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 font-black text-amber-400 text-sm">
                      <Trophy size={14} className="fill-amber-400" />
                      <span>{dupla.total_titulos}</span>
                    </div>
                  </td>

                  {/* Copas */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 font-bold text-purple-400 text-xs">
                      <Trophy size={13} className="fill-purple-400/20" />
                      <span>{dupla.copas}</span>
                    </div>
                  </td>

                  {/* Ligas */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5 font-bold text-cyan-400 text-xs">
                      <Shield size={13} className="fill-cyan-400/20" />
                      <span>{dupla.ligas}</span>
                    </div>
                  </td>

                  {/* Badges das Competições */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {dupla.competicoes?.map((comp, cIdx) => {
                        const isCopa = comp.formato === 'copa';
                        return (
                          <span
                            key={cIdx}
                            title={comp.nome}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-black border transition-all cursor-default",
                              isCopa
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                            )}
                          >
                            {isCopa ? (
                              <Trophy size={11} className="shrink-0" />
                            ) : (
                              <Shield size={11} className="shrink-0" />
                            )}
                            {comp.tag}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rodapé com link para Ranking Completo */}
      {filteredDuos.length > 5 && (
        <div className="flex justify-end pt-4 mt-2 border-t border-white/5 relative z-10">
          <button
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold text-white/80 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            Ver Ranking Completo <ChevronRight size={14} className="text-white/50" />
          </button>
        </div>
      )}

      {/* Modal Ranking Completo de Duplas */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-[#0d1623] border border-white/10 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Ranking Completo de Duplas Campeãs</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-textMuted font-bold">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-3">DUPLA</th>
                      <th className="py-2 px-3 text-center">TOTAL</th>
                      <th className="py-2 px-3 text-center">COPAS</th>
                      <th className="py-2 px-3 text-center">LIGAS</th>
                      <th className="py-2 px-3">COMPETIÇÕES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredDuos.map((dupla, idx) => (
                      <tr key={`${dupla.j1.id}-${dupla.j2.id}`} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-2 text-center font-bold text-white/50">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-white">{dupla.j1.nome}</span>
                          <span className="text-white/30 mx-1.5 font-bold">×</span>
                          <span className="font-bold text-white">{dupla.j2.nome}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-amber-400">{dupla.total_titulos}</td>
                        <td className="py-2.5 px-3 text-center text-purple-400 font-bold">{dupla.copas}</td>
                        <td className="py-2.5 px-3 text-center text-cyan-400 font-bold">{dupla.ligas}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {dupla.competicoes?.map((comp, cIdx) => (
                              <span
                                key={cIdx}
                                title={comp.nome}
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                  comp.formato === 'copa'
                                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                    : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                                )}
                              >
                                {comp.tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
