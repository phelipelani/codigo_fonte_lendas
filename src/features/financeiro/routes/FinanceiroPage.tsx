import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import {
  Wallet, Link2, Link2Off, RefreshCw,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import {
  useMpStatus, useMpSaldo, useMpResumo, useMpTransacoes,
  useMpOAuthUrl, useMpDesconectar,
  type MpTransacao, type MpResumoMes,
} from '../api/financeiroApi';

// ── Helpers ────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtData = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  approved:  { label: 'Aprovado',  color: 'text-green-400',  icon: <CheckCircle2 className="w-4 h-4" /> },
  pending:   { label: 'Pendente',  color: 'text-yellow-400', icon: <Clock className="w-4 h-4" /> },
  rejected:  { label: 'Rejeitado', color: 'text-red-400',    icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelado', color: 'text-slate-400',  icon: <XCircle className="w-4 h-4" /> },
};

// ── Componente principal ───────────────────────────────────────────────────

export const FinanceiroPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusQ   = useMpStatus();
  const conectado = statusQ.data?.conectado ?? false;
  const saldoQ    = useMpSaldo(conectado);
  const resumoQ   = useMpResumo(conectado);
  const transQ    = useMpTransacoes(conectado, 20);
  const oauthMut  = useMpOAuthUrl();
  const desconMut = useMpDesconectar();

  // Lê parâmetros de retorno do OAuth
  useEffect(() => {
    const mp  = searchParams.get('mp');
    const msg = searchParams.get('msg');
    if (mp === 'conectado') {
      toast.success('Conta Mercado Pago conectada com sucesso!');
      setSearchParams({});
      statusQ.refetch();
    } else if (mp === 'erro') {
      toast.error(`Erro ao conectar: ${msg ?? 'desconhecido'}`);
      setSearchParams({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConectar = () => {
    oauthMut.mutate(undefined, {
      onSuccess: ({ ok, url }) => {
        if (ok && url) window.location.href = url;
        else toast.error('Não foi possível obter a URL de autorização.');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg
          ?? 'Erro ao conectar com Mercado Pago';
        toast.error(msg);
      },
    });
  };

  const handleDesconectar = () => {
    if (!confirm('Desconectar a conta Mercado Pago?')) return;
    desconMut.mutate(undefined, {
      onSuccess: () => toast.success('Conta desconectada.'),
      onError:   () => toast.error('Erro ao desconectar.'),
    });
  };

  const handleAtualizar = () => {
    saldoQ.refetch();
    resumoQ.refetch();
    transQ.refetch();
  };

  const saldo      = saldoQ.data?.saldo;
  const resumo     = resumoQ.data;
  const transacoes = transQ.data?.transacoes ?? [];
  const isLoading  = saldoQ.isLoading || resumoQ.isLoading;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
            <Wallet className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              FINANCEIRO
            </h1>
            <p className="text-xs text-slate-400">Controle financeiro via Mercado Pago</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conectado && (
            <button
              onClick={handleAtualizar}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 border border-slate-700/50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {!statusQ.isLoading && (
            conectado ? (
              <button
                onClick={handleDesconectar}
                disabled={desconMut.isPending}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Link2Off className="w-4 h-4" />
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConectar}
                disabled={oauthMut.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                <Link2 className="w-4 h-4" />
                {oauthMut.isPending ? 'Aguarde...' : 'Conectar conta MP'}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Conta não conectada ───────────────────────────── */}
      {!conectado && !statusQ.isLoading && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/30 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
            <Wallet className="w-7 h-7 text-slate-500" />
          </div>
          <div>
            <p className="text-slate-300 font-medium mb-1">Nenhuma conta conectada</p>
            <p className="text-slate-500 text-sm">
              Conecte a conta do Mercado Pago do tesoureiro para ver o saldo e movimentações.
            </p>
          </div>
          <button
            onClick={handleConectar}
            disabled={oauthMut.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
          >
            <Link2 className="w-4 h-4" />
            {oauthMut.isPending ? 'Aguarde...' : 'Conectar conta MP'}
          </button>
        </div>
      )}

      {/* ── Dashboard (conta conectada) ───────────────────── */}
      {conectado && (
        <>
          {/* Saldo atual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SaldoCard
              label="Saldo disponível"
              valor={saldo?.disponivel}
              loading={saldoQ.isLoading}
              cor="green"
              icon={<Wallet className="w-5 h-5" />}
              destaque
            />
            <SaldoCard
              label="Saldo total"
              valor={saldo?.total}
              loading={saldoQ.isLoading}
              cor="cyan"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <SaldoCard
              label="Aguardando"
              valor={saldo?.pendente}
              loading={saldoQ.isLoading}
              cor="yellow"
              icon={<Clock className="w-5 h-5" />}
            />
          </div>

          {/* Entradas / Saídas do mês */}
          {resumo && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MesCard
                titulo="Este mês"
                subtitulo={resumo.mes_atual?.label ?? ''}
                data={resumo.mes_atual}
                loading={resumoQ.isLoading}
              />
              <MesCard
                titulo="Mês anterior"
                subtitulo={resumo.mes_anterior?.label ?? ''}
                data={resumo.mes_anterior}
                loading={resumoQ.isLoading}
                opaco
              />
            </div>
          )}

          {/* Transações recentes */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">
                Últimas transações
                {transQ.data?.total != null && (
                  <span className="ml-2 text-xs text-slate-500 font-normal">
                    ({transQ.data.total} total)
                  </span>
                )}
              </h2>
            </div>

            {transQ.isLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Carregando...</div>
            ) : transacoes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma transação encontrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-left">
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium">Data</th>
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium">Pagador</th>
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium">Descrição</th>
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium">Método</th>
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium text-right">Valor</th>
                      <th className="px-4 py-2 text-xs text-slate-500 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transacoes.map(t => <TransacaoRow key={t.id} t={t} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info conta */}
          <p className="text-xs text-slate-600 text-center">
            MP ID: {statusQ.data?.mp_user_id} · Conectado em {fmtData(statusQ.data?.atualizado_em)}
          </p>
        </>
      )}
    </div>
  );
};

// ── Sub-componentes ────────────────────────────────────────────────────────

const SALDO_CORES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  green:  { border: 'border-green-500/30',  bg: 'bg-green-500/5',  text: 'text-green-400',  badge: 'bg-green-500/10' },
  cyan:   { border: 'border-cyan-500/30',   bg: 'bg-cyan-500/5',   text: 'text-cyan-400',   badge: 'bg-cyan-500/10' },
  yellow: { border: 'border-yellow-500/30', bg: 'bg-yellow-500/5', text: 'text-yellow-400', badge: 'bg-yellow-500/10' },
};

const SaldoCard: React.FC<{
  label: string;
  valor?: number;
  loading: boolean;
  cor: string;
  icon: React.ReactNode;
  destaque?: boolean;
}> = ({ label, valor, loading, cor, icon, destaque }) => {
  const c = SALDO_CORES[cor];
  return (
    <div className={`rounded-xl border p-4 ${c.border} ${c.bg} ${destaque ? 'sm:col-span-1 ring-1 ring-green-500/20' : ''}`}>
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${c.badge} ${c.text}`}>
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-white">
        {loading ? <span className="opacity-20">—</span> : BRL(valor ?? 0)}
      </p>
    </div>
  );
};

const MesCard: React.FC<{
  titulo: string;
  subtitulo: string;
  data: MpResumoMes;
  loading: boolean;
  opaco?: boolean;
}> = ({ titulo, subtitulo, data, loading, opaco }) => (
  <div className={`rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-4 ${opaco ? 'opacity-70' : ''}`}>
    <div>
      <p className="text-sm font-semibold text-slate-200">{titulo}</p>
      <p className="text-xs text-slate-500 capitalize">{subtitulo}</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {/* Entradas */}
      <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
        <div className="flex items-center gap-1 text-green-400 text-xs mb-1">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Entrou</span>
        </div>
        <p className="text-lg font-bold text-white">
          {loading ? '—' : BRL(data?.entradas ?? 0)}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {data?.qtd_entradas ?? 0} transações
        </p>
      </div>

      {/* Saídas */}
      <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
        <div className="flex items-center gap-1 text-red-400 text-xs mb-1">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>Saiu</span>
        </div>
        <p className="text-lg font-bold text-white">
          {loading ? '—' : BRL(data?.saidas ?? 0)}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {data?.qtd_saidas ?? 0} transações
        </p>
      </div>
    </div>

    {/* Líquido */}
    <div className="flex items-center justify-between pt-1 border-t border-slate-700/50">
      <span className="text-xs text-slate-400">Líquido do mês</span>
      <span className={`text-sm font-bold ${(data?.liquido ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {loading ? '—' : BRL(data?.liquido ?? 0)}
      </span>
    </div>
  </div>
);

const TransacaoRow: React.FC<{ t: MpTransacao }> = ({ t }) => {
  const st = STATUS_MAP[t.status] ?? { label: t.status, color: 'text-slate-400', icon: null };
  return (
    <tr className="border-b border-slate-700/30 hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap text-xs">
        {fmtData(t.aprovado_em ?? t.criado_em)}
      </td>
      <td className="px-4 py-2.5">
        <p className="text-slate-200 font-medium">{t.pagador || '—'}</p>
        <p className="text-xs text-slate-500">{t.email}</p>
      </td>
      <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[180px] truncate">
        {t.descricao || <span className="opacity-40 italic">sem descrição</span>}
      </td>
      <td className="px-4 py-2.5 text-slate-400 text-xs capitalize">
        {t.metodo || t.tipo}
      </td>
      <td className="px-4 py-2.5 text-right font-semibold text-white whitespace-nowrap">
        {BRL(t.valor)}
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${st.color}`}>
          {st.icon}
          {st.label}
        </span>
      </td>
    </tr>
  );
};
