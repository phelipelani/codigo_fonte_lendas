// Arquivo: src/features/presenca/components/RachaMensagensTab.tsx
import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Calendar,
  CreditCard,
  Megaphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  useDispararConvocacao,
  useDispararRenovacao,
  useDispararRenovacaoCompetencia,
  useDispararComunicadoRacha,
  type RachaSessaoAtiva,
} from '../api/presencaApi';

interface RachaMensagensTabProps {
  rachaId: number;
  sessaoAtiva: RachaSessaoAtiva | null;
  totalConvocados: number;
  totalMensalistas: number;
  selecionadosAvulsos: Set<number>;
}

type TipoMensagem = 'semanal' | 'mensal' | 'comunicado';

export const RachaMensagensTab: React.FC<RachaMensagensTabProps> = ({
  rachaId,
  sessaoAtiva,
  totalConvocados,
  totalMensalistas,
  selecionadosAvulsos,
}) => {
  const [tipoAtivo, setTipoAtivo] = React.useState<TipoMensagem>('semanal');

  // Hooks de disparo
  const sessaoId = sessaoAtiva?.id;
  const dispararConvocacaoMut = useDispararConvocacao(rachaId, sessaoId);
  const dispararRenovacaoMut = useDispararRenovacao(rachaId, sessaoId);
  const dispararRenovacaoCompMut = useDispararRenovacaoCompetencia(rachaId);
  const dispararComunicadoMut = useDispararComunicadoRacha(rachaId, sessaoId);

  // Estados dos formulários
  // Opção A
  const [usarRotacaoPadrao, setUsarRotacaoPadrao] = React.useState(true);
  const [variacaoPreviewIdx, setVariacaoPreviewIdx] = React.useState(0);
  const [textoConvocacao, setTextoConvocacao] = React.useState('');

  const VARIACOES_PADRAO = [
    {
      titulo: 'Variação 1 (Clássica)',
      texto: "Fala {apelido}, beleza?\n\nVocê foi convocado para o racha *{nome_racha}* do dia *{data}*!\n\nResponda com uma dessas opções:\n*SIM* - Tô dentro!\n*NÃO* - Dessa vez não consigo\n*DEPOIS* - Confirmo mais tarde",
    },
    {
      titulo: 'Variação 2 (Direta & Esportiva)',
      texto: "Opa {apelido}! Convocação oficial para a rodada do racha *{nome_racha}*!\n\n📅 Data: *{data}*\n⏰ Horário: *{horario}*\n📍 Local: *{local}*\n\nPodemos contar com você na partida?\n*SIM* - Presença confirmada\n*NÃO* - Não posso ir\n*DEPOIS* - Aviso em breve",
    },
    {
      titulo: 'Variação 3 (Descontraída)',
      texto: "E aí {apelido}, tudo certo? Bora pra mais um jogo do racha *{nome_racha}*!\n\nDia *{data}* às *{horario}* no *{local}*.\n\nResponda diretamente:\n*SIM* - Tô dentro!\n*NÃO* - Não consigo ir\n*DEPOIS* - Decido mais tarde",
    },
  ];

  // Opção B (Organizada por competência YYYY-MM desacoplada de sessões)
  const [competencia, setCompetencia] = React.useState(new Date().toISOString().slice(0, 7));
  const [valorMensalidade, setValorMensalidade] = React.useState('50.00');
  const [chavePix, setChavePix] = React.useState('');
  const [instrucoesPix, setInstrucoesPix] = React.useState('Favor enviar o comprovante após a transferência.');

  // Opção C
  const [mensagemComunicado, setMensagemComunicado] = React.useState('');
  const [alvoComunicado, setAlvoComunicado] = React.useState<'todos' | 'mensalistas' | 'selecionados'>('todos');

  const sessaoDisponivel = !!sessaoId && sessaoAtiva.status !== 'cancelada' && sessaoAtiva.status !== 'concluida';

  const previewTemplate = (template: string) => {
    return template
      .replace(/{apelido}/g, 'Camisa 10')
      .replace(/{nome}/g, 'Pelé Carlos')
      .replace(/{data}/g, sessaoAtiva?.data_racha ? new Date(sessaoAtiva.data_racha + 'T12:00:00').toLocaleDateString('pt-BR') : '25/10/2026')
      .replace(/{horario}/g, '20:00')
      .replace(/{local}/g, 'Arena FutLendas')
      .replace(/{nome_racha}/g, 'FutLendas');
  };

  // Preview Opção A
  const previewA = usarRotacaoPadrao
    ? previewTemplate(VARIACOES_PADRAO[variacaoPreviewIdx]?.texto ?? '')
    : previewTemplate(textoConvocacao.trim() || VARIACOES_PADRAO[0].texto);

  // Preview Opção B
  const previewB = `📋 *RENOVAÇÃO DA MENSALIDADE (${competencia})*\nValor: R$ ${valorMensalidade}\nChave PIX: ${chavePix || '(Informe a chave)'}\n${instrucoesPix}\n\n👉 Responda com *RENOVAR SIM* após realizar o pagamento\n👉 Responda com *RENOVAR NÃO* se não desejar renovar`;

  const handleDispararSemanal = () => {
    if (!sessaoDisponivel) return;
    if (
      !confirm(
        `Deseja disparar a convocação semanal para ${totalConvocados} participantes da sessão #${sessaoId}?`
      )
    )
      return;

    dispararConvocacaoMut.mutate({
      texto_personalizado: !usarRotacaoPadrao && textoConvocacao.trim() ? textoConvocacao.trim() : undefined,
    });
  };

  const handleDispararRenovacao = () => {
    if (!competencia) {
      alert('Informe o mês de competência (YYYY-MM).');
      return;
    }
    if (
      !confirm(
        `Deseja disparar a cobrança/renovação de mensalidade da competência ${competencia} para os ${totalMensalistas} mensalistas cadastrados? (Mensalistas já notificados nesta competência serão pulados automaticamente).`
      )
    )
      return;

    dispararRenovacaoCompMut.mutate({
      competencia,
      valor_mensalidade: parseFloat(valorMensalidade) || undefined,
      chave_pix: chavePix.trim() || undefined,
      instrucoes: instrucoesPix.trim() || undefined,
    });
  };

  const handleDispararComunicado = () => {
    if (!sessaoDisponivel) return;
    if (!mensagemComunicado.trim()) {
      alert('Digite o texto do comunicado.');
      return;
    }

    const destinatarios =
      alvoComunicado === 'selecionados' ? Array.from(selecionadosAvulsos) : undefined;

    if (
      !confirm(
        `Confirmar envio do comunicado para os destinatários (${alvoComunicado})?`
      )
    )
      return;

    dispararComunicadoMut.mutate({
      mensagem: mensagemComunicado.trim(),
      destinatarios,
    });
  };

  return (
    <div className="space-y-6">
      {/* Seletor dos 3 fluxos de mensagem */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setTipoAtivo('semanal')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            tipoAtivo === 'semanal'
              ? 'border-emerald-400 bg-emerald-500/15 shadow-md ring-1 ring-emerald-400/50'
              : 'border-cyan-500/20 bg-[#0a1628]/50 hover:bg-[#0a1628]/80'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Opção A: Confirmação Semanal</h4>
              <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
                RACHA SIM / RACHA NÃO
              </span>
            </div>
          </div>
          <p className="text-xs text-cyan-100/60">
            Convocação dos titulares e avulsos para a próxima partida da semana.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTipoAtivo('mensal')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            tipoAtivo === 'mensal'
              ? 'border-amber-400 bg-amber-500/15 shadow-md ring-1 ring-amber-400/50'
              : 'border-cyan-500/20 bg-[#0a1628]/50 hover:bg-[#0a1628]/80'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Opção B: Renovação Mensal</h4>
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">
                RENOVAR SIM / RENOVAR NÃO
              </span>
            </div>
          </div>
          <p className="text-xs text-cyan-100/60">
            Cobrança de mensalidade com chave PIX e renovação periódica.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTipoAtivo('comunicado')}
          className={cn(
            'p-4 rounded-2xl border text-left transition-all',
            tipoAtivo === 'comunicado'
              ? 'border-cyan-400 bg-cyan-500/15 shadow-md ring-1 ring-cyan-400/50'
              : 'border-cyan-500/20 bg-[#0a1628]/50 hover:bg-[#0a1628]/80'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Opção C: Comunicado Livre</h4>
              <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">
                Informativo Geral
              </span>
            </div>
          </div>
          <p className="text-xs text-cyan-100/60">
            Avisos de chuva, alterações de horário e recados personalizados.
          </p>
        </button>
      </div>

      {!sessaoDisponivel && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <span>
            Não há uma sessão de racha ativa no momento para envio de mensagens automáticas. Crie
            ou selecione uma sessão na aba Fila & Presença.
          </span>
        </div>
      )}

      {/* Painel da Opção A: Confirmação Semanal */}
      {tipoAtivo === 'semanal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md">
            <div>
              <h3 className="font-bold text-white text-base">Configurar Convocação Semanal</h3>
              <p className="text-xs text-cyan-100/60 mt-0.5">
                Mensagem enviada aos convocados da sessão com instrução de resposta (SIM, NÃO, DEPOIS, CANCELAR).
              </p>
            </div>

            {/* Alternador de Modo: Rotação vs Personalizado */}
            <div className="flex rounded-xl bg-[#0d1f35] p-1 border border-cyan-500/20 text-xs">
              <button
                type="button"
                onClick={() => setUsarRotacaoPadrao(true)}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all',
                  usarRotacaoPadrao
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-cyan-100/60 hover:text-white'
                )}
              >
                Rotação Automática (3 Variações)
              </button>
              <button
                type="button"
                onClick={() => setUsarRotacaoPadrao(false)}
                className={cn(
                  'flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all',
                  !usarRotacaoPadrao
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-cyan-100/60 hover:text-white'
                )}
              >
                Mensagem Customizada
              </button>
            </div>

            <div className="space-y-3">
              {usarRotacaoPadrao ? (
                <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-xs text-cyan-100/80 space-y-2">
                  <div className="font-semibold text-cyan-200">
                    Rotação Ativa para Proteção Anti-Bloqueio:
                  </div>
                  <p>
                    O sistema alterna automaticamente entre 3 modelos de saudações e formatos
                    a cada jogador convocado, personalizando com o apelido e horário do jogo para
                    evitar filtros de spam do WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-cyan-100/70">
                      Texto com Variáveis
                    </label>
                    <span className="text-[10px] text-cyan-100/50">Clique para inserir:</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {['{nome}', '{apelido}', '{data}', '{horario}', '{local}'].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setTextoConvocacao((prev) => `${prev} ${chip} `)}
                        className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:bg-cyan-500/25"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <Textarea
                    value={textoConvocacao}
                    onChange={(e) => setTextoConvocacao(e.target.value)}
                    placeholder="Ex: Fala {apelido}, convocado para {data} às {horario} em {local}..."
                    rows={4}
                    className="bg-[#0d1f35] border-cyan-500/20 text-white text-xs"
                  />
                  <p className="text-[11px] text-cyan-100/50">
                    Dica: As instruções *SIM* e *NÃO* serão preservadas automaticamente se não forem incluídas.
                  </p>
                </div>
              )}

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Desambiguação e Desistência Ativas
                </div>
                <p>
                  Suporta <strong>SIM</strong>, <strong>NÃO</strong>, <strong>DEPOIS</strong> e <strong>CANCELAR</strong>.
                  Caso o atleta confirme e desista posteriormente via WhatsApp (inclusive após o fechamento da convocação),
                  a vaga é liberada e o 1º da fila de espera é promovido e notificado automaticamente.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleDispararSemanal}
                  disabled={!sessaoDisponivel || dispararConvocacaoMut.isPending}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-11"
                >
                  {dispararConvocacaoMut.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disparando Convocação...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Disparar Convocação ({totalConvocados} jogadores)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview no WhatsApp */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#05111e] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-cyan-100/50 font-semibold">
                  Pré-visualização da mensagem
                </span>
                {usarRotacaoPadrao && (
                  <div className="flex gap-1">
                    {VARIACOES_PADRAO.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setVariacaoPreviewIdx(idx)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold transition-all',
                          variacaoPreviewIdx === idx
                            ? 'bg-emerald-500 text-black'
                            : 'bg-white/10 text-white/60 hover:text-white'
                        )}
                      >
                        Var {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-[#0b202c] border border-cyan-500/20 p-4 text-xs sm:text-sm text-cyan-100/90 whitespace-pre-wrap font-sans shadow-inner">
                {previewA}
              </div>
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-cyan-500/10">
              <p className="text-[11px] text-cyan-100/40">
                Cada participante recebe a mensagem individualizada no seu WhatsApp com seu nome e apelido.
              </p>
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/40 p-2 text-[10px] text-cyan-100/60 space-y-0.5">
                <span className="font-semibold text-slate-300">Nota sobre Botões WhatsApp:</span>
                <p>
                  O protocolo WhatsApp (Baileys) possui instabilidade conhecida com botões interativos nativos.
                  Por confiabilidade máxima, o bot opera via palavras-chave textuais reconhecidas por IA/expressões (SIM, NÃO, DEPOIS, CANCELAR).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel da Opção B: Renovação Mensal */}
      {tipoAtivo === 'mensal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md">
            <div>
              <h3 className="font-bold text-white text-base">Cobrança e Renovação Mensal</h3>
              <p className="text-xs text-cyan-100/60 mt-0.5">
                Envio periódico para os {totalMensalistas} mensalistas cadastrados no racha.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                  Mês de Competência (YYYY-MM) *
                </label>
                <Input
                  type="month"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  className="bg-[#0d1f35] border-cyan-500/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Valor Mensalidade (R$)
                  </label>
                  <Input
                    value={valorMensalidade}
                    onChange={(e) => setValorMensalidade(e.target.value)}
                    placeholder="50.00 (opcional)"
                    className="bg-[#0d1f35] border-cyan-500/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                    Chave PIX (opcional)
                  </label>
                  <Input
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Padrão do racha se vazio"
                    className="bg-[#0d1f35] border-cyan-500/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                  Instruções Adicionais (opcional)
                </label>
                <Input
                  value={instrucoesPix}
                  onChange={(e) => setInstrucoesPix(e.target.value)}
                  placeholder="Instruções para conferência do pagamento"
                  className="bg-[#0d1f35] border-cyan-500/20 text-white"
                />
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200/90 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Instrução Explícita de Renovação por Competência
                </div>
                <p>
                  A mensagem exige a resposta <strong>"RENOVAR SIM"</strong> ou <strong>"RENOVAR NÃO"</strong>.
                  Isso impede que respostas afirmativas de convocação do racha sejam confundidas com pagamento de mensalidade.
                  Mensalistas já notificados na competência {competencia} serão preservados sem cobrança duplicada.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleDispararRenovacao}
                  disabled={dispararRenovacaoCompMut.isPending}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold h-11"
                >
                  {dispararRenovacaoCompMut.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disparando Cobrança...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Disparar Renovação ({totalMensalistas} mensalistas)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview no WhatsApp */}
          <div className="rounded-2xl border border-cyan-500/20 bg-[#05111e] p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest text-cyan-100/50 font-semibold mb-3 block">
                Pré-visualização da mensagem no WhatsApp
              </span>
              <div className="rounded-2xl bg-[#0b202c] border border-cyan-500/20 p-4 text-xs sm:text-sm text-cyan-100/90 whitespace-pre-wrap font-sans shadow-inner">
                {previewB}
              </div>
            </div>
            <p className="text-[11px] text-cyan-100/40 mt-4">
              O status de mensalidade dos jogadores que responderem será mantido atualizado.
            </p>
          </div>
        </div>
      )}

      {/* Painel da Opção C: Comunicado Livre */}
      {tipoAtivo === 'comunicado' && (
        <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-[#0a1628]/60 p-5 backdrop-blur-md max-w-2xl">
          <div>
            <h3 className="font-bold text-white text-base">Enviar Comunicado Geral</h3>
            <p className="text-xs text-cyan-100/60 mt-0.5">
              Dispare avisos avulsos sobre o racha com rate limiting automático para proteção do WhatsApp.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                Destinatários
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                  <input
                    type="radio"
                    name="alvo"
                    checked={alvoComunicado === 'todos'}
                    onChange={() => setAlvoComunicado('todos')}
                  />
                  Todos os participantes
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                  <input
                    type="radio"
                    name="alvo"
                    checked={alvoComunicado === 'mensalistas'}
                    onChange={() => setAlvoComunicado('mensalistas')}
                  />
                  Apenas Mensalistas
                </label>
                <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                  <input
                    type="radio"
                    name="alvo"
                    checked={alvoComunicado === 'selecionados'}
                    onChange={() => setAlvoComunicado('selecionados')}
                  />
                  Selecionados ({selecionadosAvulsos.size})
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-100/70 mb-1">
                Texto do Comunicado *
              </label>
              <Textarea
                value={mensagemComunicado}
                onChange={(e) => setMensagemComunicado(e.target.value)}
                placeholder="Ex: Atenção galera, o jogo hoje começará 30 minutos mais tarde devido à manutenção do campo!"
                rows={4}
                className="bg-[#0d1f35] border-cyan-500/20 text-white text-xs sm:text-sm"
              />
            </div>

            <Button
              onClick={handleDispararComunicado}
              disabled={!sessaoDisponivel || !mensagemComunicado.trim() || dispararComunicadoMut.isPending}
              className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold h-11"
            >
              {dispararComunicadoMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando Comunicado...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Comunicado Agora
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
