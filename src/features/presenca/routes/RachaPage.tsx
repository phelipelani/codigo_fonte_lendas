// Arquivo: src/features/presenca/routes/RachaPage.tsx
//
// Tela principal de gestao de presenca/racha. Tabs:
//   1. Lista atual    — confirmados / pendentes / ausentes da semana
//   2. Jogadores      — CRUD do bot (adicionar/editar/desativar)
//   3. Comunicado     — mensagem em massa
//   4. Configurações  — dia, horário, local, intervalos
//   5. Logs           — ultimas linhas do bot.log

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Megaphone,
  Settings,
  ScrollText,
  RefreshCw,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

import {
  usePresencaDados,
  useDispararLista,
  useFecharLista,
  useRecarregarLista,
} from '../api/presencaApi';

import { ListaAtualTab } from '../components/ListaAtualTab';
import { JogadoresTab } from '../components/JogadoresTab';
import { ComunicadoTab } from '../components/ComunicadoTab';
import { ConfigTab } from '../components/ConfigTab';
import { LogsTab } from '../components/LogsTab';

type TabId = 'lista' | 'jogadores' | 'comunicado' | 'config' | 'logs';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'lista', label: 'Lista atual', icon: Calendar },
  { id: 'jogadores', label: 'Jogadores', icon: Users },
  { id: 'comunicado', label: 'Comunicado', icon: Megaphone },
  { id: 'config', label: 'Configurações', icon: Settings },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

export const RachaPage: React.FC = () => {
  const [tab, setTab] = React.useState<TabId>('lista');
  const { data: dados } = usePresencaDados();

  const dispararMut = useDispararLista();
  const fecharMut = useFecharLista();
  const recarregarMut = useRecarregarLista();

  const lista = dados?.lista ?? null;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ===== Header ===== */}
      <header className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Racha — Gestão de Presença
              </span>
            </h1>
            <p className="mt-1 text-cyan-100/50 text-sm">
              Bot de convocação semanal pelo WhatsApp
            </p>
          </div>

          {/* Botoes de acao globais — so aparecem se ja existe lista */}
          {lista && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => recarregarMut.mutate()}
                disabled={recarregarMut.isPending}
                className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', recarregarMut.isPending && 'animate-spin')} />
                Reenviar relatório
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => fecharMut.mutate()}
                disabled={fecharMut.isPending}
                className={cn(
                  'border-amber-500/30 text-amber-200 hover:bg-amber-500/10',
                  lista.fechado && 'border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10'
                )}
              >
                {lista.fechado ? (
                  <>
                    <Unlock className="mr-2 h-4 w-4" /> Reabrir lista
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" /> Fechar lista
                  </>
                )}
              </Button>
            </div>
          )}

          {!lista && (
            <Button
              onClick={() => dispararMut.mutate()}
              disabled={dispararMut.isPending}
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold"
            >
              <Send className="mr-2 h-4 w-4" />
              {dispararMut.isPending ? 'Disparando...' : 'Disparar lista nova'}
            </Button>
          )}
        </div>
      </header>

      {/* ===== Status banner ===== */}
      {lista && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md',
            lista.fechado
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex h-2.5 w-2.5 rounded-full',
                lista.fechado ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
              )}
            />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100/60">
                Lista de {dados?.config?.dia_racha || 'racha'}
              </div>
              <div className="text-sm sm:text-base font-bold text-white">
                {lista.data_racha} • {lista.fechado ? 'Fechada' : 'Aberta'}
                {lista.disparado && !lista.fechado && ' • Disparada'}
              </div>
            </div>
          </div>
          {dados?.config && (
            <div className="text-xs sm:text-sm text-cyan-100/60">
              {dados.config.local_racha} • {dados.config.horario_racha}
            </div>
          )}
        </motion.div>
      )}

      {/* ===== Tabs ===== */}
      <div className="mb-5 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 p-1 backdrop-blur-md">
          {TABS.map((t) => {
            const Icon = t.icon;
            const ativo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all',
                  ativo
                    ? 'bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-cyan-100 shadow-inner border border-cyan-400/30'
                    : 'text-cyan-100/50 hover:text-cyan-100 hover:bg-cyan-500/10'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Conteudo ===== */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'lista' && <ListaAtualTab />}
        {tab === 'jogadores' && <JogadoresTab />}
        {tab === 'comunicado' && <ComunicadoTab />}
        {tab === 'config' && <ConfigTab />}
        {tab === 'logs' && <LogsTab />}
      </motion.div>
    </div>
  );
};
