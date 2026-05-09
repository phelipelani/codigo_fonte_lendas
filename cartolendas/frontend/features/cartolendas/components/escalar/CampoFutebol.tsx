import { LendaCoin, Avatar } from '../shared';
import { JogadorNoCampo } from './JogadorNoCampo';
import { X } from 'lucide-react';

export function CampoFutebol({ escalacao, capitaoId, jogadorObrigatorioId, onRemover, onCapitao, readOnly }: { escalacao: any[]; capitaoId?: number; jogadorObrigatorioId?: number; onRemover: (id: number) => void; onCapitao?: (id: number) => void; readOnly?: boolean }) {
  const goleiro = escalacao.find(e => e.posicao === 'goleiro' && !e.eh_reserva);
  const linha   = escalacao.filter(e => e.posicao === 'linha' && !e.eh_reserva);
  const reserva = escalacao.find(e => e.eh_reserva);

  const Row = ({ jogs, slots, label }: { jogs: any[]; slots: number; label: string }) => (
    <div className="flex justify-center gap-3 sm:gap-8">
      {Array.from({ length: slots }).map((_, i) => {
        const j = jogs[i];
        return (
          <JogadorNoCampo
            key={j?.jogador_id ?? `${label}-${i}`}
            jogador={j}
            label={label}
            isCapitao={j?.jogador_id === capitaoId}
            obrigatorio={j?.jogador_id === jogadorObrigatorioId}
            onRemover={!readOnly && j ? () => onRemover(j.jogador_id) : undefined}
            onCapitao={!readOnly && j && onCapitao ? () => onCapitao(j.jogador_id) : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none border border-emerald-900/40" style={{ background: 'linear-gradient(180deg, #14532d 0%, #166534 45%, #14532d 100%)' }}>
      {/* Marcações do campo */}
      <div className="absolute inset-0 pointer-events-none opacity-15">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-40 h-16 border-b-2 border-x-2 border-white rounded-b-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-20 h-6 border-b-2 border-x-2 border-white rounded-b-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-40 h-16 border-t-2 border-x-2 border-white rounded-t-sm" />
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-6 border-t-2 border-x-2 border-white rounded-t-sm" />
      </div>

      {/* Jogadores */}
      <div className="relative z-10 flex flex-col justify-between py-6 gap-5" style={{ minHeight: 420 }}>
        {/* Formação: 2-2-2 */}
        <Row jogs={linha.slice(4, 6)} slots={2} label="ATA" />
        <Row jogs={linha.slice(2, 4)} slots={2} label="MEI" />
        <Row jogs={linha.slice(0, 2)} slots={2} label="DEF" />
        <div className="flex justify-center">
          <JogadorNoCampo
            jogador={goleiro}
            label="GOL"
            isCapitao={goleiro?.jogador_id === capitaoId}
            obrigatorio={goleiro?.jogador_id === jogadorObrigatorioId}
            onRemover={!readOnly && goleiro ? () => onRemover(goleiro.jogador_id) : undefined}
            onCapitao={!readOnly && goleiro && onCapitao ? () => onCapitao(goleiro.jogador_id) : undefined}
          />
        </div>
      </div>

      {/* Reserva */}
      <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm flex items-center justify-between px-4 py-2.5">
        <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">Reserva</span>
        {reserva ? (
          <div className="flex items-center gap-2">
            <Avatar src={reserva.foto_url ?? reserva.avatar_url} nome={reserva.nome} size={6} />
            <div>
              <p className="text-xs font-semibold text-white">{reserva.nome?.split(' ')[0]}</p>
              <p className="text-[10px] text-yellow-400 flex items-center gap-0.5">{parseFloat(reserva.preco ?? 10).toFixed(1)} <LendaCoin size={9} /></p>
            </div>
            {!readOnly && (
              <button onClick={() => onRemover(reserva.jogador_id)} className="ml-1 text-white/20 hover:text-red-400 transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-white/20">Nenhum selecionado</span>
        )}
      </div>
    </div>
  );
}
