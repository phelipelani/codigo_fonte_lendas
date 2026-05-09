// Arquivo: src/components/shared/AnimatedTabs.tsx
// Tabs com animação de slide horizontal + indicator animado
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode; // Conteúdo da tab ativa
  variant?: 'pills' | 'underline';
  className?: string;
}

// Variantes de animação para o conteúdo das tabs
const tabContentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const AnimatedTabs = React.memo(function AnimatedTabs({
  tabs,
  activeTab,
  onTabChange,
  children,
  variant = 'pills',
  className,
}: AnimatedTabsProps) {
  const [direction, setDirection] = useState(0);
  const prevTabRef = useRef(activeTab);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calcular direção da animação
  useEffect(() => {
    const prevIdx = tabs.findIndex((t) => t.id === prevTabRef.current);
    const nextIdx = tabs.findIndex((t) => t.id === activeTab);
    setDirection(nextIdx > prevIdx ? 1 : -1);
    prevTabRef.current = activeTab;
  }, [activeTab, tabs]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (tabId !== activeTab) onTabChange(tabId);
    },
    [activeTab, onTabChange],
  );

  // Scroll a tab ativa para vista no mobile
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement;
    if (activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      const scrollLeft =
        activeEl.offsetLeft - containerRect.width / 2 + elRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTab]);

  const isPills = variant === 'pills';

  return (
    <div className={className}>
      {/* Tab bar */}
      <div
        ref={scrollRef}
        className={cn(
          'flex overflow-x-auto scrollbar-hide gap-1.5 pb-1 mb-4',
          isPills ? '' : 'border-b border-white/[0.06]',
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              data-active={isActive}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-200',
                isPills && 'rounded-full border',
                isPills && isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white border-cyan-500/50 shadow-lg shadow-cyan-500/20 scale-[1.02]'
                  : isPills
                    ? 'text-white/40 border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:text-white/60 active:scale-95'
                    : '',
                !isPills && isActive && 'text-cyan-400',
                !isPills && !isActive && 'text-white/40 hover:text-white/60',
              )}
            >
              {tab.icon && (
                <span className={cn('flex-shrink-0', isActive ? '' : 'opacity-60')}>
                  {tab.icon}
                </span>
              )}
              {tab.label}

              {/* Underline indicator */}
              {!isPills && isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-cyan-400 to-teal-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content com slide animation */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
});

export default AnimatedTabs;
