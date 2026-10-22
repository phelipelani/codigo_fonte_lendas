// Arquivo: src/features/presenca/routes/RachaPage.tsx
//
// Tela principal de gestão de racha multi-tenant, conexão WhatsApp e presenças.
// Tabs:
//   1. Fila & Presença — Titulares, Fila FIFO, Homologação, Reabertura, Pós-jogo e Auditoria
//   2. Participantes   — Mensalistas, Avulsos Recorrentes e Convidados (com seleção)
//   3. Mensagens       — 3 Opções: Confirmação Semanal, Renovação Mensal e Comunicado Livre
//   4. Configurações   — Dados do local, horários e intervalos
//   5. Logs            — Histórico técnico de eventos do bot

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Megaphone,
  Settings,
  ScrollText,
  ChevronDown,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  useMeusRachas,
  useSessaoAtiva,
  useRachaParticipantes,
} from '../api/presencaApi';

import { WhatsAppConexaoCard } from '../components/WhatsAppConexaoCard';
import { RachaFilaPresencaTab } from '../components/RachaFilaPresencaTab';
import { RachaParticipantesTab } from '../components/RachaParticipantesTab';
import { RachaMensagensTab } from '../components/RachaMensagensTab';
import { ConfigTab } from '../components/ConfigTab';
import { LogsTab } from '../components/LogsTab';

type TabId = 'fila' | 'participantes' | 'mensagens' | 'config' | 'logs';

type TabDef = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  { id: 'fila', label: 'Fila & Presença Real', icon: Calendar },
  { id: 'participantes', label: 'Participantes', icon: Users, adminOnly: true },
  { id: 'mensagens', label: 'Convocação & Mensagens', icon: Megaphone, adminOnly: true },
  { id: 'config', label: 'Configurações', icon: Settings, adminOnly: true },
  { id: 'logs', label: 'Logs', icon: ScrollText, adminOnly: true },
];

export const RachaPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = React.useState<TabId>('fila');

  // Multi-racha context
  const { data: meusRachasData, isLoading: isRachasLoading } = useMeusRachas();
  const rachas = meusRachasData?.rachas ?? [];

  const [selectedRachaId, setSelectedRachaId] = React.useState<number | undefined>(undefined);

  // Set default active racha
  React.useEffect(() => {
    if (!selectedRachaId && rachas.length > 0) {
      setSelectedRachaId(rachas[0].id);
    }
  }, [rachas, selectedRachaId]);

  const activeRacha = rachas.find((r) => r.id === selectedRachaId) || rachas[0];
  const rachaId = activeRacha?.id ?? 1;

  // Carrega sessão ativa e participantes para sincronizar dados nas tabs
  const { data: sessaoData } = useSessaoAtiva(rachaId);
  const { data: participantesData } = useRachaParticipantes(rachaId);

  // Seleção de participantes para convocação compartilhada entre as abas
  const [selecionadosConvocacao, setSelecionadosConvocacao] = React.useState<Set<number>>(new Set());

  const handleToggleSelecionado = (jogadorId: number) => {
    setSelecionadosConvocacao((prev) => {
      const next = new Set(prev);
      if (next.has(jogadorId)) {
        next.delete(jogadorId);
      } else {
        next.add(jogadorId);
      }
      return next;
    });
  };

  const handleSelecionarTodos = (jogadorIds: number[]) => {
    setSelecionadosConvocacao(new Set(jogadorIds));
  };

  const handleLimparSelecao = () => {
    setSelecionadosConvocacao(new Set());
  };

  const tabsVisiveis = React.useMemo(
    () => TABS.filter((t) => !t.adminOnly || isAdmin),
    [isAdmin]
  );

  const participantes = participantesData?.participantes ?? [];
  const totalMensalistas = participantes.filter((p) => p.tipo_participacao === 'mensalista').length;
  const titulares = sessaoData?.titulares ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ===== Header Principal ===== */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-black">
              <span className="bg-gradient-to-r from-cyan-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Gestão de Racha & Presença
              </span>
            </h1>
            {activeRacha?.papel && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {activeRacha.papel}
              </span>
            )}
          </div>
          <p className="mt-1 text-cyan-100/50 text-sm">
            Controle multi-racha de convocação, fila FIFO, presença real e integração com WhatsApp
          </p>
        </div>

        {/* Seletor de Racha (quando o organizador gerencia mais de um) */}
        {rachas.length > 1 && (
          <div className="flex items-center gap-2 bg-[#0a1628]/80 border border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-md">
            <Layers className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-cyan-100/60 whitespace-nowrap">Racha ativo:</span>
            <select
              value={selectedRachaId}
              onChange={(e) => setSelectedRachaId(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
            >
              {rachas.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#0a1628] text-white">
                  {r.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* ===== Card de Conexão WhatsApp & QR Code ===== */}
      <WhatsAppConexaoCard rachaId={rachaId} rachaNome={activeRacha?.nome} />

      {/* ===== Abas de Navegação ===== */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 rounded-xl border border-cyan-500/20 bg-[#0a1628]/50 p-1 backdrop-blur-md">
          {tabsVisiveis.map((t) => {
            const Icon = t.icon;
            const ativo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all',
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

      {/* ===== Conteúdo Dinâmico por Aba ===== */}
      <motion.div
        key={`${tab}-${rachaId}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'fila' && <RachaFilaPresencaTab rachaId={rachaId} />}

        {tab === 'participantes' && isAdmin && (
          <RachaParticipantesTab
            rachaId={rachaId}
            selecionadosConvocacao={selecionadosConvocacao}
            onToggleSelecionado={handleToggleSelecionado}
            onSelecionarTodos={handleSelecionarTodos}
            onLimparSelecao={handleLimparSelecao}
          />
        )}

        {tab === 'mensagens' && isAdmin && (
          <RachaMensagensTab
            rachaId={rachaId}
            sessaoAtiva={sessaoData?.sessao ?? null}
            totalConvocados={titulares.length}
            totalMensalistas={totalMensalistas}
            selecionadosAvulsos={selecionadosConvocacao}
          />
        )}

        {tab === 'config' && isAdmin && <ConfigTab />}
        {tab === 'logs' && isAdmin && <LogsTab />}
      </motion.div>
    </div>
  );
};
