// src/features/notificacoes/components/NotificacoesSino.tsx
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Swords, Trophy, Star, PartyPopper, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useNotificacoes,
  useNotificacoesCount,
  useMarcarLida,
  useMarcarTodasLidas,
  Notificacao,
} from '../hooks/useNotificacoes';

// ── Ícone por tipo ────────────────────────────────────────────────────────────
const TipoIcon = memo(({ tipo }: { tipo: Notificacao['tipo'] }) => {
  const props = { size: 14, className: 'flex-shrink-0' };
  if (tipo === 'convite')    return <PartyPopper {...props} className="flex-shrink-0 text-emerald-400" />;
  if (tipo === 'rodada_nova') return <Swords {...props} className="flex-shrink-0 text-cyan-400" />;
  if (tipo === 'mvp')        return <Star {...props} className="flex-shrink-0 text-yellow-400" />;
  return <Trophy {...props} className="flex-shrink-0 text-purple-400" />;
});

// ── Cor do dot por tipo ───────────────────────────────────────────────────────
const dotColor: Record<Notificacao['tipo'], string> = {
  convite:    'bg-emerald-400',
  rodada_nova:'bg-cyan-400',
  mvp:        'bg-yellow-400',
  resultado:  'bg-purple-400',
};

// ── Item individual ───────────────────────────────────────────────────────────
const NotifItem = memo(({
  notif,
  onLer,
  onNavigate,
}: {
  notif: Notificacao;
  onLer: (id: number) => void;
  onNavigate: () => void;
}) => {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    if (!notif.lida) onLer(notif.id);
    // Navega para contexto relevante
    if (notif.meta?.rodada_id && notif.meta?.campeonato_id) {
      navigate(`/campeonatos/${notif.meta.campeonato_id}/rodadas/${notif.meta.rodada_id}`);
    } else if (notif.meta?.rodada_id) {
      navigate('/campeonatos');
    }
    onNavigate();
  }, [notif, onLer, onNavigate, navigate]);

  const tempo = formatDistanceToNow(new Date(notif.criado_em + 'Z'), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      className={`
        w-full text-left flex items-start gap-3 px-4 py-3 transition-all
        border-b border-white/5 last:border-0
        ${notif.lida
          ? 'opacity-50 hover:opacity-70'
          : 'hover:bg-cyan-500/5'
        }
      `}
    >
      {/* Dot não-lida */}
      <div className="mt-1 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${notif.lida ? 'bg-transparent' : dotColor[notif.tipo]}`} />
      </div>

      {/* Ícone tipo */}
      <div className={`
        w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${notif.lida ? 'bg-white/5' : 'bg-[#0d1f35]'}
      `}>
        <TipoIcon tipo={notif.tipo} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight ${notif.lida ? 'text-white/50' : 'text-white'}`}>
          {notif.titulo}
        </p>
        <p className="text-[10px] text-cyan-100/40 mt-0.5 leading-tight line-clamp-2">
          {notif.mensagem}
        </p>
        <p className="text-[9px] text-cyan-100/25 mt-1">{tempo}</p>
      </div>
    </motion.button>
  );
});

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export function NotificacoesSino() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: countData } = useNotificacoesCount();
  const { data: notifs, isLoading } = useNotificacoes();
  const marcarLida = useMarcarLida();
  const marcarTodas = useMarcarTodasLidas();

  const naoLidas = countData?.nao_lidas ?? 0;

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* ── BOTÃO SINO ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notificações"
        className={`
          relative flex items-center justify-center w-9 h-9 rounded-xl transition-all
          border border-transparent
          ${open
            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
            : 'hover:bg-cyan-500/10 hover:border-cyan-500/20 text-cyan-100/50 hover:text-cyan-300'
          }
        `}
      >
        <Bell size={18} />

        {/* Badge contador */}
        <AnimatePresence>
          {naoLidas > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none shadow-lg shadow-red-500/50"
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── PAINEL DROPDOWN ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-12 w-80 z-[2000] rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #0d1f35 0%, #0a1628 100%)',
              border: '1px solid rgba(6,182,212,0.15)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  Notificações
                </span>
                {naoLidas > 0 && (
                  <span className="text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                    {naoLidas} nova{naoLidas > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {naoLidas > 0 && (
                  <button
                    onClick={() => marcarTodas.mutate()}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={11} />
                    Todas lidas
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5 text-cyan-100/30 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                </div>
              ) : !notifs || notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell size={28} className="text-cyan-100/10" />
                  <p className="text-xs text-cyan-100/30">Nenhuma notificação ainda</p>
                </div>
              ) : (
                notifs.map(n => (
                  <NotifItem
                    key={n.id}
                    notif={n}
                    onLer={marcarLida.mutate}
                    onNavigate={() => setOpen(false)}
                  />
                ))
              )}
            </div>

            {/* Footer line */}
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}