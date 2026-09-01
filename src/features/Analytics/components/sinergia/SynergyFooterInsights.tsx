import { Lightbulb, ArrowUpCircle, AlertCircle, Target, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SynergyFooterInsightsProps {
  parceria: any;
  jogadorA_nome: string;
  jogadorB_nome: string;
  aproveitamento: number;
}

export function SynergyFooterInsights({ parceria, jogadorA_nome, jogadorB_nome, aproveitamento }: SynergyFooterInsightsProps) {
  if (!parceria) return null;

  const nomeA = jogadorA_nome.split(' ')[0];
  const nomeB = jogadorB_nome.split(' ')[0];
  const golsComb = (Number(parceria.gols_A_assistidos_por_B) || 0) + (Number(parceria.gols_B_assistidos_por_A) || 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Left: Insight */}
        <div className="bg-[#0f172a]/80 border border-border/50 rounded-2xl p-6">
          <div className="flex gap-4 mb-6">
            <div className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="text-cyan-400" size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">INSIGHT DA SINERGIA</h3>
              <p className="text-xs text-textMuted leading-relaxed">
                {nomeA} e {nomeB} possuem {golsComb > 5 ? 'excelente' : 'boa'} movimentação e participação conjunta, 
                {golsComb > 5 ? ' transformando essa conexão em muitos gols.' : ' mas ainda não transformam essa conexão em gols suficientes.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <ArrowUpCircle className="text-emerald-400 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">PONTO POSITIVO</div>
                <div className="text-[10px] text-textMuted">Alta participação, muitas vitórias e {aproveitamento > 50 ? 'ótimo' : 'regular'} aproveitamento.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">PONTO DE ATENÇÃO</div>
                <div className="text-[10px] text-textMuted">Baixa conversão em gols. A dupla precisa de mais finalizações e presença ofensiva na área.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sugestões */}
        <div className="bg-[#0f172a]/80 border border-border/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">SUGESTÕES PARA COMPLEMENTAR</h3>
          <p className="text-xs text-textMuted mb-6">Para aproveitar melhor essa dupla, complemente com:</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1 */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-center mb-2"><Target className="text-red-400" size={24} /></div>
                <div className="text-[10px] font-bold text-red-400 text-center uppercase leading-tight mb-2">ATACANTE<br/>FINALIZADOR</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-[9px] text-red-400 uppercase font-bold mb-1">
                  <ArrowUpCircle size={10} /> Prioridade alta
                </div>
                <p className="text-[8px] text-textMuted text-center leading-tight">Aumenta a conversão das jogadas e potencializa os gols da dupla.</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-center mb-2"><Zap className="text-amber-400" size={24} /></div>
                <div className="text-[10px] font-bold text-amber-400 text-center uppercase leading-tight mb-2">MEIA<br/>CRIATIVO</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-[9px] text-amber-400 uppercase font-bold mb-1">
                  <ArrowUpCircle size={10} /> Prioridade média
                </div>
                <p className="text-[8px] text-textMuted text-center leading-tight">Mais criação para transformar a movimentação em chances.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-center mb-2"><Shield className="text-teal-400" size={24} /></div>
                <div className="text-[10px] font-bold text-teal-400 text-center uppercase leading-tight mb-2">ZAGUEIRO<br/>LÍDER</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-[9px] text-teal-400 uppercase font-bold mb-1">
                  <ArrowUpCircle size={10} /> Prioridade baixa
                </div>
                <p className="text-[8px] text-textMuted text-center leading-tight">Garante equilíbrio e segurança para que a dupla se expresse.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
