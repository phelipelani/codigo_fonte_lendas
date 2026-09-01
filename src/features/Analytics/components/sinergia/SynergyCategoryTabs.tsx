import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Shield, Users, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SynergyCategoryTabsProps {
  sinergiaData: any;
}

export function SynergyCategoryTabs({ sinergiaData }: SynergyCategoryTabsProps) {
  const [activeTab, setActiveTab] = useState('LETAL');

  const tabs = [
    { id: 'LETAL', label: 'Letal', icon: Target, color: 'text-amber-400', dataKey: 'topDuplasGols' },
    { id: 'ATLETICA', label: 'Atlética', icon: Users, color: 'text-orange-400', dataKey: 'maisJogaramJuntos' },
    { id: 'VENCEDORA', label: 'Vencedora', icon: Trophy, color: 'text-purple-400', dataKey: 'maisVenceramJuntos' },
    { id: 'DEFENSIVA', label: 'Defensiva', icon: Shield, color: 'text-teal-400', dataKey: 'muralhas' },
  ];

  const activeData = sinergiaData?.[tabs.find(t => t.id === activeTab)?.dataKey || ''] || [];

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-black uppercase tracking-wider text-white">
          TOP 3 POR CATEGORIA
        </h2>
      </div>

      {/* Tabs / Selector */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap transition-colors border",
              activeTab === tab.id 
                ? "bg-surfaceElevated text-white border-border" 
                : "bg-surface/30 text-textMuted border-border/30 hover:bg-surface hover:text-white"
            )}
          >
            {activeTab === tab.id && <tab.icon className={cn("w-3 h-3", tab.color)} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {activeData.slice(0, 3).map((item: any, i: number) => {
              const j1Nome = item.artilheiro_nome || item.jogador1_nome || item.zagueiro1_nome;
              const j2Nome = item.garcom_nome || item.jogador2_nome || item.zagueiro2_nome;
              const j1Foto = item.artilheiro_foto || item.jogador1_foto || item.zagueiro1_foto;
              const j2Foto = item.garcom_foto || item.jogador2_foto || item.zagueiro2_foto;
              
              let score = '-';
              if (activeTab === 'LETAL') score = item.gols_juntos;
              if (activeTab === 'ATLETICA') score = item.jogos_juntos;
              if (activeTab === 'VENCEDORA') score = item.vitorias_juntos;
              if (activeTab === 'DEFENSIVA') score = item.clean_sheets_juntos;

              return (
                <div key={i} className="flex items-center gap-3 bg-surface/30 border border-border/50 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-md bg-surfaceElevated flex items-center justify-center text-xs font-bold text-textMuted border border-border/50">
                    {i + 1}
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex -space-x-2">
                       {j1Foto ? <img src={j1Foto} className="w-8 h-8 rounded-full border-2 border-surface object-cover" /> : <div className="w-8 h-8 rounded-full border-2 border-surface bg-surfaceElevated flex items-center justify-center text-[8px] font-bold">{j1Nome?.substring(0,2)}</div>}
                       {j2Foto ? <img src={j2Foto} className="w-8 h-8 rounded-full border-2 border-surface object-cover" /> : <div className="w-8 h-8 rounded-full border-2 border-surface bg-surfaceElevated flex items-center justify-center text-[8px] font-bold">{j2Nome?.substring(0,2)}</div>}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white leading-tight">{j1Nome?.split(' ')[0]}</span>
                      <span className="text-xs font-bold text-white leading-tight">{j2Nome?.split(' ')[0]}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-white block">{score}</span>
                    <span className="text-[8px] uppercase text-textMuted tracking-wider block">Score</span>
                  </div>
                </div>
              );
            })}

            {activeData.length === 0 && (
              <div className="text-center py-6 text-textMuted text-sm">
                Sem dados suficientes.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
