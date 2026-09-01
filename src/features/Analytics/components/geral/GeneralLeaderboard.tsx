import { useState, useMemo, memo } from 'react';
import { ChevronDown, ChevronUp, Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type SortKey = 'pontos' | 'gols' | 'assistencias' | 'clean_sheets' | 'vitorias' | 'empates' | 'derrotas' | 'titulos' | 'mvps' | 'jogos';
type SortDir = 'desc' | 'asc';

const COLS: { key: SortKey; label: string; abbr: string; color: string }[] = [
  { key: 'pontos',       label: 'Pontos',       abbr: 'PTS', color: '#fde047' },
  { key: 'jogos',        label: 'Jogos',        abbr: 'J',   color: '#94a3b8' },
  { key: 'vitorias',     label: 'Vitórias',     abbr: 'V',   color: '#4ade80' },
  { key: 'empates',      label: 'Empates',      abbr: 'E',   color: '#fbbf24' },
  { key: 'derrotas',     label: 'Derrotas',     abbr: 'D',   color: '#f87171' },
  { key: 'gols',         label: 'Gols',         abbr: 'GM',  color: '#34d399' },
  { key: 'assistencias', label: 'Assistências', abbr: 'A',   color: '#22d3ee' },
  { key: 'clean_sheets', label: 'Clean Sheets', abbr: 'CS',  color: '#2dd4bf' },
  { key: 'titulos',      label: 'Títulos',      abbr: '🏆',  color: '#f59e0b' },
  { key: 'mvps',         label: 'MVPs',         abbr: 'MVP', color: '#c084fc' },
];

export const GeneralLeaderboard = memo(({ data, comTitulos, posicao }: { data: any[]; comTitulos: boolean; posicao: 'todos' | 'linha' | 'goleiro' }) => {
  const [sortKey, setSortKey] = useState<SortKey>('pontos');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState(false);

  // Mapear dados para calcular a pontuação correta baseada no filtro e filtrar posição
  const mappedData = useMemo(() => {
    let filtered = data;
    if (posicao === 'linha') {
      filtered = data.filter(d => !d.total_como_goleiro); // exclui quem jogou como goleiro
    } else if (posicao === 'goleiro') {
      filtered = data.filter(d => d.total_como_goleiro > 0); // apenas quem jogou como goleiro
    }

    return filtered.map(item => {
      const pts = comTitulos ? Number(item.pontos || 0) : Number(item.pts_performance || 0);
      return { ...item, pontosCalculados: pts };
    });
  }, [data, comTitulos, posicao]);

  const sorted = useMemo(() => [...mappedData].sort((a, b) => {
    const va = sortKey === 'pontos' ? Number(a.pontosCalculados) : Number(a[sortKey] ?? 0);
    const vb = sortKey === 'pontos' ? Number(b.pontosCalculados) : Number(b[sortKey] ?? 0);
    return sortDir === 'desc' ? vb - va : va - vb;
  }), [mappedData, sortKey, sortDir]);

  const displayData = expanded ? sorted : sorted.slice(0, 10);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const col = COLS.find(c => c.key === sortKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-surface/50 backdrop-blur-md"
    >
      {/* Header */}
      <div className="relative px-4 py-4 md:px-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Crown size={20} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">Classificação Geral</h3>
            <p className="text-[10px] text-textMuted mt-0.5">
              Ordenado por <span style={{ color: col?.color }} className="font-bold">{col?.label}</span> ({comTitulos ? 'com' : 'sem'} títulos) • {posicao === 'linha' ? 'Jogadores de Linha' : posicao === 'goleiro' ? 'Apenas Goleiros' : 'Todos'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela responsiva */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-surfaceElevated/50 border-y border-border/50">
            <tr>
              <th className="px-4 py-3 text-left w-10 text-[10px] font-bold text-textMuted uppercase">#</th>
              <th className="px-2 py-3 text-left text-[10px] font-bold text-textMuted uppercase">Jogador</th>
              {COLS.map(c => (
                <th key={c.key} className="px-2 py-3 text-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort(c.key)}>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] font-black" style={{ color: sortKey === c.key ? c.color : '#64748b' }}>
                      {c.abbr}
                    </span>
                    <span className="text-[8px]" style={{ color: sortKey === c.key ? c.color : 'transparent' }}>
                      {sortDir === 'desc' ? '▼' : '▲'}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {displayData.map((item: any) => {
              const realRank = sorted.findIndex(s => s.id === item.id);
              const pts = item.pontosCalculados;
              const isTop3 = realRank < 3;

              return (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3">
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
                      realRank === 0 ? "bg-amber-500/20 text-amber-400" :
                      realRank === 1 ? "bg-slate-400/20 text-slate-300" :
                      realRank === 2 ? "bg-orange-600/20 text-orange-400" : "text-textMuted"
                    )}>
                      {realRank === 0 ? '👑' : realRank + 1}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-surfaceElevated">
                          {item.foto_url 
                            ? <img src={item.foto_url} className="w-full h-full object-cover" alt="" />
                            : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-textMuted">{item.nome?.substring(0,2)}</div>
                          }
                        </div>
                        {item.joga_recuado == 1 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-500 flex items-center justify-center">
                            <Shield size={7} className="text-white" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <span className={cn("font-bold text-xs truncate max-w-[100px]", isTop3 ? "text-white" : "text-slate-300")}>{item.nome}</span>
                    </div>
                  </td>
                  {COLS.map(c => {
                    const isActive = sortKey === c.key;
                    const val = c.key === 'pontos' ? pts : Number(item[c.key] ?? 0);
                    
                    if (c.key === 'pontos') {
                      return (
                        <td key={c.key} className="px-2 py-3 text-center">
                          <span className={cn("font-black text-sm", isTop3 ? "text-amber-400" : "text-white")}>
                            {val % 1 === 0 ? val : val.toFixed(1)}
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td key={c.key} className="px-2 py-3 text-center">
                        <span className={cn("text-xs font-bold", val === 0 ? "text-textMuted/30" : (isActive ? "text-white" : "text-textMuted"))}>
                          {val === 0 ? '—' : val}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-surfaceElevated/30 hover:bg-surfaceElevated/50 transition-colors flex items-center justify-center gap-2 border-t border-border/50"
        >
          {expanded ? <><ChevronUp size={14} /> Mostrar menos</> : <><ChevronDown size={14} /> Ver Classificação Completa</>}
        </button>
      )}
    </motion.div>
  );
});
