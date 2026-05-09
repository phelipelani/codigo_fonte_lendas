import { ArrowLeft } from 'lucide-react';
import { useEscalacaoTecnico } from '@/api/cartolendaApi';
import { Avatar, LendaCoin } from '../shared';
import { CampoFutebol } from '../escalar/CampoFutebol';
import { cn } from '@/lib/utils';

export function EscalacaoTecnico({ rodadaId, userId, onVoltar }: { rodadaId: number; userId: number; onVoltar: () => void }) {
  const { data, isLoading } = useEscalacaoTecnico(rodadaId, userId);

  if (isLoading) return <div className="text-center py-12 text-white/30">Carregando escalacao...</div>;
  if (!data) return <div className="text-center py-12 text-white/30">Nenhuma escalacao encontrada</div>;

  const escalacao = data.escalacao ?? [];
  const tecnico = data.tecnico;
  const totalPontos = parseFloat(data.total_pontos ?? 0);
  const patrimonio = parseFloat(data.patrimonio ?? 0);

  return (
    <div className="space-y-4">
      <button onClick={onVoltar} className="text-xs text-white/30 hover:text-white flex items-center gap-1 transition-colors">
        <ArrowLeft size={12} /> Voltar ao ranking
      </button>

      {tecnico && (
        <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={tecnico.foto_url ?? tecnico.avatar_url} nome={tecnico.jogador_nome ?? tecnico.username} size={12} />
            <div>
              <p className="font-black text-white text-lg">{tecnico.jogador_nome ?? tecnico.username}</p>
              <p className="text-xs text-white/40">Rodada {data.rodada_numero ?? rodadaId}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl text-purple-400">{totalPontos.toFixed(1)} pts</p>
            {patrimonio > 0 && <p className="text-xs text-yellow-400 font-bold">{patrimonio.toFixed(1)} <LendaCoin size={11} className="inline" /></p>}
          </div>
        </div>
      )}

      <CampoFutebol
        escalacao={escalacao}
        capitaoId={data.capitao_id}
        onRemover={() => {}}
        readOnly
      />

      {/* Detalhes dos jogadores */}
      {escalacao.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="font-bold text-xs text-white/50 uppercase">Detalhes da Escalacao</p>
          </div>
          <div className="divide-y divide-white/5">
            {escalacao.map((e: any) => {
              const pts = parseFloat(e.pontos_obtidos ?? 0);
              const ehCapitao = e.jogador_id === data.capitao_id;
              return (
                <div key={e.jogador_id} className="flex items-center gap-2 px-3 py-2">
                  <Avatar src={e.foto_url ?? e.avatar_url} nome={e.nome} size={7} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {e.nome} {ehCapitao && <span className="text-yellow-400">C</span>} {e.eh_reserva ? <span className="text-white/30">(R)</span> : ''}
                    </p>
                    <p className="text-[10px] text-white/30 capitalize">{e.posicao}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-yellow-400">{parseFloat(e.preco ?? 10).toFixed(1)} <LendaCoin size={9} className="inline" /></p>
                  </div>
                  <p className={cn('font-black text-sm shrink-0 w-14 text-right', pts > 0 ? 'text-emerald-400' : pts < 0 ? 'text-red-400' : 'text-white/30')}>
                    {pts.toFixed(1)} pts
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
