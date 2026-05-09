// Arquivo: src/features/jogadores/components/JogadorCardGrid.tsx
// Versão alternativa para modo GRID - mais visual, cards verticais
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, User, Shield, Mail, CheckCircle, XCircle, Crown, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Jogador } from '@/@types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useGerarConvite } from '../api/useGerarConvite';
import { ConviteModal } from './ConviteModal';
import { SelecionarTipoUsuarioDialog } from './SelecionarTipoUsuarioDialog';

type JogadorCardGridProps = {
  jogador: Jogador;
  onDelete?: (id: number) => void;
};

export const JogadorCardGrid = ({ jogador, onDelete }: JogadorCardGridProps) => {
  const [selecionarTipoOpen, setSelecionarTipoOpen] = useState(false);
  const [conviteModalOpen, setConviteModalOpen] = useState(false);
  const gerarConviteMutation = useGerarConvite();

  const getInitials = (nome: string) => {
    const parts = nome.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return nome.substring(0, 2).toUpperCase();
  };

  const handleGerarConviteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelecionarTipoOpen(true);
  };

  const handleTipoSelecionado = async (tipo: 'user' | 'admin') => {
    setSelecionarTipoOpen(false);
    const result = await gerarConviteMutation.mutateAsync({
      jogador_id: jogador.id,
      tipo_usuario: tipo,
    });
    if (result) {
      setConviteModalOpen(true);
    }
  };

  const temContaAtiva = jogador.usuario?.tem_conta_ativa || false;
  const isAdmin = jogador.usuario?.role === 'admin';
  const isGoleiro = jogador.posicao === 'goleiro';

  const positionColors = isGoleiro 
    ? { 
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'shadow-emerald-500/25',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10'
      }
    : { 
        gradient: 'from-cyan-500 to-blue-600',
        glow: 'shadow-cyan-500/25',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        bg: 'bg-cyan-500/10'
      };

  return (
    <>
      <Link to={`/perfil/${jogador.id}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative cursor-pointer"
        >
          {/* Card */}
          <div className={cn(
            "relative overflow-hidden rounded-2xl border bg-[#0a1628]/90 backdrop-blur-sm transition-all duration-300",
            positionColors.border,
            `hover:shadow-xl hover:${positionColors.glow}`
          )}>
            {/* Glow no topo */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-24 bg-gradient-to-b opacity-20",
              positionColors.gradient
            )} />

            {/* Conteúdo */}
            <div className="relative p-4">
              {/* Foto/Avatar */}
              <div className="relative mx-auto mb-4 w-20 h-20">
                <div className={cn(
                  "w-full h-full rounded-2xl overflow-hidden ring-2 ring-offset-2 ring-offset-[#0a1628] shadow-lg",
                  isGoleiro ? "ring-emerald-500/50" : "ring-cyan-500/50",
                  `shadow-${isGoleiro ? 'emerald' : 'cyan'}-500/20`
                )}>
                  {jogador.foto_url ? (
                    <img
                      src={jogador.foto_url}
                      alt={jogador.nome}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className={cn(
                      "flex h-full w-full items-center justify-center bg-gradient-to-br text-2xl font-bold text-white",
                      positionColors.gradient
                    )}>
                      {getInitials(jogador.nome)}
                    </div>
                  )}
                </div>

                {/* Badge de Posição */}
                <div className={cn(
                  "absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs font-bold shadow-lg",
                  `bg-gradient-to-r ${positionColors.gradient}`
                )}>
                  {isGoleiro ? <Shield size={10} /> : <User size={10} />}
                  {isGoleiro ? 'GOL' : 'LIN'}
                </div>
              </div>

              {/* Nome */}
              <h3 className="text-center font-bold text-white truncate mb-1">
                {jogador.nome}
              </h3>

              {/* Nível com estrelas */}
              <div className="flex items-center justify-center gap-1 mb-3">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                  positionColors.bg,
                  positionColors.text
                )}>
                  <Star size={10} className="fill-current" />
                  <span>Nível {jogador.nivel}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {jogador.joga_recuado && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                    🛡️ DEF
                  </span>
                )}
                
                {temContaAtiva ? (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle size={8} />
                    {isAdmin ? (
                      <span className="flex items-center gap-0.5">
                        <Crown size={8} className="text-amber-400" />
                        Admin
                      </span>
                    ) : (
                      'Ativo'
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                    <XCircle size={8} />
                    Sem acesso
                  </span>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!temContaAtiva && (
                  <Button
                    onClick={handleGerarConviteClick}
                    disabled={gerarConviteMutation.isPending}
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs bg-gradient-to-r",
                      positionColors.gradient
                    )}
                  >
                    <Mail size={10} className="mr-1" />
                    Convite
                  </Button>
                )}

                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/jogadores/${jogador.id}/edit`}>
                    <Edit size={12} />
                  </Link>
                </Button>

                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(jogador.id);
                    }}
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>

            {/* Linha decorativa na base */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-50",
              positionColors.gradient
            )} />
          </div>
        </motion.div>
      </Link>

      <SelecionarTipoUsuarioDialog
        open={selecionarTipoOpen}
        onOpenChange={setSelecionarTipoOpen}
        onSelect={handleTipoSelecionado}
        jogadorNome={jogador.nome}
        isLoading={gerarConviteMutation.isPending}
      />

      <ConviteModal
        open={conviteModalOpen}
        onOpenChange={setConviteModalOpen}
        convite={gerarConviteMutation.data?.convite || null}
      />
    </>
  );
};