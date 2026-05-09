// Arquivo: src/features/Analytics/components/AnalyticsRivalidadesView.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { 
  Swords, Trophy, Goal, Target, Users, Shield, Search, 
  Loader2, TrendingUp, Minus, Heart, Zap, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJogadores } from '@/features/jogadores/api/useJogadores';

// Avatar do jogador
const PlayerAvatar = ({ foto, nome, size = 'lg' }: { foto?: string; nome: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-[9px]',
    md: 'w-10 h-10 text-[10px]',
    lg: 'w-16 h-16 text-sm',
    xl: 'w-20 h-20 text-base'
  };
  
  return (
    <div className={cn(
      "rounded-full bg-surfaceElevated border-2 border-border overflow-hidden flex-shrink-0",
      sizeClasses[size]
    )}>
      {foto ? (
        <img src={foto} className="w-full h-full object-cover" alt={nome} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-textMuted font-bold">
          {nome?.substring(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
};

// Barra de comparação
const CompareBar = ({ label, valueA, valueB, colorA = 'cyan', colorB = 'purple', icon: Icon }: any) => {
  const total = (valueA || 0) + (valueB || 0);
  const percentA = total > 0 ? ((valueA || 0) / total) * 100 : 50;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`text-${colorA}-400 font-bold`}>{valueA || 0}</span>
        <div className="flex items-center gap-1 text-textMuted">
          {Icon && <Icon size={12} />}
          <span className="uppercase text-[10px] tracking-wider">{label}</span>
        </div>
        <span className={`text-${colorB}-400 font-bold`}>{valueB || 0}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-surfaceElevated">
        <div 
          className={`bg-${colorA}-500 transition-all`} 
          style={{ width: `${percentA}%` }} 
        />
        <div 
          className={`bg-${colorB}-500 transition-all`} 
          style={{ width: `${100 - percentA}%` }} 
        />
      </div>
    </div>
  );
};

// Stat individual
const StatItem = ({ label, value, color }: any) => (
  <div className="text-center">
    <span className={cn("text-xl font-black block", `text-${color}`)}>{value}</span>
    <span className="text-[9px] uppercase text-textMuted tracking-wider">{label}</span>
  </div>
);

export function AnalyticsRivalidadesView() {
  const { data: todosJogadores } = useJogadores();
  const [jogadorAId, setJogadorAId] = useState<string>("");
  const [jogadorBId, setJogadorBId] = useState<string>("");

  const { data: confronto, isLoading } = useQuery({
    queryKey: ['analytics', 'confronto', jogadorAId, jogadorBId],
    queryFn: async () => {
      if (!jogadorAId || !jogadorBId) return null;
      const res = await api.get(`/analytics/confronto/${jogadorAId}/${jogadorBId}`);
      return res.data;
    },
    enabled: !!jogadorAId && !!jogadorBId && jogadorAId !== jogadorBId
  });

  const listaJogadores = (todosJogadores || []).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  
  const jogA = confronto?.jogadorA;
  const jogB = confronto?.jogadorB;
  const statsA = jogA?.stats || {};
  const statsB = jogB?.stats || {};
  const desA = jogA?.desempenho || { jogos: 0, vitorias: 0, empates: 0, derrotas: 0 };
  const desB = jogB?.desempenho || { jogos: 0, vitorias: 0, empates: 0, derrotas: 0 };
  const conf = confronto?.confronto || { jogos: 0, vitorias_A: 0, vitorias_B: 0, empates: 0, gols_A: 0, gols_B: 0 };
  const parc = confronto?.parceria || { jogos_juntos: 0, vitorias_juntos: 0, gols_A_assistidos_por_B: 0, gols_B_assistidos_por_A: 0 };

  // Aproveitamento
  const calcAprov = (v: number = 0, e: number = 0, j: number = 0) => {
    if (!j) return 0;
    return Math.round(((v * 3 + e) / (j * 3)) * 100);
  };
  const aprovA = calcAprov(desA.vitorias || 0, desA.empates || 0, desA.jogos || 0);
  const aprovB = calcAprov(desB.vitorias || 0, desB.empates || 0, desB.jogos || 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-3">
          <Swords size={16} className="text-red-400" />
          <span className="text-sm font-bold text-red-400">Confronto Direto</span>
        </div>
        <h2 className="text-2xl font-black">
          <span className="bg-gradient-to-r from-cyan-300 via-red-300 to-purple-300 bg-clip-text text-transparent">
            Análise de Rivalidades
          </span>
        </h2>
        <p className="text-textMuted text-sm mt-1">Compare o desempenho de dois jogadores</p>
      </motion.div>

      {/* Seletores lado a lado */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto"
      >
        {/* Jogador A */}
        <div className="relative">
          <div className="absolute -top-2 left-3 px-2 bg-surface text-cyan-400 text-[10px] font-bold uppercase z-10">
            Jogador 1
          </div>
          <Select value={jogadorAId} onValueChange={setJogadorAId}>
            <SelectTrigger className="h-12 bg-surface/50 border-cyan-500/30 text-white focus:border-cyan-400/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border max-h-[300px]">
              {listaJogadores.filter((j: any) => String(j.id) !== jogadorBId).map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)} className="text-white focus:bg-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar foto={j.foto_url} nome={j.nome} size="sm" />
                    {j.nome}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Jogador B */}
        <div className="relative">
          <div className="absolute -top-2 left-3 px-2 bg-surface text-purple-400 text-[10px] font-bold uppercase z-10">
            Jogador 2
          </div>
          <Select value={jogadorBId} onValueChange={setJogadorBId}>
            <SelectTrigger className="h-12 bg-surface/50 border-purple-500/30 text-white focus:border-purple-400/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border max-h-[300px]">
              {listaJogadores.filter((j: any) => String(j.id) !== jogadorAId).map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)} className="text-white focus:bg-purple-500/10">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar foto={j.foto_url} nome={j.nome} size="sm" />
                    {j.nome}
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
      {(!jogadorAId || !jogadorBId) && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Swords size={60} className="mx-auto mb-4 text-textMuted/30" />
          <p className="text-textMuted">Selecione dois jogadores para comparar</p>
        </motion.div>
      )}

      {/* Mesmo jogador selecionado */}
      {jogadorAId && jogadorBId && jogadorAId === jogadorBId && (
        <div className="text-center py-16 text-amber-400">
          <p>Selecione jogadores diferentes para comparar</p>
        </div>
      )}

      {/* Conteúdo */}
      <AnimatePresence mode="wait">
        {confronto && jogA && jogB && (
          <motion.div
            key={`${jogadorAId}-${jogadorBId}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            
            {/* Header VS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-border bg-gradient-to-r from-cyan-500/5 via-surface to-purple-500/5 p-6"
            >
              <div className="flex items-center justify-between gap-4">
                {/* Jogador A */}
                <div className="flex-1 text-center">
                  <PlayerAvatar foto={jogA.foto_url} nome={jogA.nome} size="xl" />
                  <h3 className="text-lg font-black text-white mt-2">{jogA.nome}</h3>
                  <p className="text-xs text-cyan-400">{jogA.posicao || 'Jogador'}</p>
                </div>

                {/* VS */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <span className="text-2xl font-black text-red-400">VS</span>
                  </div>
                </div>

                {/* Jogador B */}
                <div className="flex-1 text-center">
                  <PlayerAvatar foto={jogB.foto_url} nome={jogB.nome} size="xl" />
                  <h3 className="text-lg font-black text-white mt-2">{jogB.nome}</h3>
                  <p className="text-xs text-purple-400">{jogB.posicao || 'Jogador'}</p>
                </div>
              </div>
            </motion.div>

            {/* Stats Gerais Comparadas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-surface/50 p-4 space-y-4"
            >
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp size={14} className="text-cyan-400" />
                Números Gerais
              </h4>
              
              <div className="space-y-3">
                <CompareBar label="Jogos" valueA={statsA.jogos} valueB={statsB.jogos} icon={Users} />
                <CompareBar label="Gols" valueA={statsA.gols} valueB={statsB.gols} icon={Goal} />
                <CompareBar label="Assists" valueA={statsA.assists} valueB={statsB.assists} icon={Target} />
                <CompareBar label="Clean Sheets" valueA={statsA.clean_sheets} valueB={statsB.clean_sheets} icon={Shield} />
                <CompareBar label="Vitórias" valueA={desA.vitorias} valueB={desB.vitorias} icon={Trophy} />
                <CompareBar label="Aproveitamento" valueA={aprovA} valueB={aprovB} icon={TrendingUp} />
              </div>
            </motion.div>

            {/* Confrontos Diretos (quando se enfrentaram) */}
            {conf.jogos > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Swords size={14} className="text-red-400" />
                  Quando se Enfrentaram
                  <span className="text-xs text-textMuted ml-auto">{conf.jogos} jogos</span>
                </h4>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <span className="text-2xl font-black text-cyan-400">{conf.vitorias_A || 0}</span>
                    <p className="text-[10px] text-textMuted uppercase">Vitórias {jogA.nome?.split(' ')[0]}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-2xl font-black text-amber-400">{conf.empates || 0}</span>
                    <p className="text-[10px] text-textMuted uppercase">Empates</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <span className="text-2xl font-black text-purple-400">{conf.vitorias_B || 0}</span>
                    <p className="text-[10px] text-textMuted uppercase">Vitórias {jogB.nome?.split(' ')[0]}</p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/50">
                  <CompareBar 
                    label="Gols nos Confrontos" 
                    valueA={conf.gols_A} 
                    valueB={conf.gols_B} 
                    icon={Goal} 
                  />
                </div>
              </motion.div>
            )}

            {/* Parceria (quando jogaram juntos) */}
            {parc.jogos_juntos > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
              >
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Heart size={14} className="text-emerald-400" />
                  Quando Jogaram Juntos
                  <span className="text-xs text-textMuted ml-auto">{parc.jogos_juntos} jogos</span>
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-surfaceElevated text-center">
                    <span className="text-xl font-black text-emerald-400">{parc.jogos_juntos}</span>
                    <p className="text-[10px] text-textMuted uppercase">Jogos Juntos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surfaceElevated text-center">
                    <span className="text-xl font-black text-emerald-400">{parc.vitorias_juntos}</span>
                    <p className="text-[10px] text-textMuted uppercase">Vitórias</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surfaceElevated text-center">
                    <span className="text-xl font-black text-cyan-400">{parc.gols_A_assistidos_por_B || 0}</span>
                    <p className="text-[10px] text-textMuted uppercase">Gols {jogA.nome?.split(' ')[0]} c/ assist {jogB.nome?.split(' ')[0]}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surfaceElevated text-center">
                    <span className="text-xl font-black text-purple-400">{parc.gols_B_assistidos_por_A || 0}</span>
                    <p className="text-[10px] text-textMuted uppercase">Gols {jogB.nome?.split(' ')[0]} c/ assist {jogA.nome?.split(' ')[0]}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sem histórico */}
            {conf.jogos === 0 && parc.jogos_juntos === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-textMuted"
              >
                <Users className="mx-auto mb-2 opacity-30" size={32} />
                <p className="text-sm">Estes jogadores nunca se enfrentaram ou jogaram juntos</p>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}