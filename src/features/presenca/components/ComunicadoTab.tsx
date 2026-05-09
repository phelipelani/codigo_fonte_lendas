// Arquivo: src/features/presenca/components/ComunicadoTab.tsx
//
// Tela de envio de mensagem em massa.
// O admin escolhe destinatarios (todos / so ativos / selecao manual)
// e digita uma mensagem livre. O backend envia sequencialmente com
// rate limit pra evitar marcacao como spam no WhatsApp.

import * as React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Users, UserCheck, Send, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  useBotJogadores,
  useMensagemMassa,
  type MensagemMassaResponse,
} from '../api/presencaApi';

type Modo = 'todos' | 'ativos' | 'selecionar';

export const ComunicadoTab: React.FC = () => {
  const { data: jogadoresData, isLoading } = useBotJogadores();
  const enviarMut = useMensagemMassa();

  const [modo, setModo] = React.useState<Modo>('ativos');
  const [selecionados, setSelecionados] = React.useState<Set<number>>(new Set());
  const [texto, setTexto] = React.useState('');
  const [busca, setBusca] = React.useState('');
  const [resultado, setResultado] = React.useState<MensagemMassaResponse | null>(null);

  const todosJogadores = jogadoresData?.jogadores ?? [];
  const ativos = todosJogadores.filter((j) => !!j.ativo);

  const filtrados = React.useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return todosJogadores;
    return todosJogadores.filter(
      (j) => j.nome.toLowerCase().includes(t) || j.numero.includes(t)
    );
  }, [todosJogadores, busca]);

  const totalAlvo = (() => {
    if (modo === 'todos') return todosJogadores.length;
    if (modo === 'ativos') return ativos.length;
    return selecionados.size;
  })();

  const podeEnviar = totalAlvo > 0 && texto.trim().length > 0 && !enviarMut.isPending;

  const enviar = () => {
    if (!podeEnviar) return;
    if (
      !confirm(
        `Vai enviar essa mensagem para ${totalAlvo} jogador${totalAlvo !== 1 ? 'es' : ''}.\n\nConfirma?`
      )
    )
      return;

    const destinatarios =
      modo === 'todos'
        ? 'todos'
        : modo === 'ativos'
          ? 'ativos'
          : Array.from(selecionados);

    enviarMut.mutate(
      { destinatarios, texto: texto.trim() },
      {
        onSuccess: (data) => {
          setResultado(data);
          if (data.falhou === 0) {
            setTexto('');
            setSelecionados(new Set());
          }
        },
      }
    );
  };

  const toggleSelecionado = (id: number) => {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const selecionarTodos = () => setSelecionados(new Set(filtrados.map((j) => j.id)));
  const limparSelecao = () => setSelecionados(new Set());

  return (
    <div className="space-y-5">
      {/* Header explicativo */}
      <div className="flex items-start gap-3 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Comunicado em massa</h3>
          <p className="text-xs text-cyan-100/60 mt-0.5">
            Envia uma mesma mensagem por WhatsApp para vários jogadores. Útil para avisar
            churrasco, mudança de horário, suspensão de rodada etc.
          </p>
        </div>
      </div>

      {/* Seleção de destinatarios */}
      <section className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-cyan-200/80">
            1. Destinatários
          </h4>
          <span className="text-xs font-bold text-cyan-100 tabular-nums">
            {totalAlvo} selecionado{totalAlvo !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ModoBtn
            ativo={modo === 'ativos'}
            onClick={() => setModo('ativos')}
            icon={<UserCheck className="h-4 w-4" />}
            titulo="Apenas ativos"
            sub={`${ativos.length} jogador${ativos.length !== 1 ? 'es' : ''}`}
          />
          <ModoBtn
            ativo={modo === 'todos'}
            onClick={() => setModo('todos')}
            icon={<Users className="h-4 w-4" />}
            titulo="Todos"
            sub={`${todosJogadores.length} no total`}
          />
          <ModoBtn
            ativo={modo === 'selecionar'}
            onClick={() => setModo('selecionar')}
            icon={<Search className="h-4 w-4" />}
            titulo="Escolher"
            sub="Manualmente"
          />
        </div>

        {modo === 'selecionar' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 pt-2 border-t border-cyan-500/10"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40 pointer-events-none" />
              <Input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou número..."
                className="pl-9 h-10 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={selecionarTodos}
                className="text-cyan-300 hover:text-cyan-200 font-semibold"
              >
                Selecionar visíveis ({filtrados.length})
              </button>
              <button
                type="button"
                onClick={limparSelecao}
                className="text-cyan-100/50 hover:text-cyan-100 font-semibold"
              >
                Limpar seleção
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-lg border border-cyan-500/10 bg-black/20 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {isLoading ? (
                <div className="col-span-full p-3 text-center text-cyan-100/50 text-xs">
                  <Loader2 className="inline-block h-4 w-4 animate-spin" /> carregando...
                </div>
              ) : filtrados.length === 0 ? (
                <div className="col-span-full p-3 text-center text-cyan-100/50 text-xs italic">
                  Nenhum jogador encontrado
                </div>
              ) : (
                filtrados.map((j) => {
                  const checked = selecionados.has(j.id);
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => toggleSelecionado(j.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors text-xs',
                        checked
                          ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-100'
                          : 'border border-transparent text-cyan-100/70 hover:bg-cyan-500/5'
                      )}
                    >
                      <span
                        className={cn(
                          'flex-shrink-0 inline-flex h-4 w-4 items-center justify-center rounded border',
                          checked
                            ? 'bg-cyan-400 border-cyan-300'
                            : 'border-cyan-500/30 bg-transparent'
                        )}
                      >
                        {checked && <CheckCircle2 className="h-3 w-3 text-[#0a1628]" />}
                      </span>
                      <span className="truncate flex-1 font-semibold">{j.nome}</span>
                      {!j.ativo && (
                        <span className="text-[9px] uppercase tracking-wider text-white/30">
                          inativo
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </section>

      {/* Texto da mensagem */}
      <section className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 backdrop-blur-md p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-cyan-200/80">
            2. Mensagem
          </h4>
          <span className="text-[10px] text-cyan-100/40 tabular-nums">
            {texto.length} caracteres
          </span>
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={
            'Ex: Galera, vai ter churrasco no sábado dia 15/05 às 13h no campo do Zé!\n\nQuem quiser participar, manda confirmar! 🍖🍻'
          }
          rows={6}
          className="bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 rounded-lg resize-y min-h-[150px]"
        />

        <p className="text-[11px] text-cyan-100/50">
          Dica: você pode usar <code className="text-cyan-300">*texto*</code> para negrito,{' '}
          <code className="text-cyan-300">_texto_</code> para itálico e emojis 🎯
        </p>
      </section>

      {/* Botao enviar */}
      <div className="flex justify-end">
        <Button
          onClick={enviar}
          disabled={!podeEnviar}
          size="lg"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25"
        >
          {enviarMut.isPending ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Send className="mr-2 h-5 w-5" />
          )}
          {enviarMut.isPending
            ? 'Enviando...'
            : `Enviar para ${totalAlvo} jogador${totalAlvo !== 1 ? 'es' : ''}`}
        </Button>
      </div>

      {/* Resultado do envio */}
      {resultado && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border backdrop-blur-md p-4 space-y-3',
            resultado.falhou === 0
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-bold text-white">Resultado do envio</h4>
            <button
              type="button"
              onClick={() => setResultado(null)}
              className="text-xs text-cyan-100/50 hover:text-cyan-100"
            >
              fechar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2">
              <div className="text-2xl font-black text-emerald-200 tabular-nums">
                {resultado.enviados}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">
                Enviados
              </div>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2">
              <div className="text-2xl font-black text-red-200 tabular-nums">
                {resultado.falhou}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-red-200/70">
                Falharam
              </div>
            </div>
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2">
              <div className="text-2xl font-black text-cyan-200 tabular-nums">
                {resultado.total}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-200/70">
                Total
              </div>
            </div>
          </div>

          {resultado.falhou > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-amber-200 hover:text-amber-100 font-semibold">
                Ver detalhes ({resultado.falhou} falha{resultado.falhou !== 1 ? 's' : ''})
              </summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {resultado.detalhes
                  .filter((d) => !d.ok)
                  .map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-black/20"
                    >
                      <span className="flex items-center gap-1.5 text-red-300">
                        <XCircle className="h-3 w-3" /> {d.nome}
                      </span>
                      {d.erro && <span className="text-red-200/60 text-[10px]">{d.erro}</span>}
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </motion.section>
      )}
    </div>
  );
};

// =============================================================
// Botao de modo
// =============================================================
const ModoBtn: React.FC<{
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  titulo: string;
  sub: string;
}> = ({ ativo, onClick, icon, titulo, sub }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all',
      ativo
        ? 'border-cyan-400/60 bg-gradient-to-br from-cyan-500/20 to-teal-500/20 text-cyan-100 shadow-inner'
        : 'border-cyan-500/20 bg-[#0d1f35]/40 text-cyan-100/50 hover:bg-cyan-500/5 hover:text-cyan-100/80'
    )}
  >
    {icon}
    <span className="text-sm font-bold">{titulo}</span>
    <span className="text-[10px] opacity-70">{sub}</span>
  </button>
);
