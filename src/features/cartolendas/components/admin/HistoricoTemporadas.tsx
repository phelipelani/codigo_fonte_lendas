import { useState, memo } from 'react';
import { Trophy, Calendar, Medal, ChevronDown, ArrowLeft } from 'lucide-react';
import { useTemporadasDisponiveis, useTemporadaRanking } from '@/api/cartolendaApi';
import { DivisaoBadge, LendaCoin } from '../shared';

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

const RankingRow = memo(function RankingRow({ item, index }: { item: any; index: number }) {
  const pos = item.posicao_final || index + 1;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all">
      {/* Posicao */}
      <div className="w-8 text-center shrink-0">
        {pos <= 3 ? (
          <Medal size={18} className={MEDAL_COLORS[pos - 1]} />
        ) : (
          <span className="text-sm font-bold text-white/30">{pos}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">{item.username}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <DivisaoBadge divisao={item.divisao} />
          <span className="text-[10px] text-white/30">{item.rodadas_jogadas} rodadas</span>
        </div>
      </div>

      {/* Pontos */}
      <div className="text-right shrink-0">
        <p className="font-black text-lg text-yellow-400">{parseFloat(item.pontos_total).toFixed(1)}</p>
        <p className="text-[9px] text-white/30">pts totais</p>
      </div>

      {/* Patrimonio */}
      <div className="text-right shrink-0 hidden sm:block">
        <div className="flex items-center gap-1 justify-end">
          <span className="font-bold text-sm text-white/60">{parseFloat(item.patrimonio || 0).toFixed(1)}</span>
          <LendaCoin size={12} />
        </div>
        <p className="text-[9px] text-white/30">patrimonio</p>
      </div>
    </div>
  );
});

export function HistoricoTemporadas({ onClose }: { onClose: () => void }) {
  const { data: temporadasData, isLoading } = useTemporadasDisponiveis();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: rankingData, isLoading: loadingRanking } = useTemporadaRanking(selected);

  const temporadas = temporadasData?.temporadas ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-black text-lg text-white flex items-center gap-2">
            <Calendar size={18} className="text-purple-400" />
            Temporadas Anteriores
          </h2>
          <p className="text-xs text-white/40">Rankings arquivados de temporadas passadas</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-white/30 text-sm">Carregando...</div>
      ) : temporadas.length === 0 ? (
        <div className="text-center py-12 bg-white/[0.03] border border-dashed border-white/10 rounded-2xl">
          <Calendar size={32} className="mx-auto mb-3 text-white/15" />
          <p className="text-white/40 font-semibold mb-1">Nenhuma temporada arquivada</p>
          <p className="text-white/20 text-xs">Quando o admin resetar a temporada, o historico aparecera aqui</p>
        </div>
      ) : (
        <>
          {/* Lista de temporadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {temporadas.map((t) => (
              <button
                key={t.temporada}
                onClick={() => setSelected(selected === t.temporada ? null : t.temporada)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selected === t.temporada
                    ? 'bg-purple-600/20 border-purple-500/40'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-white text-sm flex items-center gap-2">
                      <Trophy size={14} className="text-yellow-400" />
                      {t.temporada}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1">
                      {t.tecnicos} tecnicos | Maior pts: {parseFloat(String(t.maior_pontuacao)).toFixed(1)}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-white/30 transition-transform ${selected === t.temporada ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Ranking da temporada selecionada */}
          {selected && (
            <div className="space-y-2 mt-4">
              <h3 className="font-bold text-white/60 text-sm px-1">
                Ranking Final — {selected}
              </h3>
              {loadingRanking ? (
                <div className="text-center py-6 text-white/30 text-sm">Carregando ranking...</div>
              ) : (
                <div className="space-y-2">
                  {(rankingData?.ranking ?? []).map((item, idx) => (
                    <RankingRow key={item.usuario_id} item={item} index={idx} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
