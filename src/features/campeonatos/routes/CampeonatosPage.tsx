// Arquivo: src/features/Campeonatos/routes/CampeonatosPage.tsx
import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCampeonatos } from '@/api/campeonatoApi';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import {
  ChampionshipsHeader,
  ChampionshipSummary,
  CompetitionTypeChart,
  ChampionshipFilters,
  ChampionshipCard,
  CompetitionHistory,
  CompetitionFormatsInfo,
  CompetitionTips
} from '../components/home';

export function CampeonatosPage() {
  const { isAdmin } = useAuth();
  const { data: campeonatos, isLoading, isError } = useCampeonatos();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [formato, setFormato] = useState('todos');
  const [ordem, setOrdem] = useState('recentes');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const filtered = useMemo(() => {
    if (!campeonatos) return [];
    return campeonatos.filter(c => {
      if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (status === 'em_andamento' && (c.fase_atual === 'finalizada' || c.fase_atual === 'finalizado' || c.fase_atual === 'inscricao')) return false;
      if (status === 'finalizados' && (c.fase_atual !== 'finalizada' && c.fase_atual !== 'finalizado')) return false;
      if (formato !== 'todos' && c.formato !== formato) return false;
      return true;
    }).sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome);
      const valA = new Date(a.data || 0).getTime();
      const valB = new Date(b.data || 0).getTime();
      if (ordem === 'antigos') return valA - valB;
      return valB - valA; // recentes
    });
  }, [campeonatos, busca, status, formato, ordem]);

  const visibleItems = filtered.slice(0, page * itemsPerPage);

  const { total, ativos, finalizados, inscricoes } = useMemo(() => {
    if (!campeonatos) return { total: 0, ativos: 0, finalizados: 0, inscricoes: 0 };
    const fin = campeonatos.filter(c => c.fase_atual === 'finalizada' || c.fase_atual === 'finalizado').length;
    return {
      total: campeonatos.length,
      ativos: campeonatos.length - fin,
      finalizados: fin,
      inscricoes: campeonatos.filter(c => c.fase_atual === 'inscricao').length
    };
  }, [campeonatos]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center text-center">
        <AlertCircle size={48} className="text-red-500 mb-4 opacity-50" />
        <h2 className="text-lg font-bold text-white mb-2">Não foi possível carregar os campeonatos.</h2>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <ChampionshipsHeader isAdmin={isAdmin} />
        <ChampionshipSummary total={total} ativos={ativos} finalizados={finalizados} inscricoes={inscricoes} />
        <CompetitionTypeChart campeonatos={campeonatos || []} />
        
        <ChampionshipFilters 
          busca={busca} setBusca={(v) => {setBusca(v); setPage(1);}}
          status={status} setStatus={(v) => {setStatus(v); setPage(1);}}
          formato={formato} setFormato={(v) => {setFormato(v); setPage(1);}}
          ordem={ordem} setOrdem={(v) => {setOrdem(v); setPage(1);}}
        />

        {visibleItems.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-surface/50 p-8 flex flex-col items-center justify-center text-center mb-12">
             <div className="text-4xl mb-4">🏆</div>
             <h3 className="text-lg font-bold text-white">Nenhum campeonato encontrado.</h3>
             <p className="text-sm text-textMuted mt-2 max-w-sm">Tente limpar os filtros ou crie o primeiro campeonato para começar a construir a história do FutLendas.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
              {visibleItems.map((c, i) => (
                <ChampionshipCard key={c.id} campeonato={c} index={i} />
              ))}
            </div>
            {visibleItems.length < filtered.length && (
              <div className="flex justify-center mb-12">
                 <button onClick={() => setPage(p => p + 1)} className="px-6 py-3 rounded-full bg-cyan-600/10 text-cyan-400 font-bold border border-cyan-500/20 hover:bg-cyan-600/20 transition-colors">
                    Carregar Mais...
                 </button>
              </div>
            )}
          </>
        )}

        <CompetitionHistory campeonatos={campeonatos || []} />
        <CompetitionFormatsInfo />
        <CompetitionTips />
      </div>
    </div>
  );
}

export default CampeonatosPage;
