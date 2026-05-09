// Arquivo: src/features/rodadas/components/RodadaCard.tsx
import * as React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Edit, Trash2, CheckCircle, Clock, ChevronRight, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Rodada } from '@/@types';
import { cn } from '@/lib/utils';

type RodadaCardProps = {
  rodada: Rodada;
  ligaId: number;
  onEdit: (rodada: Rodada) => void;
  onDelete: (rodadaId: number) => void;
  index: number;
};

export const RodadaCard: React.FC<RodadaCardProps> = ({
  rodada,
  ligaId,
  onEdit,
  onDelete,
  index,
}) => {
  const isFinalizada = rodada.status === 'finalizada';

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatarDataCurta = (dataString: string) => {
    const data = new Date(dataString);
    const dia = data.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'UTC' });
    const mes = data.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
    return { dia, mes };
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Deletar rodada de ${formatarData(rodada.data)}?\n\nEsta ação não pode ser desfeita.`)) {
      onDelete(rodada.id);
    }
  };

  const { dia, mes } = formatarDataCurta(rodada.data);

  const statusConfig = isFinalizada
    ? { gradient: 'from-emerald-500 to-teal-600', text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30', label: 'Finalizada', icon: CheckCircle }
    : { gradient: 'from-cyan-500 to-blue-600', text: 'text-cyan-400', bg: 'bg-cyan-500', border: 'border-cyan-500/30', label: 'Aberta', icon: Clock };

  return (
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
        {/* Linha colorida no topo */}
        <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", statusConfig.gradient)} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-4">
            {/* Data estilizada */}
            <div className={cn(
              "flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br text-white shadow-lg",
              statusConfig.gradient
            )}>
              <span className="text-2xl font-black leading-none">{dia}</span>
              <span className="text-[10px] font-bold uppercase opacity-80">{mes}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                to={`/ligas/${ligaId}/rodadas/${rodada.id}/gerenciar`}
                className="group/link"
              >
                <h3 className="font-bold text-white text-lg group-hover/link:text-cyan-300 transition-colors">
                  Rodada
                </h3>
              </Link>
              <p className="text-xs text-cyan-100/50">{formatarData(rodada.data)}</p>
              
              {/* Badge de status */}
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5",
                `${statusConfig.bg}/20 ${statusConfig.text}`
              )}>
                <statusConfig.icon size={10} />
                {statusConfig.label}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {/* Gerenciar - Principal */}
            <Button 
              asChild 
              size="sm" 
              className={cn(
                "flex-1 h-9 font-semibold text-xs text-white",
                isFinalizada 
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
              )}
            >
              <Link to={`/ligas/${ligaId}/rodadas/${rodada.id}/gerenciar`}>
                {isFinalizada ? (
                  <>
                    <Eye size={14} className="mr-1.5" />
                    Ver Resumo
                  </>
                ) : (
                  <>
                    <Play size={14} className="mr-1.5" />
                    Gerenciar
                  </>
                )}
                <ChevronRight size={14} className="ml-1" />
              </Link>
            </Button>

            {/* Editar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(rodada)}
              disabled={isFinalizada}
              className="h-9 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30"
              title={isFinalizada ? 'Não pode editar rodada finalizada' : 'Editar data'}
            >
              <Edit size={16} />
            </Button>

            {/* Deletar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="h-9 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              title="Deletar rodada"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};