// Arquivo: src/features/stats/routes/StatsPage.tsx
import { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart, 
  Pie, 
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { 
  BarChart3, 
  Filter, 
  Trophy, 
  Target, 
  Footprints, 
  Shield, 
  AlertCircle 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { cn } from '@/lib/utils';

// --- DADOS MOCKADOS (Para Visualização) ---

const MOCK_EVOLUTION = [
  { name: 'Jan', gols: 12, jogos: 4 },
  { name: 'Fev', gols: 18, jogos: 5 },
  { name: 'Mar', gols: 15, jogos: 4 },
  { name: 'Abr', gols: 24, jogos: 6 },
  { name: 'Mai', gols: 32, jogos: 8 },
  { name: 'Jun', gols: 28, jogos: 6 },
];

const MOCK_PIE_DATA = [
  { name: 'Vitórias', value: 45, color: '#10b981' }, // Emerald-500
  { name: 'Empates', value: 15, color: '#f59e0b' },  // Amber-500
  { name: 'Derrotas', value: 20, color: '#ef4444' }, // Red-500
];

const MOCK_ARTILHARIA = [
  { id: 1, nome: 'Allejo', time: 'Meninos de Vó', gols: 24, avatar: null },
  { id: 2, nome: 'Gomez', time: 'Real Matismo', gols: 18, avatar: null },
  { id: 3, nome: 'Beranco', time: 'Sem Clube', gols: 15, avatar: null },
  { id: 4, nome: 'Castolo', time: 'Meninos de Vó', gols: 12, avatar: null },
  { id: 5, nome: 'Rocan', time: 'Inter de Melão', gols: 10, avatar: null },
];

// --- COMPONENTES ---

// Custom Tooltip para o Gráfico de Área
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surfaceElevated border border-border p-3 rounded-lg shadow-xl">
        <p className="font-bold text-textPrimary mb-1">{label}</p>
        <p className="text-sm text-accentPrimary">⚽ {payload[0].value} Gols</p>
        <p className="text-xs text-textMuted">{payload[0].payload.jogos} Jogos realizados</p>
      </div>
    );
  }
  return null;
};

export function StatsPage() {
  const [activeTab, setActiveTab] = useState<'geral' | 'artilharia' | 'goleiros' | 'disciplina'>('geral');
  const [periodo, setPeriodo] = useState('2025');

  return (
    <div className="container-main section-padding pt-0 pb-20">
      
      {/* HEADER & FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="heading-gradient text-3xl md:text-4xl font-bold flex items-center gap-3">
            <BarChart3 className="text-accentSecondary" /> Central de Dados
          </h1>
          <p className="text-textMuted mt-1">Análise detalhada de performance.</p>
        </div>

        <div className="flex gap-2 bg-surface p-1 rounded-lg border border-border">
            <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[140px] border-none bg-transparent h-9">
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="2025">Temporada 2025</SelectItem>
                    <SelectItem value="2024">Temporada 2024</SelectItem>
                    <SelectItem value="all">Todo o Histórico</SelectItem>
                </SelectContent>
            </Select>
            <div className="w-px bg-border my-1" />
            <Button variant="ghost" size="sm" className="h-9"><Filter size={16} /></Button>
        </div>
      </div>

      {/* ÁREA DE GRÁFICOS (DASHBOARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* 1. Gráfico de Evolução (Ocupa 2 colunas no desktop) */}
        <Card className="lg:col-span-2 p-6 flex flex-col h-[350px]">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Target className="text-accentPrimary" size={20} /> Evolução de Gols
            </h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_EVOLUTION}>
                        <defs>
                            <linearGradient id="colorGols" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#666', fontSize: 12}} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#666', fontSize: 12}} 
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="gols" 
                            stroke="#0ea5e9" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorGols)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>

        {/* 2. Gráfico de Distribuição (Donut) */}
        <Card className="p-6 flex flex-col h-[350px]">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} /> Resultados Globais
            </h3>
            <div className="flex-1 w-full min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={MOCK_PIE_DATA}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {MOCK_PIE_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px'}}
                            itemStyle={{color: '#fff'}}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
                {/* Texto central no Donut */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
                    <span className="text-3xl font-black text-textPrimary">80</span>
                    <span className="block text-[10px] text-textMuted uppercase tracking-wider">Jogos</span>
                </div>
            </div>
        </Card>
      </div>

      {/* TABELAS DETALHADAS */}
      <div>
        {/* Tabs Header */}
        <div className="flex overflow-x-auto pb-2 mb-4 gap-2 scrollbar-hide">
            {[
                { id: 'geral', label: 'Geral', icon: BarChart3 },
                { id: 'artilharia', label: 'Artilharia', icon: Target },
                { id: 'assistencias', label: 'Assistências', icon: Footprints },
                { id: 'goleiros', label: 'Goleiros', icon: Shield },
                { id: 'disciplina', label: 'Fair Play', icon: AlertCircle },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                        activeTab === tab.id 
                            ? "bg-accentPrimary text-background shadow-glow-cyan" 
                            : "bg-surface text-textMuted hover:bg-surfaceHover hover:text-textPrimary"
                    )}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>

        {/* Tab Content */}
        <Card className="overflow-hidden border-border/50">
            {activeTab === 'artilharia' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-surfaceElevated text-textMuted uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4 text-center w-16">Pos</th>
                                <th className="px-6 py-4">Jogador</th>
                                <th className="px-6 py-4 text-center">Gols</th>
                                <th className="px-6 py-4 text-center hidden sm:table-cell">Média</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-borderLight">
                            {MOCK_ARTILHARIA.map((player, index) => (
                                <tr key={player.id} className="hover:bg-surfaceHover transition-colors group">
                                    <td className="px-6 py-4 text-center font-bold text-textMuted group-hover:text-accentPrimary">
                                        {index + 1}º
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold overflow-hidden">
                                                {player.nome.substring(0,2)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-textPrimary">{player.nome}</p>
                                                <p className="text-xs text-textMuted">{player.time}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-black text-lg text-accentPrimary">
                                        {player.gols}
                                    </td>
                                    <td className="px-6 py-4 text-center text-textMuted hidden sm:table-cell">
                                        1.2
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'geral' && (
                <div className="p-12 flex flex-col items-center justify-center text-center text-textMuted">
                    <BarChart3 className="h-16 w-16 mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold text-textPrimary mb-1">Visão Geral</h3>
                    <p className="max-w-md">Selecione uma categoria acima para ver rankings detalhados de artilheiros, assistentes e mais.</p>
                </div>
            )}
            
            {/* Placeholders para outras tabs */}
            {(activeTab === 'assistencias' || activeTab === 'goleiros' || activeTab === 'disciplina') && (
                 <div className="p-12 flex flex-col items-center justify-center text-center text-textMuted">
                    <AlertCircle className="h-16 w-16 mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold text-textPrimary mb-1">Em Breve</h3>
                    <p>Estamos coletando dados para gerar este relatório.</p>
                </div>
            )}
        </Card>
      </div>
    </div>
  );
}