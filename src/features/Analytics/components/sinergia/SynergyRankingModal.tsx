import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Shield, Users, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

interface SynergyRankingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sinergiaData: any;
  jogadores: any[];
  onSelectDuo: (idA: string, idB: string) => void;
}

export function SynergyRankingModal({ open, onOpenChange, sinergiaData, jogadores, onSelectDuo }: SynergyRankingModalProps) {
  const [activeTab, setActiveTab] = useState('LETAL');

  const tabs = [
    { id: 'LETAL', label: 'Letal (Gols)', icon: Target, color: 'text-cyan-400', dataKey: 'topDuplasGols' },
    { id: 'ATLETICA', label: 'Inseparáveis (Jogos)', icon: Users, color: 'text-orange-400', dataKey: 'maisJogaramJuntos' },
    { id: 'VENCEDORA', label: 'Vencedora (Vitórias)', icon: Trophy, color: 'text-purple-400', dataKey: 'maisVenceramJuntos' },
    { id: 'DEFENSIVA', label: 'Muralhas (Clean Sheets)', icon: Shield, color: 'text-emerald-400', dataKey: 'muralhas' },
  ];

  const activeData = sinergiaData?.[tabs.find(t => t.id === activeTab)?.dataKey || ''] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-2xl bg-surface border-border/50 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 sm:p-6 border-b border-border/30 bg-[#0f172a] w-full flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-black text-white uppercase tracking-wider">
            <Trophy className="text-amber-400" size={24} />
            RANKING COMPLETO DE SINERGIAS
          </DialogTitle>
          <p className="text-textMuted text-xs mt-1 text-left">
            Explore as melhores duplas da temporada em cada categoria.
          </p>
        </DialogHeader>

        <div className="p-4 sm:p-6 bg-[#0a1526] min-h-[400px] w-full flex-1 min-w-0 overflow-hidden flex flex-col">
          {/* Tabs / Selector */}
          <div className="flex overflow-x-auto gap-2 pb-2 mb-4 sm:mb-6 hide-scrollbar w-full flex-shrink-0">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-colors border flex-shrink-0",
                    isActive 
                      ? `bg-surfaceElevated border-border ${tab.color} ring-1 ring-border shadow-lg` 
                      : "bg-surface/30 text-textMuted border-border/30 hover:bg-surface hover:text-white"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", isActive ? tab.color : 'text-textMuted')} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div className="space-y-3 w-full flex-1 overflow-y-auto hide-scrollbar pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 w-full"
              >
                {activeData.map((item: any, i: number) => {
                  const j1Nome = item.artilheiro_nome || item.jogador1_nome || item.zagueiro1_nome || 'Jogador 1';
                  const j2Nome = item.garcom_nome || item.jogador2_nome || item.zagueiro2_nome || 'Jogador 2';
                  const j1Foto = item.artilheiro_foto || item.jogador1_foto || item.zagueiro1_foto;
                  const j2Foto = item.garcom_foto || item.jogador2_foto || item.zagueiro2_foto;
                  
                  let score: any = '-';
                  let scoreLabel = 'Score';
                  
                  if (activeTab === 'LETAL') { score = item.gols_juntos; scoreLabel = 'GOLS JUNTOS'; }
                  if (activeTab === 'ATLETICA') { score = item.jogos_juntos; scoreLabel = 'JOGOS JUNTOS'; }
                  const j1 = jogadores.find((j: any) => j.nome === j1Nome);
                  const j2 = jogadores.find((j: any) => j.nome === j2Nome);

                  const handleClick = () => {
                    if (j1 && j2) {
                      onSelectDuo(String(j1.id), String(j2.id));
                      onOpenChange(false);
                    }
                  };

                  return (
                    <div 
                      key={i} 
                      onClick={handleClick}
                      className={cn(
                        "flex items-center gap-2 sm:gap-4 bg-surface/30 border border-border/50 rounded-xl p-3 sm:p-4 hover:bg-surface/50 transition-colors w-full overflow-hidden flex-shrink-0",
                        j1 && j2 ? "cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]" : ""
                      )}
                    >
                      <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 rounded-md bg-surfaceElevated flex items-center justify-center text-xs sm:text-sm font-black text-textMuted border border-border/50">
                        {i + 1}
                      </div>
                      
                      <div className="flex-1 flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="flex -space-x-3 flex-shrink-0">
                           {j1Foto ? <img src={j1Foto} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#0a1526] object-cover" /> : <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#0a1526] bg-surfaceElevated flex items-center justify-center text-xs font-bold text-white">{j1Nome?.substring(0,2)}</div>}
                           {j2Foto ? <img src={j2Foto} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#0a1526] object-cover" /> : <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#0a1526] bg-surfaceElevated flex items-center justify-center text-xs font-bold text-white">{j2Nome?.substring(0,2)}</div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">{j1Nome?.split(' ')[0]} <span className="text-textMuted font-normal mx-1">&</span> {j2Nome?.split(' ')[0]}</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 min-w-[50px] sm:min-w-[60px]">
                        <span className="text-xl sm:text-2xl font-black text-white block truncate">{score ?? '-'}</span>
                        <span className="text-[8px] sm:text-[9px] uppercase text-textMuted tracking-widest font-bold block truncate">{scoreLabel}</span>
                      </div>
                    </div>
                  );
                })}

                {activeData.length === 0 && (
                  <div className="text-center py-10 text-textMuted text-sm bg-surface/20 rounded-xl border border-dashed border-border/50">
                    Nenhum dado encontrado para esta categoria.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
