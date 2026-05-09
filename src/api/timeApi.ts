// Arquivo: src/api/timeApi.ts
import { JogadorNoTime, Time } from '@/@types';
import api from './index';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';


const BASE_URL = '/times'; // Lembre que o axios já tem /api base

// --- FETCHES ---
export async function fetchAllTimes(): Promise<Time[]> {
  const { data } = await api.get<Time[]>(BASE_URL);
  return data;
}

export async function fetchJogadoresDoTime(timeId: number): Promise<JogadorNoTime[]> {
  const { data } = await api.get<JogadorNoTime[]>(`${BASE_URL}/${timeId}/jogadores`);
  return data;
}

// --- HOOKS ---
export function useAllTimes() {
  return useQuery<Time[], Error>({
    queryKey: ['times'],
    queryFn: fetchAllTimes,
  });
}

export function useJogadoresDoTime(timeId: number | null) {
  return useQuery<JogadorNoTime[], Error>({
    queryKey: ['times', timeId, 'jogadores'],
    queryFn: () => fetchJogadoresDoTime(timeId!),
    enabled: !!timeId, // Só roda se tiver ID
  });
}

// --- MUTATIONS ---
export function useCreateTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; logo_url?: string }) => {
      const res = await api.post(BASE_URL, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['times'] });
    },
  });
}

export function useAddJogadoresTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ timeId, jogadorIds }: { timeId: number; jogadorIds: number[] }) => {
      await api.post(`${BASE_URL}/${timeId}/jogadores`, { jogador_ids: jogadorIds });
    },
    onSuccess: (_, { timeId }) => {
      queryClient.invalidateQueries({ queryKey: ['times', timeId, 'jogadores'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ timeId, jogadorId, role }: { timeId: number; jogadorId: number; role: { is_capitao?: boolean; is_pe_de_rato?: boolean } }) => {
      await api.put(`${BASE_URL}/${timeId}/jogadores/${jogadorId}/role`, role);
    },
    onSuccess: (_, { timeId }) => {
      queryClient.invalidateQueries({ queryKey: ['times', timeId, 'jogadores'] });
    },
  });
}

export function useRemoveJogadorTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ timeId, jogadorId }: { timeId: number; jogadorId: number }) => {
      await api.delete(`${BASE_URL}/${timeId}/jogadores/${jogadorId}`);
    },
    onSuccess: (_, { timeId }) => {
      queryClient.invalidateQueries({ queryKey: ['times', timeId, 'jogadores'] });
    },
  });
}

// Adicione ao final do arquivo src/api/timeApi.ts

// ... imports existentes ...

// Interface para Update
interface UpdateTimeData {
  id: number;
  nome?: string;
  logo_url?: string;
  criadoEm?: string;
}

export function useUpdateTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateTimeData) => {
      const { id, ...rest } = data;
      const res = await api.put(`${BASE_URL}/${id}`, rest);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['times'] });
    },
  });
}

export function useDeleteTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timeId: number) => {
      // OBS: Backend precisa ter a rota DELETE /times/:id (Se não tiver, avise que criamos)
      // Assumindo que existe baseada no padrão REST
      await api.delete(`${BASE_URL}/${timeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['times'] });
    },
  });
}