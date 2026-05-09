/**
 * Hook de eventos em tempo real para o Cartolendas.
 *
 * Faz polling leve a cada 10s no endpoint /cartolendas/events,
 * invalida caches React Query automaticamente e mostra toasts.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';

interface CartolendaEvent {
  id: number;
  tipo: string;
  payload: Record<string, any> | null;
  created_at: string;
}

interface EventsResponse {
  events: CartolendaEvent[];
  server_time: string;
}

// Mapa: tipo do evento → query keys para invalidar
const INVALIDATION_MAP: Record<string, string[][]> = {
  rodada_finalizada: [
    ['cartolendas', 'ranking'],
    ['cartolendas', 'meu-time'],
    ['cartolendas', 'mercado'],
    ['cartolendas', 'historico'],
    ['cartolendas', 'stats-rodada'],
    ['cartolendas', 'ranking-rodada'],
    ['cartolendas', 'meu-patrimonio'],
    ['cartolendas', 'meu-historico'],
  ],
  precos_atualizados: [
    ['cartolendas', 'mercado'],
    ['cartolendas', 'meu-patrimonio'],
    ['cartolendas', 'stats-mercado'],
    ['cartolendas', 'historico-jogadores'],
  ],
  ranking_atualizado: [
    ['cartolendas', 'ranking'],
    ['cartolendas', 'ranking-rodada'],
  ],
  temporada_reset: [
    ['cartolendas'], // invalida TUDO do cartolendas
  ],
  transferencia: [
    ['cartolendas', 'mercado'],
    ['cartolendas', 'ranking'],
  ],
  escalacao_salva: [
    ['cartolendas', 'mercado'],
    ['cartolendas', 'ranking'],
  ],
};

// Mensagens toast por tipo de evento
const TOAST_MESSAGES: Record<string, string> = {
  rodada_finalizada: 'Rodada finalizada! Ranking atualizado.',
  precos_atualizados: 'Precos dos jogadores atualizados!',
  temporada_reset: 'Nova temporada iniciada! Rankings resetados.',
};

export function useCartolendaEvents() {
  const qc = useQueryClient();
  const lastCheckRef = useRef<string | null>(null); // null = primeira chamada, backend calcula
  const processedIdsRef = useRef<Set<number>>(new Set());

  const { data } = useQuery<EventsResponse>({
    queryKey: ['cartolendas', 'events', 'poll'],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (lastCheckRef.current) params.since = lastCheckRef.current;
      const { data } = await api.get('/cartolendas/events', { params });
      return data;
    },
    refetchInterval: 20_000, // Polling a cada 20 segundos
    refetchIntervalInBackground: false, // Para quando a aba não está ativa
    staleTime: 5_000,
  });

  const processEvents = useCallback((events: CartolendaEvent[]) => {
    if (!events?.length) return;

    for (const event of events) {
      // Evita processar o mesmo evento duas vezes
      if (processedIdsRef.current.has(event.id)) continue;
      processedIdsRef.current.add(event.id);

      // Invalidar queries relevantes
      const queryKeys = INVALIDATION_MAP[event.tipo];
      if (queryKeys) {
        for (const key of queryKeys) {
          qc.invalidateQueries({ queryKey: key });
        }
      }

      // Toast para eventos importantes
      const message = TOAST_MESSAGES[event.tipo];
      if (message) {
        toast.info(message, { duration: 5000 });
      }
    }

    // Atualiza lastCheck para o evento mais recente
    const latest = events[events.length - 1];
    if (latest) {
      lastCheckRef.current = latest.created_at;
    }

    // Limpa IDs processados antigos (mantém últimos 200)
    if (processedIdsRef.current.size > 200) {
      const arr = Array.from(processedIdsRef.current);
      processedIdsRef.current = new Set(arr.slice(-100));
    }
  }, [qc]);

  useEffect(() => {
    if (data?.events) {
      processEvents(data.events);
    }
    // Atualiza server_time como fallback
    if (data?.server_time) {
      lastCheckRef.current = data.server_time;
    }
  }, [data, processEvents]);
}
