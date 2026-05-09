// Arquivo: src/features/Analytics/components/AnalyticsGeralView.tsx
import { useState, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/api';
import { Activity, Goal, Calendar, AlertTriangle, TrendingUp, Users, Trophy, Target, Loader2, Shield, Medal, Crosshair, Heart, ChevronDown, ChevronUp, Star, Crown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const KPICard = memo(({ title, value, subtitle, icon: Icon, color, delay = 0 }: { title: string; value: string | number; subtitle?: string; icon: any; color: string; delay?: number; }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="relative overflow-hidden rounded-xl border p-4 md:p-5 bg-surface/50 backdrop-blur-md border-border hover:border-cyan-500/40 transition-all">
    <div className={cn("absolute top-0 left-0 right-0 h-1", `bg-${color}`)} />
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", `bg-${color}/10 text-${color}`)}><Icon size={20} /></div>
      </div>
      <p className="text-[10px] uppercase font-bold tracking-wider text-textMuted mb-1">{title}</p>
      <h3 className="text-2xl md:text-3xl font-black text-white">{value}{subtitle && <span className="text-sm font-normal text-textMuted ml-1">{subtitle}</span>}</h3>
    </div>
  </motion.div>
));

const RankingTable = memo(({ title, data, icon: Icon, color, columns, initialRows = 5, delay = 0 }: { title: string; data: any[]; icon: any; color: string; columns: { key: string; label: string; width?: string; render?: (item: any) => React.ReactNode }[]; initialRows?: number; delay?: number; }) => {
  const [expanded, setExpanded] = useState(false);
  const displayData = expanded ? data : data?.slice(0, initialRows);
  const hasMore = data?.length > initialRows;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="rounded-xl border border-border bg-surface/50 backdrop-blur-md overflow-hidden">
      <div className={cn("p-4 border-b border-border flex items-center justify-between", `bg-gradient-to-r from-${color}/10 to-transparent`)}>
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${color}/20 text-${color}`)}><Icon size={16} /></div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
        </div>
        <span className="text-[10px] text-textMuted uppercase font-bold">Top {data?.length || 0}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surfaceElevated/50">
            <tr>
              <th className="px-3 py-2 text-left text-textMuted text-xs font-bold w-8">#</th>
              <th className="px-3 py-2 text-left text-textMuted text-xs font-bold">Jogador</th>
              {columns.map(col => (<th key={col.key} className={cn("px-3 py-2 text-center text-textMuted text-xs font-bold", col.width)}>{col.label}</th>))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {displayData?.map((item: any, i: number) => (
              <tr key={item.id || i} className="hover:bg-white/5 transition-colors">
                <td className="px-3 py-2">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black", i === 0 ? "bg-amber-500/20 text-amber-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-600/20 text-orange-400" : "bg-transparent text-textMuted")}>{i + 1}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-surfaceElevated border border-border overflow-hidden flex-shrink-0">
                      {item.foto_url ? <img src={item.foto_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-textMuted text-[10px] font-bold">{item.nome?.substring(0, 2).toUpperCase()}</div>}
                    </div>
                    <span className="font-medium text-white truncate max-w-[100px] md:max-w-[140px]">{item.nome}</span>
                  </div>
                </td>
                {columns.map(col => (<td key={col.key} className={cn("px-3 py-2 text-center", col.width)}>{col.render ? col.render(item) : item[col.key]}</td>))}
              </tr>
            ))}
            {(!data || data.length === 0) && (<tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-textMuted">Sem dados disponíveis</td></tr>)}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button onClick={() => setExpanded(!expanded)} className="w-full p-2 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/5 transition-colors flex items-center justify-center gap-1 border-t border-border">
          {expanded ? <>Ver menos <ChevronUp size={14} /></> : <>Ver todos ({data.length}) <ChevronDown size={14} /></>}
        </button>
      )}
    </motion.div>
  );
});

const DuplaCard = memo(({ dupla, delay = 0 }: { dupla: any; delay?: number }) => {
  if (!dupla) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4"><Heart className="text-pink-400" size={18} /><h3 className="font-bold text-white text-sm">Dupla Matadora</h3></div>
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surfaceElevated border-2 border-cyan-500/30 overflow-hidden mb-1">
            {dupla.garcom_foto ? <img src={dupla.garcom_foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-cyan-400 text-sm font-bold">{dupla.garcom_nome?.substring(0, 2).toUpperCase()}</div>}
          </div>
          <span className="text-xs font-medium text-white truncate max-w-[80px]">{dupla.garcom_nome}</span>
          <span className="text-[10px] text-cyan-400">Garçom</span>
        </div>
        <div className="flex flex-col items-center px-2">
          <div className="text-2xl font-black text-pink-400">{dupla.gols_juntos}</div>
          <span className="text-[10px] text-textMuted">gols juntos</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-surfaceElevated border-2 border-emerald-500/30 overflow-hidden mb-1">
            {dupla.artilheiro_foto ? <img src={dupla.artilheiro_foto} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-emerald-400 text-sm font-bold">{dupla.artilheiro_nome?.substring(0, 2).toUpperCase()}</div>}
          </div>
          <span className="text-xs font-medium text-white truncate max-w-[80px]">{dupla.artilheiro_nome}</span>
          <span className="text-[10px] text-emerald-400">Artilheiro</span>
        </div>
      </div>
    </motion.div>
  );
});

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-xl">
      <p className="text-textMuted text-xs mb-1">{label}</p>
      <p className="text-white font-bold text-lg">{payload[0].value} <span className="text-cyan-400 text-sm">gols</span></p>
    </div>
  );
});


// ── Tabela de Ranking Geral de Pontuação ───────────────────────────────────
type SortKey = 'pontos' | 'gols' | 'assistencias' | 'clean_sheets' | 'vitorias' | 'empates' | 'derrotas' | 'titulos' | 'mvps' | 'jogos';
type SortDir = 'desc' | 'asc';

const COLS: { key: SortKey; label: string; abbr: string; color: string; emoji?: string }[] = [
  { key: 'pontos',       label: 'Pontos',       abbr: 'PTS', color: '#fde047' },
  { key: 'gols',        label: 'Gols',          abbr: 'G',   color: '#34d399' },
  { key: 'assistencias',label: 'Assistências',  abbr: 'A',   color: '#22d3ee' },
  { key: 'clean_sheets',label: 'Clean Sheets',  abbr: 'CS',  color: '#2dd4bf' },
  { key: 'vitorias',    label: 'Vitórias',      abbr: 'V',   color: '#4ade80' },
  { key: 'empates',     label: 'Empates',       abbr: 'E',   color: '#fbbf24' },
  { key: 'derrotas',    label: 'Derrotas',      abbr: 'D',   color: '#f87171' },
  { key: 'titulos',     label: 'Títulos',       abbr: '🏆',  color: '#f59e0b' },
  { key: 'mvps',        label: 'MVPs',          abbr: 'MVP', color: '#c084fc' },
  { key: 'jogos',       label: 'Jogos',         abbr: 'J',   color: '#94a3b8' },
];

const RankingPontuacaoTable = memo(({ data }: { data: any[] }) => {
  const [sortKey, setSortKey] = useState<SortKey>('pontos');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const va = Number(a[sortKey] ?? 0);
    const vb = Number(b[sortKey] ?? 0);
    return sortDir === 'desc' ? vb - va : va - vb;
  }), [data, sortKey, sortDir]);

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
      transition={{ delay: 0.15, duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, rgba(10,22,40,0.95) 0%, rgba(6,15,30,0.98) 100%)',
        boxShadow: '0 0 0 1px rgba(250,204,21,0.15), 0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Glow de fundo baseado na coluna ativa */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${col?.color ?? '#fde047'}, transparent)` }}
      />

      {/* Header */}
      <div className="relative px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
          >
            <Crown size={22} className="text-amber-900" fill="currentColor" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Ranking Geral</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique nas colunas para reordenar · Ordenando por <span style={{ color: col?.color }} className="font-bold">{col?.label}</span>
            </p>
          </div>
        </div>

        {/* Fórmula compacta */}
        <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">G×4</span>
            <span className="text-slate-500">+</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">A×3</span>
            <span className="text-slate-500">+</span>
            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 font-bold">CS×4</span>
            <span className="text-slate-500">+</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">V×3</span>
          </div>
          <p className="text-[9px] text-slate-500 font-mono">CS só vale para Goleiro / Recuado</p>
        </div>
      </div>

      {/* Linha divisória com glow */}
      <div className="h-px mx-5" style={{ background: `linear-gradient(90deg, transparent, ${col?.color ?? '#fde047'}40, transparent)` }} />

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="pl-5 pr-2 py-3 text-left w-10">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">#</span>
              </th>
              <th className="px-2 py-3 text-left min-w-[140px]">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Jogador</span>
              </th>
              {COLS.map(c => (
                <th key={c.key} className="px-2 py-3 text-center">
                  <button
                    onClick={() => handleSort(c.key)}
                    className={cn(
                      "group relative flex flex-col items-center gap-0.5 mx-auto transition-all duration-200",
                      "hover:scale-105"
                    )}
                  >
                    {/* Indicador de coluna ativa */}
                    <div
                      className={cn(
                        "absolute -inset-x-2 -inset-y-1 rounded-lg transition-all duration-200",
                        sortKey === c.key ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                      )}
                      style={{ background: `${c.color}18` }}
                    />
                    <span
                      className="relative text-[11px] font-black transition-colors duration-200"
                      style={{ color: sortKey === c.key ? c.color : '#64748b' }}
                    >
                      {c.abbr}
                    </span>
                    {/* Seta de ordenação */}
                    <span
                      className="relative text-[8px] transition-all duration-200"
                      style={{ color: sortKey === c.key ? c.color : 'transparent' }}
                    >
                      {sortDir === 'desc' ? '▼' : '▲'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((item: any, i: number) => {
              // calcula posição real no sorted (não no displayData)
              const realRank = sorted.findIndex(s => s.id === item.id);
              const pts = Number(item.pontos ?? 0);
              const isFirst = realRank === 0;
              const isTop3 = realRank < 3;

              return (
                <tr
                  key={item.id || i}
                  className="hover:bg-white/5 transition-colors duration-100"
                  style={{ background: isFirst ? 'rgba(245,158,11,0.06)' : 'transparent' }}
                >
                  {/* Rank */}
                  <td className="pl-5 pr-2 py-3">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black",
                      realRank === 0 ? "ring-1 ring-amber-400/50" : ""
                    )} style={{
                      background: realRank === 0 ? 'rgba(245,158,11,0.2)'
                        : realRank === 1 ? 'rgba(148,163,184,0.15)'
                        : realRank === 2 ? 'rgba(180,83,9,0.2)'
                        : 'rgba(255,255,255,0.04)',
                      color: realRank === 0 ? '#fbbf24'
                        : realRank === 1 ? '#cbd5e1'
                        : realRank === 2 ? '#fb923c'
                        : '#475569',
                    }}>
                      {realRank === 0 ? '👑' : realRank + 1}
                    </div>
                  </td>

                  {/* Jogador */}
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-shrink-0">
                        <div
                          className="w-9 h-9 rounded-full overflow-hidden"
                          style={{
                            boxShadow: isTop3 ? `0 0 0 2px ${
                              realRank === 0 ? '#f59e0b' : realRank === 1 ? '#94a3b8' : '#c2410c'
                            }60` : '0 0 0 1px rgba(255,255,255,0.08)'
                          }}
                        >
                          {item.foto_url
                            ? <img src={item.foto_url} className="w-full h-full object-cover" alt={item.nome} />
                            : (
                              <div className="w-full h-full flex items-center justify-center text-[11px] font-black"
                                style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                                {item.nome?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                        </div>
                        {item.joga_recuado == 1 && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-teal-500 flex items-center justify-center" title="Recuado">
                            <Shield size={7} className="text-white" fill="currentColor" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate max-w-[120px] leading-tight">{item.nome}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {Number(item.titulos) > 0 && <span className="text-[9px] text-amber-400">🏆×{item.titulos}</span>}
                          {Number(item.mvps) > 0 && <span className="text-[9px] text-purple-400">★MVP</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Colunas de stats */}
                  {COLS.map(c => {
                    const val = Number(item[c.key] ?? 0);
                    const isActive = sortKey === c.key;
                    const isEmpty = val === 0;
                    return (
                      <td key={c.key} className="px-2 py-3 text-center">
                        {c.key === 'pontos' ? (
                          <div
                            className="inline-flex items-center justify-center font-black text-sm rounded-lg px-2.5 py-1 min-w-[44px] transition-all"
                            style={{
                              background: isTop3
                                ? `${c.color}18`
                                : 'rgba(255,255,255,0.04)',
                              color: isTop3 ? c.color : '#e2e8f0',
                              boxShadow: isTop3 ? `0 0 12px ${c.color}20` : 'none',
                            }}
                          >
                            {pts % 1 === 0 ? pts : pts.toFixed(1)}
                          </div>
                        ) : (
                          <span
                            className={cn("font-bold text-sm transition-all duration-150", isActive && !isEmpty ? "scale-110" : "")}
                            style={{
                              color: isEmpty ? 'rgba(100,116,139,0.3)'
                                : isActive ? c.color
                                : '#94a3b8',
                              display: 'inline-block',
                            }}
                          >
                            {isEmpty ? '—' : val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {data.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 2} className="py-16 text-center">
                  <Trophy size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-slate-500 text-sm">Jogue partidas para gerar o ranking</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-3 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 border-t"
          style={{
            borderColor: `${col?.color ?? '#fde047'}20`,
            color: col?.color ?? '#fde047',
            background: `${col?.color ?? '#fde047'}06`,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `${col?.color ?? '#fde047'}12`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${col?.color ?? '#fde047'}06`)}
        >
          {expanded
            ? <><ChevronUp size={14} /> Mostrar menos</>
            : <><ChevronDown size={14} /> Ver todos os {data.length} jogadores</>
          }
        </button>
      )}
    </motion.div>
  );
});


export function AnalyticsGeralView() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', 'geral'],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/geral');
        return {
          totais: response.data.totais || { total_jogos: 0, total_gols: 0, total_jogadores: 0 },
          rankings: response.data.rankings || { artilheiros: [], garcons: [] },
          evolucao: response.data.evolucao || [],
          recordes: response.data.recordes || [],
          melhorDupla: response.data.melhorDupla || null,
          rankingPontuacao: response.data.rankingPontuacao || [],
        };
      } catch (err) {
        console.error("Erro ao buscar analytics:", err);
        throw err;
      }
    },
    retry: 1
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;

  if (isError || !data) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center rounded-xl border border-red-500/30 bg-red-500/10">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
      <p className="text-red-300 font-bold">Não foi possível carregar os dados</p>
    </motion.div>
  );

  const { totais, rankings, evolucao, recordes, melhorDupla, rankingPontuacao } = data;
  const mediaGols = totais?.total_jogos > 0 ? (totais.total_gols / totais.total_jogos).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h2 className="text-2xl font-black"><span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">Visão Panorâmica</span></h2>
        <p className="text-textMuted text-sm mt-1">Estatísticas gerais de todas as competições</p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Total de Jogos" value={totais?.total_jogos || 0} icon={Calendar} color="cyan-400" delay={0} />
        <KPICard title="Gols Marcados" value={totais?.total_gols || 0} icon={Goal} color="emerald-400" delay={0.05} />
        <KPICard title="Média de Gols" value={mediaGols} subtitle="/ jogo" icon={Activity} color="purple-400" delay={0.1} />
        <KPICard title="Jogadores" value={totais?.total_jogadores || '-'} icon={Users} color="amber-400" delay={0.15} />
      </div>

      {rankingPontuacao && rankingPontuacao.length > 0 && (
        <RankingPontuacaoTable data={rankingPontuacao} />
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-surface/50 backdrop-blur-md p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"><TrendingUp className="text-white" size={20} /></div>
            <div><h3 className="font-bold text-white">Evolução de Gols</h3><p className="text-[11px] text-textMuted">Últimos 12 meses</p></div>
          </div>
        </div>
        <div className="h-[220px] md:h-[280px] w-full">
          {evolucao && evolucao.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolucao}>
                <defs><linearGradient id="colorGolsGeral" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="mes_ano" stroke="#4b7c99" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                <YAxis stroke="#4b7c99" fontSize={10} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total_gols" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorGolsGeral)" dot={{ fill: '#06b6d4', strokeWidth: 0, r: 3 }} activeDot={{ fill: '#06b6d4', strokeWidth: 2, stroke: '#fff', r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-textMuted"><Activity size={40} className="mb-3 opacity-30" /><p className="text-sm">Dados insuficientes</p></div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingTable title="Artilheiros" data={rankings?.artilheiros || []} icon={Goal} color="emerald-400" delay={0.25} initialRows={5} columns={[
          { key: 'gols', label: 'Gols', width: 'w-16', render: (item) => <span className="font-black text-emerald-400">{item.gols}</span> },
          { key: 'jogos', label: 'J', width: 'w-12', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
          { key: 'media', label: 'Méd', width: 'w-14', render: (item) => <span className="text-cyan-400 text-xs">{item.media}</span> },
        ]} />
        <RankingTable title="Garçons" data={rankings?.garcons || []} icon={Target} color="cyan-400" delay={0.3} initialRows={5} columns={[
          { key: 'assistencias', label: 'Ast', width: 'w-16', render: (item) => <span className="font-black text-cyan-400">{item.assistencias}</span> },
          { key: 'jogos', label: 'J', width: 'w-12', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
          { key: 'media', label: 'Méd', width: 'w-14', render: (item) => <span className="text-emerald-400 text-xs">{item.media}</span> },
        ]} />
      </div>

      <RankingTable title="Artilheiros por Média (mín. 5 jogos)" data={rankings?.mediaGols || []} icon={Crosshair} color="purple-400" delay={0.35} initialRows={5} columns={[
        { key: 'media', label: 'Média', width: 'w-16', render: (item) => <span className="font-black text-purple-400">{item.media}</span> },
        { key: 'gols', label: 'Gols', width: 'w-14', render: (item) => <span className="text-emerald-400">{item.gols}</span> },
        { key: 'jogos', label: 'Jogos', width: 'w-14', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingTable title="Muralhas (Goleiros)" data={rankings?.goleiros || []} icon={Shield} color="amber-400" delay={0.4} initialRows={5} columns={[
          { key: 'jogos', label: 'J', width: 'w-10', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
          { key: 'gols_sofridos', label: 'GS', width: 'w-10', render: (item) => <span className="text-red-400">{item.gols_sofridos}</span> },
          { key: 'clean_sheets', label: 'CS', width: 'w-10', render: (item) => <span className="text-emerald-400 font-bold">{item.clean_sheets}</span> },
          { key: 'media_sofridos', label: 'Méd', width: 'w-12', render: (item) => <span className="font-black text-amber-400">{item.media_sofridos}</span> },
        ]} />
        <RankingTable title="Xerifes (Zagueiros)" data={rankings?.zagueiros || []} icon={Medal} color="slate-400" delay={0.45} initialRows={5} columns={[
          { key: 'jogos', label: 'J', width: 'w-10', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
          { key: 'clean_sheets', label: 'CS', width: 'w-10', render: (item) => <span className="text-emerald-400 font-bold">{item.clean_sheets}</span> },
          { key: 'gols', label: 'G', width: 'w-8', render: (item) => <span className="text-cyan-400">{item.gols}</span> },
          { key: 'assistencias', label: 'A', width: 'w-8', render: (item) => <span className="text-purple-400">{item.assistencias}</span> },
          { key: 'media_gols_sofridos', label: 'GS/J', width: 'w-12', render: (item) => <span className="text-amber-400 text-xs">{item.media_gols_sofridos}</span> },
        ]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RankingTable title="Maiores Participações (G+A)" data={rankings?.participacoes || []} icon={Trophy} color="pink-400" delay={0.5} initialRows={5} columns={[
            { key: 'participacoes', label: 'G+A', width: 'w-14', render: (item) => <span className="font-black text-pink-400">{item.participacoes}</span> },
            { key: 'gols', label: 'Gols', width: 'w-12', render: (item) => <span className="text-emerald-400">{item.gols}</span> },
            { key: 'assistencias', label: 'Ast', width: 'w-12', render: (item) => <span className="text-cyan-400">{item.assistencias}</span> },
            { key: 'jogos', label: 'J', width: 'w-10', render: (item) => <span className="text-textMuted">{item.jogos}</span> },
          ]} />
        </div>
        <DuplaCard dupla={melhorDupla} delay={0.55} />
      </div>
      {recordes && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface/50 p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-textMuted mb-1">Maior Goleada</p>
            <p className="text-3xl font-black text-cyan-400">{recordes.maior_goleada || 0}</p>
            <p className="text-xs text-textMuted">gols de diferença</p>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-textMuted mb-1">Jogo com Mais Gols</p>
            <p className="text-3xl font-black text-emerald-400">{recordes.mais_gols_jogo || 0}</p>
            <p className="text-xs text-textMuted">gols em uma partida</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}