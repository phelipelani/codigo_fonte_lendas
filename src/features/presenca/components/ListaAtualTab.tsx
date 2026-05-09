// Arquivo: src/features/presenca/components/ListaAtualTab.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  usePresencaDados,
  usePresencaAcao,
  type JogadorPresenca,
  type StatusJogador,
} from '../api/presencaApi';

type Coluna = {
  id: 'confirmados' | 'pendentes' | 'ausentes' | 'sem_resposta';
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  toneClass: string;
};

const COLUNAS: Coluna[] = [
  {
    id: 'confirmados',
    titulo: 'Confirmados',
    icon: CheckCircle2,
    toneClass: 'border-emerald-500/30 bg-emerald-500/5',
  },
  {
    id: 'pendentes',
    titulo: 'Aguardando',
    icon: Clock,
    toneClass: 'border-amber-500/30 bg-amber-500/5',
  },
  {
    id: 'ausentes',
    titulo: 'Ausentes',
    icon: XCircle,
    toneClass: 'border-red-500/30 bg-red-500/5',
  },
  {
    id: 'sem_resposta',
    titulo: 'Sem resposta',
    icon: HelpCircle,
    toneClass: 'border-cyan-500/20 bg-cyan-500/5',
  },
];

export const ListaAtualTab: React.FC = () => {
  const { data, isLoading, isError } = usePresencaDados();
  const acaoMut = usePresencaAcao();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
        <p className="text-cyan-100/60 text-sm">Carregando lista...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-red-300">Erro ao carregar lista. Verifique se o servidor está rodando.</p>
      </div>
    );
  }

  if (!data?.lista) {
    return (
      <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-10 text-center">
        <Bell className="mx-auto mb-3 h-10 w-10 text-cyan-400/50" />
        <h3 className="text-lg font-bold text-white">Nenhuma lista ativa</h3>
        <p className="mt-1.5 text-sm text-cyan-100/60">
          Use o botão <strong>"Disparar lista nova"</strong> no topo para criar uma lista
          da próxima rodada e enviar a convocação pelo WhatsApp.
        </p>
      </div>
    );
  }

  const grupos = data.jogadores;
  const totalConfirmados = grupos.confirmados.length;
  const totalPendentes = grupos.pendentes.length;
  const totalAusentes = grupos.ausentes.length;
  const totalSemResp = grupos.sem_resposta.length;
  const total = totalConfirmados + totalPendentes + totalAusentes + totalSemResp;

  return (
    <div className="space-y-5">
      {/* Resumo numerico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Confirmados', valor: totalConfirmados, classe: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
          { label: 'Aguardando', valor: totalPendentes, classe: 'text-amber-300 border-amber-500/30 bg-amber-500/10' },
          { label: 'Ausentes', valor: totalAusentes, classe: 'text-red-300 border-red-500/30 bg-red-500/10' },
          { label: 'Total', valor: total, classe: 'text-cyan-200 border-cyan-500/30 bg-cyan-500/10' },
        ].map((s) => (
          <div
            key={s.label}
            className={cn(
              'rounded-xl border p-3 backdrop-blur-md',
              s.classe
            )}
          >
            <div className="text-[10px] uppercase font-semibold tracking-widest opacity-80">
              {s.label}
            </div>
            <div className="text-2xl font-black tabular-nums">{s.valor}</div>
          </div>
        ))}
      </div>

      {/* Colunas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {COLUNAS.map((col) => {
          const Icon = col.icon;
          const lista = grupos[col.id] ?? [];
          return (
            <div
              key={col.id}
              className={cn('rounded-2xl border backdrop-blur-md p-3 sm:p-4', col.toneClass)}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-white/80" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">
                    {col.titulo}
                  </h3>
                </div>
                <span className="text-xs font-black tabular-nums text-white/60">
                  {lista.length}
                </span>
              </div>

              {lista.length === 0 ? (
                <p className="text-xs text-white/40 italic py-3 text-center">vazio</p>
              ) : (
                <ul className="space-y-2">
                  {lista.map((j, idx) => (
                    <JogadorRow
                      key={j.id}
                      jogador={j}
                      ordemConfirmado={col.id === 'confirmados' ? idx + 1 : null}
                      onAcao={(acao) => acaoMut.mutate({ jogador_id: j.id, acao })}
                      isPending={acaoMut.isPending}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =============================================================
// Linha individual de jogador
// =============================================================

type JogadorRowProps = {
  jogador: JogadorPresenca;
  ordemConfirmado: number | null;
  onAcao: (acao: 'confirmar' | 'ausente' | 'aguardando' | 'lembrete') => void;
  isPending: boolean;
};

const JogadorRow: React.FC<JogadorRowProps> = ({ jogador, ordemConfirmado, onAcao, isPending }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <li className="rounded-xl border border-white/10 bg-black/20 hover:border-cyan-400/30 transition-colors">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-2 text-left"
      >
        {ordemConfirmado != null && (
          <span className="flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-black">
            {ordemConfirmado}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white truncate">{jogador.nome}</div>
          {jogador.horario_resposta && (
            <div className="text-[10px] text-white/40">{jogador.horario_resposta}</div>
          )}
        </div>
        {jogador.tipo === 'goleiro' && (
          <span className="text-[10px] font-bold text-emerald-300/80">⚽</span>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-white/5 p-2 grid grid-cols-2 gap-1.5"
        >
          <ActionBtn
            label="Confirmar"
            tone="emerald"
            disabled={isPending || jogador.status === 'confirmado'}
            onClick={() => onAcao('confirmar')}
          />
          <ActionBtn
            label="Ausente"
            tone="red"
            disabled={isPending || jogador.status === 'ausente'}
            onClick={() => onAcao('ausente')}
          />
          <ActionBtn
            label="Aguardando"
            tone="amber"
            disabled={isPending || jogador.status === 'aguardando'}
            onClick={() => onAcao('aguardando')}
          />
          <ActionBtn
            label="Lembrete"
            tone="cyan"
            disabled={isPending}
            onClick={() => onAcao('lembrete')}
          />
        </motion.div>
      )}
    </li>
  );
};

const TONE_CLASSES: Record<'emerald' | 'red' | 'amber' | 'cyan', string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
  red: 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20',
};

const ActionBtn: React.FC<{
  label: string;
  tone: keyof typeof TONE_CLASSES;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, tone, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed',
      TONE_CLASSES[tone]
    )}
  >
    {label}
  </button>
);

// Mantem export pra debug se quiser usar isolado
export { JogadorRow };
export type { StatusJogador };
