// Arquivo: src/features/jogadores/components/JogadorCard.tsx
import { useState, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2, User, Shield, Mail, CheckCircle, XCircle, Crown, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Jogador } from '@/@types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useGerarConvite } from '../api/useGerarConvite';
import { ConviteModal } from './ConviteModal';
import { SelecionarTipoUsuarioDialog } from './SelecionarTipoUsuarioDialog';

type JogadorCardProps = {
  jogador: Jogador;
  onDelete?: (id: number) => void;
  isAdmin?: boolean;
};

export const JogadorCard = memo(({ jogador, onDelete, isAdmin = false }: JogadorCardProps) => {
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

  const handleGerarConviteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelecionarTipoOpen(true);
  }, []);

  const handleTipoSelecionado = useCallback(async (tipo: 'user' | 'admin') => {
    setSelecionarTipoOpen(false);
    const result = await gerarConviteMutation.mutateAsync({
      jogador_id: jogador.id,
      tipo_usuario: tipo,
    });
    if (result) setConviteModalOpen(true);
  }, [gerarConviteMutation, jogador.id]);

  const temContaAtiva = jogador.usuario?.tem_conta_ativa || false;
  const isJogadorAdmin = jogador.usuario?.role === 'admin';
  const isGoleiro = jogador.posicao === 'goleiro';

  const colors = isGoleiro 
    ? { gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
    : { gradient: 'from-cyan-500 to-blue-600', ring: 'ring-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };

  return (
    <>
      <motion.div whileHover={{ y: -2 }} className="group">
        <div className={cn(
          "relative overflow-hidden rounded-xl border bg-[#0a1628]/50 backdrop-blur-md p-3 transition-all duration-300",
          "hover:shadow-lg hover:shadow-cyan-500/10 hover:bg-[#0a1628]/70",
          colors.border
        )}>
          {/* Linha brilhante no topo */}
          <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40", colors.text)} />

          {/* Layout */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className={cn("h-11 w-11 rounded-lg overflow-hidden ring-2 ring-offset-1 ring-offset-[#0a1628]", colors.ring)}>
                {jogador.foto_url ? (
                  <img src={jogador.foto_url} alt={jogador.nome} className="h-full w-full object-cover" />
                ) : (
                  <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br text-sm font-bold text-white", colors.gradient)}>
                    {getInitials(jogador.nome)}
                  </div>
                )}
              </div>
              <div className={cn("absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded text-white shadow", `bg-gradient-to-br ${colors.gradient}`)}>
                {isGoleiro ? <Shield size={8} /> : <User size={8} />}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white truncate text-sm leading-tight">{jogador.nome}</h3>
                <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0", colors.bg, colors.text)}>
                  <Star size={8} className="fill-current" />
                  {jogador.nivel}
                </div>
              </div>
              
              {/* Info compacta */}
              <div className="flex items-center gap-1 mt-0.5 text-[10px] flex-wrap">
                <span className={colors.text}>{isGoleiro ? 'Goleiro' : 'Linha'}</span>
                {jogador.joga_recuado && (
                  <>
                    <span className="text-white/20">•</span>
                    <span className="text-amber-400">Defensor</span>
                  </>
                )}
                <span className="text-white/20">•</span>
                {temContaAtiva ? (
                  <span className="flex items-center gap-0.5 text-emerald-400">
                    <CheckCircle size={8} />
                    {isJogadorAdmin ? <><Crown size={8} className="text-amber-400 ml-0.5" /></> : 'Ativo'}
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-red-400">
                    <XCircle size={8} /> Sem acesso
                  </span>
                )}
              </div>

              {/* Ações compactas — somente admin */}
              {isAdmin && (
                <div className="flex items-center gap-1 mt-1.5">
                  {!temContaAtiva && (
                    <Button onClick={handleGerarConviteClick} disabled={gerarConviteMutation.isPending} size="sm"
                      className={cn("h-5 px-1.5 text-[9px] font-semibold bg-gradient-to-r rounded", colors.gradient)}>
                      <Mail size={9} className="mr-0.5" /> CONVITE
                    </Button>
                  )}
                  <Button asChild variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10 rounded">
                    <Link to={`/jogadores/${jogador.id}/edit`}>
                      <Edit size={9} className="mr-0.5" /> EDITAR
                    </Link>
                  </Button>
                  {onDelete && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(jogador.id); }}
                      className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded">
                      <Trash2 size={9} />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Seta */}
            <Link to={`/perfil/${jogador.id}`} className="flex-shrink-0 p-1 rounded text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors">
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </motion.div>

      <SelecionarTipoUsuarioDialog open={selecionarTipoOpen} onOpenChange={setSelecionarTipoOpen} onSelect={handleTipoSelecionado} jogadorNome={jogador.nome} isLoading={gerarConviteMutation.isPending} />
      <ConviteModal open={conviteModalOpen} onOpenChange={setConviteModalOpen} convite={gerarConviteMutation.data?.convite || null} />
    </>
  );
});