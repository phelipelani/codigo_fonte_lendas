// Arquivo: src/features/presenca/components/JogadoresTab.tsx
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Phone, Power, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  useBotJogadores,
  useCreateBotJogador,
  useUpdateBotJogador,
  useDeleteBotJogador,
  useToggleBotJogador,
  type BotJogador,
} from '../api/presencaApi';

type FormState = {
  id?: number;
  nome: string;
  numero: string;
  tipo: 'linha' | 'goleiro';
};

const FORM_INICIAL: FormState = { nome: '', numero: '', tipo: 'linha' };

export const JogadoresTab: React.FC = () => {
  const { data, isLoading } = useBotJogadores();
  const [busca, setBusca] = React.useState('');
  const [form, setForm] = React.useState<FormState | null>(null);

  const createMut = useCreateBotJogador();
  const updateMut = useUpdateBotJogador();
  const deleteMut = useDeleteBotJogador();
  const toggleMut = useToggleBotJogador();

  const jogadores = data?.jogadores ?? [];
  const filtrados = React.useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return jogadores;
    return jogadores.filter(
      (j) => j.nome.toLowerCase().includes(t) || j.numero.includes(t)
    );
  }, [jogadores, busca]);

  const ativos = jogadores.filter((j) => !!j.ativo).length;
  const total = jogadores.length;

  const abrirNovo = () => setForm({ ...FORM_INICIAL });
  const abrirEdicao = (j: BotJogador) =>
    setForm({ id: j.id, nome: j.nome, numero: j.numero, tipo: j.tipo });
  const fecharForm = () => setForm(null);

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (form.id) {
      updateMut.mutate(
        { id: form.id, nome: form.nome, numero: form.numero, tipo: form.tipo },
        { onSuccess: fecharForm }
      );
    } else {
      createMut.mutate(
        { nome: form.nome, numero: form.numero, tipo: form.tipo },
        { onSuccess: fecharForm }
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com busca + acoes */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-cyan-100/50">
            Jogadores cadastrados
          </span>
          <span className="rounded-md bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 text-xs font-bold text-cyan-200 tabular-nums">
            {ativos}/{total} ativos
          </span>
        </div>
        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar jogador
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-100/40 pointer-events-none" />
        <Input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou número..."
          className="pl-9 h-11 bg-[#0d1f35]/50 border-cyan-500/20 text-white placeholder:text-cyan-100/30 rounded-xl"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-500/20 bg-[#0a1628]/40 p-8 text-center">
          <p className="text-cyan-100/60 text-sm">
            {busca ? `Nenhum jogador encontrado para "${busca}"` : 'Nenhum jogador cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((j) => (
            <JogadorCard
              key={j.id}
              jogador={j}
              onEdit={() => abrirEdicao(j)}
              onToggle={() => toggleMut.mutate(j.id)}
              onDelete={() => {
                if (confirm(`Remover ${j.nome}? Essa ação é irreversível.`)) {
                  deleteMut.mutate(j.id);
                }
              }}
              busy={toggleMut.isPending || deleteMut.isPending}
            />
          ))}
        </div>
      )}

      {/* Modal de form */}
      <AnimatePresence>
        {form !== null && (
          <FormModal
            form={form}
            setForm={(f) => setForm((prev) => (prev ? { ...prev, ...f } : prev))}
            onSubmit={submitForm}
            onClose={fecharForm}
            isPending={createMut.isPending || updateMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================
// Card de jogador
// =============================================================
const JogadorCard: React.FC<{
  jogador: BotJogador;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}> = ({ jogador, onEdit, onToggle, onDelete, busy }) => {
  const ativo = !!jogador.ativo;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border p-3 backdrop-blur-md transition-all',
        ativo
          ? 'border-cyan-500/20 bg-[#0a1628]/60 hover:border-cyan-400/40'
          : 'border-white/5 bg-black/20 opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{jogador.nome}</h3>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-cyan-100/50">
            <Phone className="h-3 w-3" />
            <span className="tabular-nums">{formatarNumero(jogador.numero)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border',
              jogador.tipo === 'goleiro'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
            )}
          >
            {jogador.tipo === 'goleiro' ? '⚽ Goleiro' : 'Linha'}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all',
            ativo
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-white/10 bg-black/30 text-white/40 hover:text-white/80'
          )}
        >
          <Power className="h-3 w-3" />
          {ativo ? 'Ativo' : 'Inativo'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 disabled:opacity-30"
          aria-label="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

function formatarNumero(n: string): string {
  const limpo = (n || '').replace(/\D/g, '');
  if (limpo.length === 13) {
    // 55 12 99999 9999
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  }
  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  return n;
}

// =============================================================
// Modal de form (criar/editar)
// =============================================================
const FormModal: React.FC<{
  form: FormState;
  setForm: (f: Partial<FormState>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}> = ({ form, setForm, onSubmit, onClose, isPending }) => {
  const editando = !!form.id;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0a1628] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-black text-white">
            {editando ? 'Editar jogador' : 'Novo jogador'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-cyan-100/50 hover:text-cyan-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Nome
            </label>
            <Input
              required
              value={form.nome}
              onChange={(e) => setForm({ nome: e.target.value })}
              placeholder="Ex: João Silva"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Número (com DDD)
            </label>
            <Input
              required
              value={form.numero}
              onChange={(e) => setForm({ numero: e.target.value })}
              placeholder="Ex: 12999999999"
              inputMode="numeric"
            />
            <p className="mt-1 text-[10px] text-cyan-100/40">
              Pode digitar com ou sem +55. Será normalizado automaticamente.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-cyan-200/70 mb-1">
              Posição
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['linha', 'goleiro'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm({ tipo })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-bold transition-all',
                    form.tipo === tipo
                      ? tipo === 'goleiro'
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                        : 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/10 bg-black/30 text-white/40 hover:text-white/80'
                  )}
                >
                  {tipo === 'goleiro' ? '⚽ Goleiro' : 'Linha'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending || !form.nome || !form.numero}
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {editando ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
};
