import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export function PlayerStatsRadar({ stats }: { stats: any }) {
  if (!stats?.totais || !stats?.desempenho) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white/30 text-sm">
        Sem dados suficientes
      </div>
    );
  }

  const jogos = stats.totais.jogos || 1; // Evita divisão por zero
  
  // === CÁLCULOS DAS MÉTRICAS ===
  
  // 1. Artilharia (Média de Gols - Teto: 1.0 gol/jogo = 100%)
  const mediaGols = stats.totais.gols / jogos;
  const artilharia = Math.min(mediaGols * 100, 100);

  // 2. Assistências (Média de Assists - Teto: 0.8 assist/jogo = 100%)
  const mediaAssists = stats.totais.assists / jogos;
  const assistencias = Math.min(mediaAssists * 125, 100);

  // 3. Vitórias (% de Vitórias)
  const vitorias = (stats.desempenho.vitorias / jogos) * 100;

  // 4. Defesa/Solidez (Clean Sheets / Jogos - Teto: 50% = 100 pontos)
  const taxaCleanSheet = stats.totais.clean_sheets / jogos;
  const defesa = Math.min(taxaCleanSheet * 200, 100);

  // 5. Regularidade (Baseado no total de jogos - Teto: 50 jogos = 100%)
  // Renomeado de "Experiência" para "Regularidade" - mais claro
  const regularidade = Math.min((jogos / 50) * 100, 100);

  const data = [
    { subject: 'Artilharia', value: Math.round(artilharia) },
    { subject: 'Assistência', value: Math.round(assistencias) },
    { subject: 'Vitórias', value: Math.round(vitorias) },
    { subject: 'Defesa', value: Math.round(defesa) },
    { subject: 'Regularidade', value: Math.round(regularidade) },
  ];

  return (
    <div className="h-full w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid 
            stroke="rgba(255,255,255,0.1)" 
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ 
              fill: 'rgba(255,255,255,0.6)', 
              fontSize: 10, 
              fontWeight: 600 
            }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          <Radar
            name="Performance"
            dataKey="value"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#radarGradient)"
            fillOpacity={0.6}
            dot={{
              r: 3,
              fill: '#22d3ee',
              strokeWidth: 0
            }}
          />
          {/* Gradiente para preenchimento */}
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.3} />
            </linearGradient>
          </defs>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}