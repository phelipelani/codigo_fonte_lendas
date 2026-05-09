// Arquivo: src/features/Analytics/components/AnalyticsTimeView.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { 
  Trophy, Goal, Target, Shield, Activity, Shirt, Users,
  Search, Loader2, TrendingUp, TrendingDown, Calendar, Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAllTimes } from '@/api/timeApi';

// Card de estatística
const StatCard = ({ label, value, icon: Icon, color, subtitle, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
    className={cn(
      "rounded-xl border p-3 text-center transition-all",
      "bg-surface/50 backdrop-blur-md",
      "border-border hover:border-cyan-500/40"
    )}
  >
    <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center", `bg-${color}/10 text-${color}`)}>
      <Icon size={16} />
    </div>
    <span className="text-xl font-black text-white block">{value}</span>
    <span className="text-[9px] uppercase font-bold text-textMuted tracking-wider">{label}</span>
    {subtitle && <span className="text-[10px] text-textMuted block">{subtitle}</span>}
  </motion.div>
);

// Card de ranking
const RankingCard = ({ title, data, icon: Icon, color, metricKey = 'total', metricLabel = '', delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-xl border border-border bg-surface/50 backdrop-blur-md overflow-hidden"
  >
    <div className={cn("p-3 border-b border-border flex items-center gap-2", `bg-gradient-to-r from-${color}/10 to-transparent`)}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", `bg-${color}/20 text-${color}`)}>
        <Icon size={14} />
      </div>
      <h3 className="font-bold text-white text-sm">{title}</h3>
    </div>
    
    <div className="divide-y divide-border/50">
      {data?.slice(0, 5).map((j: any, i: number) => (
        <div key={j.id || i} className="flex items-center justify-between p-2.5 px-3 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
              i === 0 ? "bg-amber-500/20 text-amber-400" :
              i === 1 ? "bg-gray-400/20 text-gray-300" :
              i === 2 ? "bg-orange-600/20 text-orange-400" :
              "bg-surfaceElevated text-textMuted"
            )}>
              {i + 1}
            </span>
            <div className="w-7 h-7 rounded-full bg-surfaceElevated border border-border overflow-hidden">
              {j.foto_url ? (
                <img src={j.foto_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-textMuted text-[9px] font-bold">
                  {j.nome?.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-white font-medium truncate max-w-[100px]">{j.nome}</span>
          </div>
          <span className={cn("font-black", `text-${color}`)}>{j[metricKey]} {metricLabel}</span>
        </div>
      ))}
      {(!data || data.length === 0) && (
        <div className="p-4 text-center text-textMuted text-sm">Sem dados</div>
      )}
    </div>
  </motion.div>
);

// Card de partida
const PartidaCard = ({ partida, timeId }: any) => {
  const isTimeA = partida.timeA_id === parseInt(timeId);
  const meuTime = isTimeA ? partida.timeA_nome : partida.timeB_nome;
  const adversario = isTimeA ? partida.timeB_nome : partida.timeA_nome;
  const meuPlacar = isTimeA ? partida.placar_timeA : partida.placar_timeB;
  const placarAdv = isTimeA ? partida.placar_timeB : partida.placar_timeA;
  const advLogo = isTimeA ? partida.timeB_logo : partida.timeA_logo;
  
  const resultadoColor = partida.resultado === 'V' ? 'emerald' : partida.resultado === 'D' ? 'red' : 'amber';
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surfaceElevated/30 border border-border/50">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
        `bg-${resultadoColor}-500/20 text-${resultadoColor}-400`
      )}>
        {partida.resultado}
      </div>
      <div className="w-8 h-8 rounded-full bg-surfaceElevated border border-border overflow-hidden flex-shrink-0">
        {advLogo ? (
          <img src={advLogo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-textMuted text-[9px] font-bold">
            {adversario?.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">
          vs <span className="font-bold">{adversario}</span>
        </p>
        <p className="text-xs text-textMuted">
          <span className={`text-${resultadoColor}-400 font-bold`}>{meuPlacar}</span>
          <span className="mx-1">x</span>
          <span>{placarAdv}</span>
        </p>
      </div>
      {partida.data && (
        <span className="text-[10px] text-textMuted">
          {new Date(partida.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </span>
      )}
    </div>
  );
};

export function AnalyticsTimeView() {
  const { data: todosTimes } = useAllTimes();
  const [timeId, setTimeId] = useState<string>("");

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', 'time', timeId],
    queryFn: async () => {
      if (!timeId) return null;
      const res = await api.get(`/analytics/time/${timeId}`);
      return res.data;
    },
    enabled: !!timeId
  });

  const listaTimes = todosTimes?.sort((a: any, b: any) => a.nome.localeCompare(b.nome)) || [];

  const info = stats?.info;
  const desempenho = stats?.desempenho || { jogos: 0, vitorias: 0, empates: 0, derrotas: 0, gols_pro: 0, gols_contra: 0 };
  const rankings = stats?.rankings || { artilheiros: [], garcons: [], mais_jogaram: [] };
  const ultimasPartidas = stats?.ultimasPartidas || [];
  const titulos = stats?.titulos || [];

  const totalJogos = Number(desempenho.jogos) || 0;
  const ptsDisputados = totalJogos * 3;
  const ptsGanhos = (Number(desempenho.vitorias) * 3) + Number(desempenho.empates);
  const aproveitamento = ptsDisputados > 0 ? Math.round((ptsGanhos / ptsDisputados) * 100) : 0;
  const saldoGols = Number(desempenho.gols_pro || 0) - Number(desempenho.gols_contra || 0);

  return (
    <div className="space-y-6">
      
      {/* Header com Seletor */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h2 className="text-2xl font-black mb-4">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Análise por Time
          </span>
        </h2>
        
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted z-10" size={18} />
          <Select value={timeId} onValueChange={setTimeId}>
            <SelectTrigger className="h-12 pl-11 bg-surface/50 border-border text-white focus:border-cyan-400/50">
              <SelectValue placeholder="Selecione um time..." />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border max-h-[300px]">
              {listaTimes.map((t: any) => (
                <SelectItem key={t.id} value={String(t.id)} className="text-white focus:bg-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surfaceElevated overflow-hidden">
                      {t.logo_url ? <img src={t.logo_url} className="w-full h-full object-cover" /> : <Shirt size={14} className="m-auto mt-1 text-textMuted" />}
                    </div>
                    {t.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {/* Placeholder */}
      {!timeId && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Shirt size={60} className="mx-auto mb-4 text-textMuted/30" />
          <p className="text-textMuted">Selecione um time para ver suas estatísticas</p>
        </motion.div>
      )}

      {/* Conteúdo do Time */}
      <AnimatePresence mode="wait">
        {stats && info && (
          <motion.div
            key={timeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            
            {/* Header do Time */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-surface to-surfaceElevated p-4 md:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl border-2 border-cyan-500/30 overflow-hidden shadow-lg shadow-cyan-500/10 bg-surfaceElevated flex items-center justify-center">
                  {info.logo_url ? (
                    <img src={info.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <Shirt size={40} className="text-cyan-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-black text-white">{info.nome}</h3>
                  {titulos.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Trophy size={14} className="text-amber-400" />
                      <span className="text-sm text-amber-400 font-bold">{titulos.length} título{titulos.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-3xl font-black text-cyan-400">{aproveitamento}%</p>
                  <p className="text-xs text-textMuted">Aproveitamento</p>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid - Desempenho */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              <StatCard label="Jogos" value={desempenho.jogos || 0} icon={Activity} color="cyan-400" delay={0} />
              <StatCard label="Vitórias" value={desempenho.vitorias || 0} icon={Trophy} color="emerald-400" delay={0.05} />
              <StatCard label="Empates" value={desempenho.empates || 0} icon={Minus} color="amber-400" delay={0.1} />
              <StatCard label="Derrotas" value={desempenho.derrotas || 0} icon={TrendingDown} color="red-400" delay={0.15} />
              <StatCard label="Gols Pró" value={desempenho.gols_pro || 0} icon={Goal} color="emerald-400" delay={0.2} />
              <StatCard label="Gols Contra" value={desempenho.gols_contra || 0} icon={Shield} color="red-400" delay={0.25} />
            </div>

            {/* Barra de Aproveitamento + Saldo */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Aproveitamento */}
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-textMuted">Aproveitamento</span>
                  <span className="text-lg font-black text-cyan-400">{aproveitamento}%</span>
                </div>
                <div className="w-full h-3 bg-surfaceElevated rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all" style={{ width: `${aproveitamento}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-textMuted">
                  <span>{desempenho.vitorias}V / {desempenho.empates}E / {desempenho.derrotas}D</span>
                  <span>{ptsGanhos} de {ptsDisputados} pts</span>
                </div>
              </div>

              {/* Saldo de Gols */}
              <div className="rounded-xl border border-border bg-surface/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-textMuted">Saldo de Gols</span>
                  <span className={cn("text-lg font-black", saldoGols > 0 ? "text-emerald-400" : saldoGols < 0 ? "text-red-400" : "text-amber-400")}>
                    {saldoGols > 0 ? '+' : ''}{saldoGols}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400">Pró: {desempenho.gols_pro || 0}</span>
                    </div>
                    <div className="w-full h-2 bg-surfaceElevated rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((desempenho.gols_pro || 0) / Math.max(desempenho.gols_pro || 1, desempenho.gols_contra || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-red-400">Contra: {desempenho.gols_contra || 0}</span>
                    </div>
                    <div className="w-full h-2 bg-surfaceElevated rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${Math.min(100, ((desempenho.gols_contra || 0) / Math.max(desempenho.gols_pro || 1, desempenho.gols_contra || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rankings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RankingCard 
                title="Artilheiros" 
                data={rankings.artilheiros} 
                icon={Goal} 
                color="emerald-400" 
                metricKey="total"
                delay={0.25} 
              />
              <RankingCard 
                title="Garçons" 
                data={rankings.garcons} 
                icon={Target} 
                color="cyan-400" 
                metricKey="total"
                delay={0.3} 
              />
              <RankingCard 
                title="Mais Jogaram" 
                data={rankings.mais_jogaram} 
                icon={Users} 
                color="purple-400" 
                metricKey="total"
                delay={0.35} 
              />
            </div>

            {/* Últimas Partidas */}
            {ultimasPartidas.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-xl border border-border bg-surface/50 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-cyan-400" />
                  <h4 className="font-bold text-white text-sm">Últimas Partidas</h4>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {ultimasPartidas.map((p: any, i: number) => (
                    <PartidaCard key={p.partida_id || i} partida={p} timeId={timeId} />
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}