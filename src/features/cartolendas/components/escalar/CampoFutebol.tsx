import { LendaCoin, Avatar, PosicaoBadge } from '../shared';
import { JogadorNoCampo } from './JogadorNoCampo';
import { X, Shield } from 'lucide-react';
import { getPosicaoTipo } from '@/@types/cartolendas';

export function CampoFutebol({ escalacao, capitaoId, jogadorObrigatorioId, onRemover, onCapitao, readOnly, calculado }: {
  escalacao: any[];
  capitaoId?: number;
  jogadorObrigatorioId?: number;
  onRemover: (id: number) => void;
  onCapitao?: (id: number) => void;
  readOnly?: boolean;
  /** Se a rodada já foi calculada, mostra pontos em vez de preço */
  calculado?: boolean;
}) {
  const goleiro = escalacao.find(e => e.posicao === 'goleiro' && !e.eh_reserva);
  const linha   = escalacao.filter(e => e.posicao === 'linha' && !e.eh_reserva);
  const reserva = escalacao.find(e => e.eh_reserva);

  // Total de pontos do time (soma)
  const totalPontos = calculado
    ? escalacao.reduce((s, j) => s + (parseFloat(j.pontos_obtidos ?? 0)), 0)
    : null;

  const Row = ({ jogs, slots, label, posLabel }: { jogs: any[]; slots: number; label: string; posLabel: string }) => (
    <div className="flex justify-center gap-4 sm:gap-10">
      {Array.from({ length: slots }).map((_, i) => {
        const j = jogs[i];
        return (
          <JogadorNoCampo
            key={j?.jogador_id ?? `${label}-${i}`}
            jogador={j}
            label={posLabel}
            isCapitao={j?.jogador_id === capitaoId}
            obrigatorio={j?.jogador_id === jogadorObrigatorioId}
            onRemover={!readOnly && j ? () => onRemover(j.jogador_id) : undefined}
            onCapitao={!readOnly && j && onCapitao ? () => onCapitao(j.jogador_id) : undefined}
            pontosRodada={calculado ? parseFloat(j?.pontos_obtidos ?? 0) : null}
          />
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none border border-emerald-900/40 shadow-xl shadow-emerald-900/20" style={{ background: 'linear-gradient(180deg, #14532d 0%, #166534 40%, #15803d 60%, #14532d 100%)' }}>
      {/* Marcações do campo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-44 h-16 border-b-2 border-x-2 border-white rounded-b-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-6 border-b-2 border-x-2 border-white rounded-b-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-44 h-16 border-t-2 border-x-2 border-white rounded-t-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-6 border-t-2 border-x-2 border-white rounded-t-sm" />
        {/* Arcos */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[64px] w-16 h-8 border-b-2 border-white rounded-b-full" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[64px] w-16 h-8 border-t-2 border-white rounded-t-full" />
      </div>

      {/* Pontuação total (quando calculado) */}
      {calculado && totalPontos !== null && (
        <div className="absolute top-3 right-3 z-20 bg-black/50 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
          <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider">Total</p>
          <p className={`text-lg font-black ${totalPontos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPontos.toFixed(1)}
          </p>
        </div>
      )}

      {/* Jogadores */}
      <div className="relative z-10 flex flex-col justify-between py-7 gap-5" style={{ minHeight: 440 }}>
        {/* Formação: 2-2-2 + GOL */}
        <Row jogs={linha.slice(4, 6)} slots={2} label="ATA" posLabel="ATA" />
        <Row jogs={linha.slice(2, 4)} slots={2} label="MEI" posLabel="MEI" />
        <Row jogs={linha.slice(0, 2)} slots={2} label="DEF" posLabel="ZAG" />
        <div className="flex justify-center">
          <JogadorNoCampo
            jogador={goleiro}
            label="GOL"
            isCapitao={goleiro?.jogador_id === capitaoId}
            obrigatorio={goleiro?.jogador_id === jogadorObrigatorioId}
            onRemover={!readOnly && goleiro ? () => onRemover(goleiro.jogador_id) : undefined}
            onCapitao={!readOnly && goleiro && onCapitao ? () => onCapitao(goleiro.jogador_id) : undefined}
            pontosRodada={calculado ? parseFloat(goleiro?.pontos_obtidos ?? 0) : null}
          />
        </div>
      </div>

      {/* Reserva */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-white/30" />
          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Reserva</span>
        </div>
        {reserva ? (
          <div className="flex items-center gap-2.5">
            <Avatar src={reserva.foto_url ?? reserva.avatar_url} nome={reserva.nome} size={7} className="ring-1 ring-white/10" />
            <div>
              <p className="text-xs font-bold text-white">{reserva.nome?.split(' ')[0]}</p>
              <div className="flex items-center gap-1">
                <PosicaoBadge tipo={getPosicaoTipo(reserva.posicao_real ?? reserva.posicao, reserva.joga_recuado)} className="text-[6px] px-1 py-0" />
                <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-0.5">
                  <LendaCoin size={9} />
                  {parseFloat(reserva.preco ?? reserva.preco_atual ?? 10).toFixed(1)}
                </span>
              </div>
            </div>
            {!readOnly && (
              <button onClick={() => onRemover(reserva.jogador_id)} className="ml-1 text-white/20 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-white/20 italic">Selecione um reserva</span>
        )}
      </div>
    </div>
  );
}
