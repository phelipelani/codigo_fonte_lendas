// Arquivo: src/features/ligas/components/LigaCard.tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Trophy, 
  Edit, 
  Trash2, 
  ArrowRight, 
  CheckCircle, 
  Clock,
  XCircle,
  StopCircle,
  Zap,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Liga } from '@/@types';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { useRodadasDaLiga } from '../api/useRodadasDaLiga';
import { cn } from '@/lib/utils';

type LigaCardProps = {
  liga: Liga;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onFinalizar?: (id: number) => void;
  index: number;
};

export const LigaCard = ({ liga, onEdit, onDelete, onFinalizar, index }: LigaCardProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [finalizarDialogOpen, setFinalizarDialogOpen] = useState(false);
  const { data: rodadas } = useRodadasDaLiga(liga.id);

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    });
  };

  // Status da liga
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(liga.data_inicio);
  dataInicio.setHours(0, 0, 0, 0);
  const dataFim = new Date(liga.data_fim);
  dataFim.setHours(0, 0, 0, 0);

  const foiFinalizadaManualmente = !!liga.finalizada_em;
  const isAtiva = !foiFinalizadaManualmente && hoje >= dataInicio && hoje <= dataFim;
  const isEncerrada = foiFinalizadaManualmente || hoje > dataFim;
  const isPendente = !foiFinalizadaManualmente && hoje < dataInicio;

  const totalRodadas = rodadas?.length || 0;
  const rodadasFinalizadas = rodadas?.filter((r) => r.status === 'finalizada').length || 0;
  const progresso = totalRodadas > 0 ? (rodadasFinalizadas / totalRodadas) * 100 : 0;

  // Cores baseadas no status
  const statusConfig = isAtiva 
    ? { color: 'emerald', gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', label: 'Ativa', icon: <Zap size={12} className="fill-current" /> }
    : isEncerrada
    ? { color: 'red', gradient: 'from-red-500 to-rose-600', text: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30', label: foiFinalizadaManualmente ? 'Finalizada' : 'Encerrada', icon: <XCircle size={12} /> }
    : { color: 'amber', gradient: 'from-amber-500 to-orange-600', text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30', label: 'Pendente', icon: <Clock size={12} /> };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -4 }}
        className="group"
      >
        <div className={cn(
          "relative overflow-hidden rounded-xl border bg-[#0a1628]/50 backdrop-blur-md transition-all duration-300",
          "hover:shadow-xl hover:shadow-cyan-500/10",
          statusConfig.border
        )}>
          {/* Linha brilhante no topo baseada no status */}
          <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", statusConfig.gradient)} />

          {/* Header compacto */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              {/* Ícone + Nome */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={cn(
                  "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                  statusConfig.gradient
                )}>
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/ligas/${liga.id}/rodadas`} className="group/link">
                    <h3 className="font-bold text-white text-lg truncate group-hover/link:text-cyan-300 transition-colors">
                      {liga.nome}
                    </h3>
                  </Link>
                  {/* Badge de status */}
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1",
                    `${statusConfig.bg}/20 ${statusConfig.text}`
                  )}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </div>
                </div>
              </div>

              {/* Progresso circular */}
              <div className="relative flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                  <circle 
                    cx="28" cy="28" r="24" fill="none" stroke="url(#progressGradient)" strokeWidth="4"
                    strokeDasharray={`${progresso * 1.51} 151`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{Math.round(progresso)}%</span>
                </div>
              </div>
            </div>

            {/* Stats em linha */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Período */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Calendar size={14} className="text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-cyan-100/40 uppercase">Período</p>
                  <p className="text-xs font-medium text-white truncate">
                    {formatarData(liga.data_inicio)} - {formatarData(liga.data_fim)}
                  </p>
                </div>
              </div>

              {/* Rodadas */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                <Target size={14} className="text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-cyan-100/40 uppercase">Rodadas</p>
                  <p className="text-xs font-medium text-white">
                    <span className="text-emerald-400">{rodadasFinalizadas}</span>
                    <span className="text-cyan-100/40"> / {totalRodadas}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de progresso */}
            {totalRodadas > 0 && (
              <div className="mb-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progresso}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Aviso se finalizada manualmente */}
            {foiFinalizadaManualmente && (
              <div className="mb-4 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-400 flex items-center gap-1">
                  <StopCircle size={10} />
                  Finalizada em {formatarData(liga.finalizada_em!)}
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2">
              {/* Ver Rodadas - Principal */}
              <Button asChild size="sm" className="flex-1 h-9 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-xs">
                <Link to={`/ligas/${liga.id}/rodadas`}>
                  Ver Rodadas
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>

              {/* Finalizar (se ativa) */}
              {isAtiva && onFinalizar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFinalizarDialogOpen(true)}
                  className="h-9 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                  title="Finalizar Liga"
                >
                  <StopCircle size={16} />
                </Button>
              )}

              {/* Editar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(liga.id)}
                disabled={isEncerrada}
                className="h-9 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30"
                title="Editar"
              >
                <Edit size={16} />
              </Button>

              {/* Deletar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="h-9 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Deletar"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dialog Deletar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0a1628] border-cyan-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Deletar Liga?</AlertDialogTitle>
            <AlertDialogDescription className="text-cyan-100/50">
              Isso deletará permanentemente <strong className="text-white">"{liga.nome}"</strong> e todas as rodadas e partidas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onDelete(liga.id); setDeleteDialogOpen(false); }} className="bg-red-600 hover:bg-red-700 text-white">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Finalizar */}
      <AlertDialog open={finalizarDialogOpen} onOpenChange={setFinalizarDialogOpen}>
        <AlertDialogContent className="bg-[#0a1628] border-cyan-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Finalizar Liga?</AlertDialogTitle>
            <AlertDialogDescription className="text-cyan-100/50">
              Ao finalizar <strong className="text-white">"{liga.nome}"</strong>, você não poderá mais criar/editar rodadas ou editar a liga. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (onFinalizar) onFinalizar(liga.id); setFinalizarDialogOpen(false); }} className="bg-amber-600 hover:bg-amber-700 text-white">
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};