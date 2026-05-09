import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/api';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partida: any;
}

interface EventoEditavel {
  id: string;
  tipo: 'gol' | 'gol_contra';
  jogador_id: number;
  time_id: number;
  assist_por_jogador_id?: number | null;
  nome_jogador: string;
  nome_assist?: string | null;
}

export function PartidaEditModal({ isOpen, onClose, partida }: Props) {
  const queryClient = useQueryClient();

  // Aceita tanto partida_id (vindo da lista) quanto id (vindo do detalhe)
  const partidaId = partida.partida_id ?? partida.id;

  const [eventos, setEventos] = useState<EventoEditavel[]>([]);
  const [addTimeId, setAddTimeId] = useState('');
  const [addAutorId, setAddAutorId] = useState('');
  const [addAssistId, setAddAssistId] = useState('sem_assist');
  const [tipoGol, setTipoGol] = useState<'gol' | 'gol_contra'>('gol');
  const [loaded, setLoaded] = useState(false);

  const { data: detalhes, isLoading } = useQuery({
    queryKey: ['partida-edit', partidaId],
    queryFn: async () => (await api.get(`/partidas/${partidaId}/detalhes`)).data,
    enabled: isOpen && !!partidaId,
    staleTime: 0,
  });

  // Carrega eventos existentes (só na primeira vez que detalhes chega)
  useEffect(() => {
    if (detalhes && !loaded) {
      const mapped: EventoEditavel[] = (detalhes.eventos || [])
        .filter((e: any) => e.tipo === 'gol' || e.tipo === 'gol_contra')
        .map((e: any) => ({
          id: String(e.id),
          tipo: e.tipo as 'gol' | 'gol_contra',
          jogador_id: Number(e.jogador_id),
          time_id: Number(e.time_id),
          assist_por_jogador_id: e.assist_por_jogador_id ? Number(e.assist_por_jogador_id) : null,
          nome_jogador: e.nome_jogador || 'Desconhecido',
          nome_assist: e.nome_assistente || null,
        }));
      setEventos(mapped);
      setLoaded(true);
    }
  }, [detalhes, loaded]);

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setLoaded(false);
      setEventos([]);
      setAddTimeId('');
      setAddAutorId('');
      setAddAssistId('sem_assist');
    }
  }, [isOpen]);

  const elencoOrganizado = useMemo(() => {
    if (!detalhes) return { timeA: [], timeB: [] };
    return { timeA: detalhes.timeA || [], timeB: detalhes.timeB || [] };
  }, [detalhes]);

  const placarA = eventos.filter(e =>
    (e.tipo === 'gol' && e.time_id === detalhes?.partida.timeA_id) ||
    (e.tipo === 'gol_contra' && e.time_id === detalhes?.partida.timeB_id)
  ).length;

  const placarB = eventos.filter(e =>
    (e.tipo === 'gol' && e.time_id === detalhes?.partida.timeB_id) ||
    (e.tipo === 'gol_contra' && e.time_id === detalhes?.partida.timeA_id)
  ).length;

  const handleAddGol = () => {
    if (!addTimeId || !addAutorId) return;
    const tId = Number(addTimeId);
    const aId = Number(addAutorId);
    const asId = addAssistId === 'sem_assist' ? null : Number(addAssistId);
    const lista = tId === detalhes.partida.timeA_id ? elencoOrganizado.timeA : elencoOrganizado.timeB;
    const autor = lista.find((j: any) => j.jogador_id === aId);
    const assist = asId ? lista.find((j: any) => j.jogador_id === asId) : null;
    setEventos(prev => [...prev, {
      id: `temp-${Date.now()}`,
      tipo: tipoGol,
      time_id: tId,
      jogador_id: aId,
      assist_por_jogador_id: asId,
      nome_jogador: autor?.nome || 'Desconhecido',
      nome_assist: assist?.nome || null,
    }]);
    setAddAutorId('');
    setAddAssistId('sem_assist');
  };

  const handleRemove = (id: string) => setEventos(prev => prev.filter(e => e.id !== id));

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/partidas/${partidaId}`, {
        placar_timeA: placarA,
        placar_timeB: placarB,
        duracao_segundos: detalhes.partida.duracao_segundos || 0,
        eventos: eventos.map(e => ({
          tipo: e.tipo,
          jogador_id: e.jogador_id,
          time_id: e.time_id,
          assist_por_jogador_id: e.assist_por_jogador_id,
          tempo_segundos: 0,
        })),
        timeA_jogadores: elencoOrganizado.timeA.map((j: any) => ({ id: j.jogador_id, ...j })),
        timeB_jogadores: elencoOrganizado.timeB.map((j: any) => ({ id: j.jogador_id, ...j })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partidas'] });
      queryClient.invalidateQueries({ queryKey: ['partida-detalhe'] });
      queryClient.invalidateQueries({ queryKey: ['partida-edit'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Súmula corrigida com sucesso!');
      onClose();
    },
    onError: () => toast.error('Erro ao salvar correções.'),
  });

  if (!isOpen) return null;

  const jogadoresSelect = Number(addTimeId) === detalhes?.partida.timeA_id
    ? elencoOrganizado.timeA : elencoOrganizado.timeB;

  const eventosTimeA = eventos.filter(e =>
    (e.tipo === 'gol' && e.time_id === detalhes?.partida.timeA_id) ||
    (e.tipo === 'gol_contra' && e.time_id === detalhes?.partida.timeB_id)
  );
  const eventosTimeB = eventos.filter(e =>
    (e.tipo === 'gol' && e.time_id === detalhes?.partida.timeB_id) ||
    (e.tipo === 'gol_contra' && e.time_id === detalhes?.partida.timeA_id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-surface border-border sm:max-w-lg max-h-[92vh] overflow-y-auto scrollbar-hide">
        <DialogHeader>
          <DialogTitle className="text-center">Editor de Súmula</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-accentPrimary" size={28} />
          </div>
        ) : !detalhes ? (
          <p className="text-center text-sm text-textMuted py-8">Erro ao carregar partida.</p>
        ) : (
          <>
            {/* PLACAR EM TEMPO REAL */}
            <div className="flex items-center justify-center gap-6 py-4 bg-black/20 rounded-lg border border-white/5 mb-2">
              <div className="text-center w-28">
                <span className="text-xs font-bold text-textMuted block mb-1 truncate">{detalhes.partida.timeA_nome}</span>
                <span className="text-5xl font-black text-white">{placarA}</span>
              </div>
              <span className="text-textMuted font-bold text-lg">×</span>
              <div className="text-center w-28">
                <span className="text-xs font-bold text-textMuted block mb-1 truncate">{detalhes.partida.timeB_nome}</span>
                <span className="text-5xl font-black text-white">{placarB}</span>
              </div>
            </div>

            {/* GOLS LADO A LADO — PRÉ-CARREGADOS */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <GolsColuna
                titulo={detalhes.partida.timeA_nome}
                eventos={eventosTimeA}
                timeAId={detalhes.partida.timeA_id}
                timeBId={detalhes.partida.timeB_id}
                onRemove={handleRemove}
              />
              <GolsColuna
                titulo={detalhes.partida.timeB_nome}
                eventos={eventosTimeB}
                timeAId={detalhes.partida.timeA_id}
                timeBId={detalhes.partida.timeB_id}
                onRemove={handleRemove}
              />
            </div>

            {/* FORMULÁRIO ADICIONAR GOL */}
            <div className="bg-surfaceElevated p-4 rounded-lg border border-border space-y-3">
              <h4 className="text-xs font-bold text-accentPrimary uppercase flex items-center gap-2">
                <Plus size={14} /> Adicionar Gol
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <Select value={addTimeId} onValueChange={(v) => { setAddTimeId(v); setAddAutorId(''); setAddAssistId('sem_assist'); }}>
                  <SelectTrigger className="bg-surface border-border h-9 text-xs">
                    <SelectValue placeholder="Selecione o Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(detalhes.partida.timeA_id)}>{detalhes.partida.timeA_nome}</SelectItem>
                    <SelectItem value={String(detalhes.partida.timeB_id)}>{detalhes.partida.timeB_nome}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tipoGol} onValueChange={(v: any) => setTipoGol(v)}>
                  <SelectTrigger className="bg-surface border-border h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gol">⚽ Gol Normal</SelectItem>
                    <SelectItem value="gol_contra">🥅 Gol Contra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={addAutorId} onValueChange={setAddAutorId} disabled={!addTimeId}>
                  <SelectTrigger className="bg-surface border-border h-9 text-xs">
                    <SelectValue placeholder="Quem marcou?" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {jogadoresSelect.map((j: any) => (
                      <SelectItem key={j.jogador_id} value={String(j.jogador_id)}>{j.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={addAssistId} onValueChange={setAddAssistId} disabled={!addTimeId || tipoGol === 'gol_contra'}>
                  <SelectTrigger className="bg-surface border-border h-9 text-xs">
                    <SelectValue placeholder="Assistência (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    <SelectItem value="sem_assist">Sem Assistência</SelectItem>
                    {jogadoresSelect
                      .filter((j: any) => String(j.jogador_id) !== addAutorId)
                      .map((j: any) => (
                        <SelectItem key={j.jogador_id} value={String(j.jogador_id)}>{j.nome}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                className="w-full bg-accentPrimary text-white h-9"
                onClick={handleAddGol}
                disabled={!addTimeId || !addAutorId}
              >
                <Plus size={14} className="mr-1" /> Adicionar na Súmula
              </Button>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Coluna de gols de um time ────────────────────────────────────────────────
function GolsColuna({ titulo, eventos, timeAId, timeBId, onRemove }: {
  titulo: string;
  eventos: EventoEditavel[];
  timeAId: number;
  timeBId: number;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-white/6 bg-black/20 p-2 min-h-[60px]">
      <p className="text-[9px] font-black uppercase tracking-widest text-textMuted mb-1.5 px-1 truncate">
        {titulo}
      </p>
      {eventos.length === 0 ? (
        <p className="text-[10px] text-textMuted text-center py-2 opacity-40">sem gols</p>
      ) : (
        <div className="space-y-1">
          {eventos.map(ev => (
            <div
              key={ev.id}
              className="flex items-center justify-between px-2 py-1.5 rounded bg-surface border border-borderLight text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex-shrink-0">{ev.tipo === 'gol_contra' ? '🥅' : '⚽'}</span>
                <div className="min-w-0">
                  <p className={`font-bold truncate leading-tight ${ev.tipo === 'gol_contra' ? 'text-red-400' : 'text-white'}`}>
                    {ev.nome_jogador}
                  </p>
                  {ev.nome_assist && (
                    <p className="text-[9px] text-textMuted flex items-center gap-0.5 truncate">
                      <UserPlus size={8} /> {ev.nome_assist}
                    </p>
                  )}
                  {!ev.nome_assist && ev.tipo === 'gol' && (
                    <p className="text-[9px] text-textMuted/40 italic">sem assist registrada</p>
                  )}
                  {ev.tipo === 'gol_contra' && (
                    <p className="text-[9px] text-red-400/60">contra</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(ev.id)}
                className="ml-1 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}