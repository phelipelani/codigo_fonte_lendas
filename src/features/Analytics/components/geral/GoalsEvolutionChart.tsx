import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const GoalsEvolutionChart = memo(({ evolucao }: { evolucao: any[] }) => {
  const [filter, setFilter] = useState<number>(10);
  
  const displayData = evolucao?.slice(-filter) || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full rounded-2xl border border-border/50 bg-surface/30 p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-cyan-400" />
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">Evolução de Gols</h3>
        </div>
        <select 
          className="bg-surfaceElevated border border-border/50 text-[10px] text-textMuted rounded px-2 py-1 outline-none cursor-pointer"
          value={filter}
          onChange={(e) => setFilter(Number(e.target.value))}
        >
          <option value={10}>Últimos 10 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={100}>Todo o período</option>
        </select>
      </div>

      <div className="flex-1 min-h-[200px] w-full mt-2 relative">
        {displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGolsGeral2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="mes_ano" stroke="#4b7c99" fontSize={9} tickMargin={8} axisLine={false} tickLine={false} />
              <YAxis stroke="#4b7c99" fontSize={9} axisLine={false} tickLine={false} />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface border border-border/50 rounded p-2 shadow-xl">
                        <p className="text-textMuted text-[10px] mb-1 uppercase">{label}</p>
                        <p className="text-white font-bold text-sm">{payload[0].value} <span className="text-cyan-400 text-[10px] font-normal">gols</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="total_gols" 
                stroke="#06b6d4" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorGolsGeral2)" 
                dot={{ fill: '#06b6d4', strokeWidth: 0, r: 3 }} 
                activeDot={{ fill: '#06b6d4', strokeWidth: 2, stroke: '#fff', r: 5 }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-textMuted">
            <Activity size={32} className="mb-2 opacity-30" />
            <p className="text-[10px] uppercase font-bold tracking-wider">Sem dados</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});
