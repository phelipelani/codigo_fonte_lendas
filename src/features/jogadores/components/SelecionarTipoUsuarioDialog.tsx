// Arquivo: src/features/jogadores/components/SelecionarTipoUsuarioDialog.tsx (NOVO)
import { User, Crown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type SelecionarTipoUsuarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (tipo: 'user' | 'admin') => void;
  jogadorNome: string;
  isLoading?: boolean;
};

export const SelecionarTipoUsuarioDialog = ({
  open,
  onOpenChange,
  onSelect,
  jogadorNome,
  isLoading = false,
}: SelecionarTipoUsuarioDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Gerar Convite</DialogTitle>
          <DialogDescription>
            Escolha o tipo de conta que <strong>{jogadorNome}</strong> terá no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Opção: Jogador */}
          <button
            onClick={() => onSelect('user')}
            disabled={isLoading}
            className={cn(
              'group relative w-full overflow-hidden rounded-xl border-2 border-accentPrimary/30 bg-gradient-to-br from-accentPrimary/10 to-accentSecondary/10 p-6 text-left transition-all hover:border-accentPrimary hover:shadow-lg hover:shadow-accentPrimary/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {/* Ícone */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-hero shadow-glow-cyan">
                <User className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-textPrimary">
                  👤 Jogador
                </h3>
                <p className="text-sm text-textMuted">Acesso básico</p>
              </div>
            </div>

            {/* Descrição */}
            <ul className="space-y-2 text-sm text-textMuted">
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Visualizar estatísticas pessoais</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Ver histórico de partidas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Acessar dashboard próprio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger">✗</span>
                <span>Não pode criar/editar jogadores</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-danger">✗</span>
                <span>Não pode gerenciar rodadas</span>
              </li>
            </ul>

            {/* Borda animada no hover */}
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-hero opacity-0 blur transition-opacity group-hover:opacity-20" />
          </button>

          {/* Opção: Admin */}
          <button
            onClick={() => onSelect('admin')}
            disabled={isLoading}
            className={cn(
              'group relative w-full overflow-hidden rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-6 text-left transition-all hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {/* Ícone */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/30">
                <Crown className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-textPrimary">
                  👑 Administrador
                </h3>
                <p className="text-sm text-textMuted">Acesso total</p>
              </div>
            </div>

            {/* Descrição */}
            <ul className="space-y-2 text-sm text-textMuted">
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Todas as permissões de Jogador</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Criar e editar jogadores</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Gerenciar ligas e rodadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Gerar convites para outros admins</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success">✓</span>
                <span>Acesso completo ao sistema</span>
              </li>
            </ul>

            {/* Borda animada no hover */}
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 opacity-0 blur transition-opacity group-hover:opacity-20" />
          </button>
        </div>

        {/* Botão Cancelar */}
        <Button
          onClick={() => onOpenChange(false)}
          variant="outline"
          disabled={isLoading}
          className="w-full"
        >
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
};