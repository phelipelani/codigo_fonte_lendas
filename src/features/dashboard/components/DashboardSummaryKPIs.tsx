import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, TrendingUp, Goal } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  totais?: {
    total_partidas: number;
    total_gols: number;
    total_jogadores: number;
    media_gols: number;
  };
}

export const DashboardSummaryKPIs: React.FC<Props> = ({ totais }) => {
  const stats = [
    {
      title: 'Partidas',
      value: totais?.total_partidas ?? 0,
      icon: Activity,
      color: 'text-cyan-400',
      bgGlow: 'bg-cyan-500/10 border-cyan-500/20',
      link: '/partidas',
    },
    {
      title: 'Gols',
      value: totais?.total_gols ?? 0,
      icon: Goal,
      color: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10 border-emerald-500/20',
      link: '/analytics',
    },
    {
      title: 'Jogadores',
      value: totais?.total_jogadores ?? 0,
      icon: Users,
      color: 'text-purple-400',
      bgGlow: 'bg-purple-500/10 border-purple-500/20',
      link: '/jogadores',
    },
    {
      title: 'Gols / Jogo',
      value: totais?.media_gols ?? 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      bgGlow: 'bg-amber-500/10 border-amber-500/20',
      link: '/analytics',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Link to={stat.link} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1623]/90 backdrop-blur-md p-4 sm:p-5 shadow-lg group hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl border ${stat.bgGlow} transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={stat.color} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                  {stat.value}
                </span>
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};
