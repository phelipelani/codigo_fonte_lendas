import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface PerformanceChartProps {
  aproveitamento: number;
  ultimasPartidas: any[];
}

// Custom Dot to show Green/Yellow/Red based on match result
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const color = payload.resultado === 'V' ? '#10b981' : payload.resultado === 'E' ? '#f59e0b' : '#ef4444';
  
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      stroke={color} 
      strokeWidth={2} 
      fill="#0a1526" 
      style={{ filter: `drop-shadow(0px 0px 4px ${color}80)` }}
    />
  );
};

// Custom Tooltip for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = data.resultado === 'V' ? 'text-emerald-400' : data.resultado === 'E' ? 'text-amber-400' : 'text-red-400';
    return (
      <div className="bg-surfaceElevated border border-border/50 p-2 rounded-lg shadow-xl text-xs">
        <p className={cn("font-bold", color)}>
          {data.resultado === 'V' ? 'Vitória' : data.resultado === 'E' ? 'Empate' : 'Derrota'}
        </p>
        <p className="text-textMuted mt-1">{data.adversario}</p>
      </div>
    );
  }
  return null;
};

export function PerformanceChart({ aproveitamento, ultimasPartidas }: PerformanceChartProps) {
  const [filter, setFilter] = useState<number>(10);

  const historyData = useMemo(() => {
    if (!ultimasPartidas || ultimasPartidas.length === 0) return [];
    
    // Pegar as últimas N e reverter para ficar em ordem cronológica (esq -> dir)
    const matches = ultimasPartidas.slice(0, filter).reverse();
    
    return matches.map((p, index) => {
      let score = 0;
      if (p.resultado === 'V') score = 100;
      else if (p.resultado === 'E') score = 50;
      else score = 0;
      
      const isTimeA = p.time_id === p.timeA_id;
      const adversario = isTimeA ? p.timeB_nome : p.timeA_nome;
      
      return {
        id: p.partida_id || index,
        score,
        resultado: p.resultado,
        adversario
      };
    });
  }, [ultimasPartidas, filter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-border/50 bg-surface/30 p-5 md:p-6 flex flex-col h-full relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />

      <div className="flex items-center gap-2 mb-4 z-10">
        <Activity size={18} className="text-cyan-400" />
        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Desempenho</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-stretch flex-1 z-10">
        
        {/* Lado Esquerdo: Gráfico e Filtros */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-2 mb-4">
            {[10, 5, 3].map(num => (
              <button
                key={num}
                onClick={() => setFilter(num)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase transition-all duration-300",
                  filter === num 
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" 
                    : "bg-surfaceElevated text-textMuted border border-border/50 hover:bg-surfaceElevated/80"
                )}
              >
                {num} Jogos
              </button>
            ))}
          </div>

          <div className="h-28 md:h-32 w-full mt-auto">
            {historyData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                    dot={<CustomDot />}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-textMuted text-xs">
                Sem histórico suficiente
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Aproveitamento */}
        <div className="flex flex-col items-center justify-center md:items-end min-w-[120px] pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border/50 pl-0 md:pl-6">
          <span className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)] tracking-tighter">
            {aproveitamento}%
          </span>
          <span className="text-[10px] text-textMuted uppercase font-bold tracking-widest mt-2">Aproveitamento</span>
        </div>

      </div>
    </motion.div>
  );
}
