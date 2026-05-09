// Arquivo: src/features/jogadores/components/ConviteModal.tsx (ATUALIZADO)
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Mail, Link as LinkIcon, Clock, User, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Convite } from '@/@types';

type ConviteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convite: Convite | null;
};

export const ConviteModal = ({ open, onOpenChange, convite }: ConviteModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!convite) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(convite.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formata data de expiração
  const formatExpiraEm = (dataISO: string) => {
    const data = new Date(dataISO);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(data);
  };

  // Calcula tempo restante
  const getTempoRestante = (dataISO: string) => {
    const agora = new Date();
    const expira = new Date(dataISO);
    const diff = expira.getTime() - agora.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    return `${horas}h restantes`;
  };

  // Define cor e ícone com base no tipo
  const isAdmin = convite.tipo_usuario === 'admin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero">
              <Mail className="h-5 w-5 text-white" />
            </div>
            Convite Gerado!
          </DialogTitle>
          <DialogDescription>
            Envie este link para <strong>{convite.jogador.nome}</strong> ativar a conta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar do Jogador + Tipo de Conta */}
          <div className="space-y-3">
            {/* Card do Jogador */}
            <div className="flex items-center gap-4 rounded-lg border border-borderLight bg-surface/50 p-4">
              <div className="relative">
                {convite.jogador.foto_url ? (
                  <img
                    src={convite.jogador.foto_url}
                    alt={convite.jogador.nome}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero text-xl font-bold text-white">
                    {convite.jogador.nome.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 rounded-full bg-success p-1">
                  <User className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-textPrimary">{convite.jogador.nome}</p>
                <p className="text-sm text-textMuted">Receberá o convite</p>
              </div>
            </div>

            {/* Badge de Tipo de Conta */}
            <div
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                isAdmin
                  ? 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10'
                  : 'border-accentPrimary/30 bg-accentPrimary/10'
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  isAdmin ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-hero'
                }`}
              >
                {isAdmin ? (
                  <Crown className="h-6 w-6 text-white" />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-textPrimary">
                  Tipo de Conta: {isAdmin ? 'Administrador' : 'Jogador'}
                </p>
                <p className="text-sm text-textMuted">
                  {isAdmin
                    ? 'Terá acesso total ao sistema'
                    : 'Poderá visualizar suas estatísticas'}
                </p>
              </div>
            </div>
          </div>

          {/* Link do Convite */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-textMuted">
              <LinkIcon className="h-4 w-4" />
              Link de Ativação
            </label>
            <div className="flex gap-2">
              <Input
                value={convite.link}
                readOnly
                className="flex-1 font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyLink}
                variant={copied ? 'default' : 'outline'}
                size="sm"
                className={copied ? 'bg-success hover:bg-success' : ''}
              >
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info de Expiração */}
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-textPrimary">
                  {getTempoRestante(convite.expira_em)}
                </p>
                <p className="text-sm text-textMuted">
                  Expira em {formatExpiraEm(convite.expira_em)}
                </p>
              </div>
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-2 rounded-lg bg-surface/50 p-4">
            <h4 className="font-medium text-textPrimary">📱 Como enviar:</h4>
            <ul className="space-y-1 text-sm text-textMuted">
              <li>• Copie o link acima</li>
              <li>• Envie por WhatsApp, Email ou Telegram</li>
              <li>
                • {convite.jogador.nome} acessará o link para criar sua senha
              </li>
              <li>
                • Após ativação, poderá fazer login como{' '}
                <strong>{isAdmin ? 'Admin' : 'Jogador'}</strong>
              </li>
            </ul>
          </div>

          {/* Botão de Fechar */}
          <Button onClick={() => onOpenChange(false)} className="btn-primary w-full">
            Entendi!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};