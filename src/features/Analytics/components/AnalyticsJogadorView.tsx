// Arquivo: src/features/Analytics/components/AnalyticsJogadorView.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { 
  Activity, Trophy, Star, TrendingUp, Medal, User, Goal, Shield,
  Search, Loader2, Target, Percent, Gamepad2, Heart, Users, Award,
  Calendar, ChevronRight, Crosshair, HandMetal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJogadores } from '@/features/jogadores/api/useJogadores';

// Card de estatística compacto
const StatCard = ({ label, value, icon: Icon, color, delay = 0 }: any) => (
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
  </motion.div>
);

// Card de parceria
const ParceriaCard = ({ titulo, icon: Icon, color, parceiro, metrica, metricaLabel }: any) => {
  if (!parceiro) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border p-3 transition-all",
        "bg-surface/50 backdrop-blur-md border-border hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", `bg-${color}/10 text-${color}`)}>
          <Icon size={12} />
        </div>
        <span className="text-[10px] uppercase font-bold text-textMuted">{titulo}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-surfaceElevated border border-border overflow-hidden flex-shrink-0">
          {parceiro.foto_url ? (
            <img src={parceiro.foto_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-textMuted text-[10px] font-bold">
              {parceiro.nome?.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{parceiro.nome}</p>
          <p className={cn("text-xs", `text-${color}`)}>{metrica} {metricaLabel}</p>
        </div>
      </div>
    </motion.div>
  );
};

// Card de última partida
const PartidaCard = ({ partida }: any) => {
  const isTimeA = partida.time_id === partida.timeA_id;
  const meuTime = isTimeA ? partida.timeA_nome : partida.timeB_nome;
  const adversario = isTimeA ? partida.timeB_nome : partida.timeA_nome;
  const meuPlacar = isTimeA ? partida.placar_timeA : partida.placar_timeB;
  const placarAdv = isTimeA ? partida.placar_timeB : partida.placar_timeA;
  
  const resultadoColor = partida.resultado === 'V' ? 'emerald' : partida.resultado === 'D' ? 'red' : 'amber';
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surfaceElevated/30 border border-border/50">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
        `bg-${resultadoColor}-500/20 text-${resultadoColor}-400`
      )}>
        {partida.resultado}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white truncate">
          <span className="font-bold">{meuTime}</span>
          <span className="text-textMuted mx-1">{meuPlacar} x {placarAdv}</span>
          <span>{adversario}</span>
        </p>
        <div className="flex gap-2 text-[10px] text-textMuted">
          {partida.gols > 0 && <span className="text-emerald-400">⚽ {partida.gols}</span>}
          {partida.assistencias > 0 && <span className="text-cyan-400">👟 {partida.assistencias}</span>}
          {partida.clean_sheet > 0 && <span className="text-amber-400">🛡️ CS</span>}
        </div>
      </div>
      {partida.data && (
        <span className="text-[10px] text-textMuted">{new Date(partida.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
      )}
    </div>
  );
};

export function AnalyticsJogadorView() {
  const { data: todosJogadores } = useJogadores();
  const [jogadorId, setJogadorId] = useState<string>("");

  const { data: perfil, isLoading } = useQuery({
    queryKey: ['analytics', 'jogador', jogadorId],
    queryFn: async () => {
      if (!jogadorId) return null;
      const res = await api.get(`/analytics/jogador/${jogadorId}`);
      return res.data;
    },
    enabled: !!jogadorId
  });

  const listaJogadores = todosJogadores?.sort((a: any, b: any) => a.nome.localeCompare(b.nome)) || [];

  const jogador = perfil?.jogador;
  // Forçar conversão numérica — PHP retorna strings do MySQL
  const totais = {
    jogos:        Number(perfil?.totais?.jogos        ?? 0),
    gols:         Number(perfil?.totais?.gols         ?? 0),
    assists:      Number(perfil?.totais?.assists      ?? 0),
    clean_sheets: Number(perfil?.totais?.clean_sheets ?? 0),
  };
  const desempenho = {
    vitorias: Number(perfil?.desempenho?.vitorias ?? 0),
    empates:  Number(perfil?.desempenho?.empates  ?? 0),
    derrotas: Number(perfil?.desempenho?.derrotas ?? 0),
  };
  const recordes = perfil?.recordes || {};
  const parcerias = perfil?.parcerias || {};
  const ultimasPartidas = perfil?.ultimasPartidas || [];
  const titulos = perfil?.titulos || [];
  const rankingGeral = perfil?.rankingGeral || { posicao: 0, pontos_total: 0 };
  const premiosRodada = perfil?.premiosRodada || [];
  const premiosCampeonato = perfil?.premiosCampeonato || [];

  // Contadores de prêmios
  const totalMVPsRodada = premiosRodada.filter((p: any) => p.tipo_premio === 'mvp').length;
  const totalMVPsCamp   = premiosCampeonato.filter((p: any) => p.tipo_premio === 'mvp').length;
  const totalArtilheiro = premiosCampeonato.filter((p: any) => p.tipo_premio === 'artilheiro').length;
  const totalGarcom     = premiosCampeonato.filter((p: any) => p.tipo_premio === 'garcom').length;
  const totalPeDeRato   = [...premiosRodada, ...premiosCampeonato].filter((p: any) => p.tipo_premio === 'pe_de_rato').length;

  const totalJogos = totais.jogos;
  const ptsDisputados = totalJogos * 3;
  const ptsGanhos = (desempenho.vitorias * 3) + desempenho.empates;
  const aproveitamento = ptsDisputados > 0 ? Math.round((ptsGanhos / ptsDisputados) * 100) : 0;

  // Médias
  const mediaGols = totalJogos > 0 ? (totais.gols / totalJogos).toFixed(2) : '0.00';
  const mediaAssists = totalJogos > 0 ? (totais.assists / totalJogos).toFixed(2) : '0.00';
  const mediaGA = totalJogos > 0 ? ((totais.gols + totais.assists) / totalJogos).toFixed(2) : '0.00';

  return (
    <div className="space-y-6">
      
      {/* Header com Seletor */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h2 className="text-2xl font-black mb-4">
          <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
            Raio-X do Jogador
          </span>
        </h2>
        
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted z-10" size={18} />
          <Select value={jogadorId} onValueChange={setJogadorId}>
            <SelectTrigger className="h-12 pl-11 bg-surface/50 border-border text-white focus:border-cyan-400/50">
              <SelectValue placeholder="Selecione um jogador..." />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border max-h-[300px]">
              {listaJogadores.map((j: any) => (
                <SelectItem key={j.id} value={String(j.id)} className="text-white focus:bg-cyan-500/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surfaceElevated overflow-hidden">
                      {j.foto_url ? <img src={j.foto_url} className="w-full h-full object-cover" /> : <User size={14} className="m-auto mt-1 text-textMuted" />}
                    </div>
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

      {/* Placeholder quando não selecionou */}
      {!jogadorId && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <User size={60} className="mx-auto mb-4 text-textMuted/30" />
          <p className="text-textMuted">Selecione um jogador para ver suas estatísticas</p>
        </motion.div>
      )}

      {/* Conteúdo do Jogador */}
      <AnimatePresence mode="wait">
        {perfil && jogador && (
          <motion.div
            key={jogadorId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            
            {/* Header do Jogador */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-surface to-surfaceElevated p-4 md:p-6"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-3 border-cyan-500/30 overflow-hidden shadow-lg shadow-cyan-500/10">
                    {jogador.foto_url ? (
                      <img src={jogador.foto_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
                        <User size={32} className="text-cyan-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                    {jogador.joga_recuado ? 'Zagueiro' : jogador.posicao || 'Linha'}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl md:text-2xl font-black text-white">{jogador.nome}</h3>
                  <p className="text-sm text-textMuted">Nível {jogador.nivel || 1}</p>
                </div>
                <div className="text-right hidden md:block space-y-1">
                  {rankingGeral.posicao > 0 && (
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-textMuted font-bold uppercase">Ranking Geral</span>
                      <span className="text-2xl font-black text-amber-400">#{rankingGeral.posicao}</span>
                    </div>
                  )}
                  <p className="text-3xl font-black text-cyan-400">{aproveitamento}%</p>
                  <p className="text-xs text-textMuted">Aproveitamento</p>
                  {rankingGeral.pontos_total > 0 && (
                    <p className="text-xs text-purple-400 font-bold">{rankingGeral.pontos_total.toFixed(1)} pts históricos</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 md:gap-3">
              <StatCard label="Jogos" value={totais.jogos} icon={Gamepad2} color="cyan-400" delay={0} />
              <StatCard label="Gols" value={totais.gols} icon={Goal} color="emerald-400" delay={0.05} />
              <StatCard label="Assists" value={totais.assists} icon={Target} color="purple-400" delay={0.1} />
              <StatCard label="Clean Sheets" value={totais.clean_sheets} icon={Shield} color="amber-400" delay={0.15} />
              <StatCard label="Vitórias" value={desempenho.vitorias} icon={Trophy} color="emerald-400" delay={0.2} />
              <StatCard label="Derrotas" value={desempenho.derrotas} icon={TrendingUp} color="red-400" delay={0.25} />
              <StatCard label="Títulos" value={titulos.length} icon={Medal} color="amber-400" delay={0.3} />
            </div>

            {/* Badges de Conquistas */}
            {(titulos.length > 0 || totalMVPsRodada > 0 || totalMVPsCamp > 0 || totalArtilheiro > 0 || totalGarcom > 0 || totalPeDeRato > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="flex flex-wrap gap-2"
              >
                {titulos.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    <Trophy size={12} />
                    {titulos.length} Título{titulos.length > 1 ? 's' : ''}
                  </div>
                )}
                {totalMVPsCamp > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 text-xs font-bold">
                    <Star size={12} />
                    MVP {totalMVPsCamp > 1 ? `×${totalMVPsCamp}` : ''}
                  </div>
                )}
                {totalMVPsRodada > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
                    <Star size={12} />
                    Craque da Sem. ×{totalMVPsRodada}
                  </div>
                )}
                {totalArtilheiro > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <Goal size={12} />
                    Artilheiro {totalArtilheiro > 1 ? `×${totalArtilheiro}` : ''}
                  </div>
                )}
                {totalGarcom > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">
                    <Target size={12} />
                    Garçom {totalGarcom > 1 ? `×${totalGarcom}` : ''}
                  </div>
                )}
                {totalPeDeRato > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
                    🐀 Pé de Rato ×{totalPeDeRato}
                  </div>
                )}
              </motion.div>
            )}

            {/* Desempenho e Médias */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Desempenho */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="rounded-xl border border-border bg-surface/50 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-cyan-400" />
                  <h4 className="font-bold text-white text-sm">Desempenho</h4>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400 font-bold">{desempenho.vitorias}V</span>
                    <span className="text-amber-400 font-bold">{desempenho.empates}E</span>
                    <span className="text-red-400 font-bold">{desempenho.derrotas}D</span>
                  </div>
                  <span className="text-lg font-black text-cyan-400">{aproveitamento}%</span>
                </div>
                <div className="w-full h-2 bg-surfaceElevated rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500" style={{ width: `${aproveitamento}%` }} />
                </div>
              </motion.div>

              {/* Médias */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                className="rounded-xl border border-border bg-surface/50 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Crosshair size={16} className="text-purple-400" />
                  <h4 className="font-bold text-white text-sm">Médias por Jogo</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-emerald-400">{mediaGols}</p>
                    <p className="text-[10px] text-textMuted uppercase">Gols</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-cyan-400">{mediaAssists}</p>
                    <p className="text-[10px] text-textMuted uppercase">Assists</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-purple-400">{mediaGA}</p>
                    <p className="text-[10px] text-textMuted uppercase">G+A</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recordes Pessoais */}
            {(recordes.mais_gols_partida > 0 || recordes.mais_assists_partida > 0) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-amber-400" />
                  <h4 className="font-bold text-white text-sm">Recordes Pessoais</h4>
                </div>
                <div className="flex gap-6">
                  {recordes.mais_gols_partida > 0 && (
                    <div className="flex items-center gap-2">
                      <Goal size={20} className="text-emerald-400" />
                      <div>
                        <p className="text-lg font-black text-white">{recordes.mais_gols_partida}</p>
                        <p className="text-[10px] text-textMuted uppercase">Gols em 1 jogo</p>
                      </div>
                    </div>
                  )}
                  {recordes.mais_assists_partida > 0 && (
                    <div className="flex items-center gap-2">
                      <Target size={20} className="text-cyan-400" />
                      <div>
                        <p className="text-lg font-black text-white">{recordes.mais_assists_partida}</p>
                        <p className="text-[10px] text-textMuted uppercase">Assists em 1 jogo</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Parcerias */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="flex items-center gap-2 mb-3">
                <Heart size={16} className="text-pink-400" />
                <h4 className="font-bold text-white text-sm">Parcerias</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ParceriaCard 
                  titulo="Garçom Favorito" 
                  icon={Target} 
                  color="cyan-400" 
                  parceiro={parcerias.garcomFavorito} 
                  metrica={parcerias.garcomFavorito?.total} 
                  metricaLabel="assists" 
                />
                <ParceriaCard 
                  titulo="Artilheiro Favorito" 
                  icon={Goal} 
                  color="emerald-400" 
                  parceiro={parcerias.artilheiroFavorito} 
                  metrica={parcerias.artilheiroFavorito?.total} 
                  metricaLabel="gols" 
                />
                <ParceriaCard 
                  titulo="Zagueiro Sólido" 
                  icon={Shield} 
                  color="amber-400" 
                  parceiro={parcerias.zagueiroSolido} 
                  metrica={parcerias.zagueiroSolido?.clean_sheets} 
                  metricaLabel="CS" 
                />
                <ParceriaCard 
                  titulo="Zagueiro Artilheiro" 
                  icon={Crosshair} 
                  color="purple-400" 
                  parceiro={parcerias.zagueiroArtilheiro} 
                  metrica={parcerias.zagueiroArtilheiro?.gols} 
                  metricaLabel="gols" 
                />
                <ParceriaCard 
                  titulo="Goleiro de Confiança" 
                  icon={HandMetal} 
                  color="teal-400" 
                  parceiro={parcerias.goleiroConfianca} 
                  metrica={parcerias.goleiroConfianca?.clean_sheets} 
                  metricaLabel="CS" 
                />
                <ParceriaCard 
                  titulo="Mais Jogou Junto" 
                  icon={Users} 
                  color="blue-400" 
                  parceiro={parcerias.parceiroFrequente} 
                  metrica={parcerias.parceiroFrequente?.jogos_juntos} 
                  metricaLabel="jogos" 
                />
                <ParceriaCard 
                  titulo="Parceiro de Vitórias" 
                  icon={Trophy} 
                  color="emerald-400" 
                  parceiro={parcerias.parceiroVitorias} 
                  metrica={parcerias.parceiroVitorias?.vitorias_juntos} 
                  metricaLabel="vitórias" 
                />
              </div>
            </motion.div>

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
                    <PartidaCard key={p.partida_id || i} partida={p} />
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