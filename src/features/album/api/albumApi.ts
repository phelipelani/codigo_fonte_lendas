// Arquivo: src/features/album/api/albumApi.ts
//
// Hooks React Query para o Album de Figurinhas.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/api';

// =============================================================
// Tipos
// =============================================================

export type Raridade = 'comum' | 'lendaria';
export type CategoriaFigurinha = 'jogador' | 'etiqueta' | 'escudo' | 'estatistica' | 'foto';
export type TipoPagina =
  | 'capa'
  | 'narrativa'
  | 'rede'
  | 'numeros'
  | 'copa'
  | 'campeonato'
  | 'escudos'
  | 'agradecimento';

export type Figurinha = {
  id: number;
  numero: number;
  nome: string;
  descricao: string | null;
  categoria: CategoriaFigurinha;
  raridade: Raridade;
  imagem_url: string | null;
  pagina_id: number | null;
  slot: number | null;
  ativa?: 0 | 1 | boolean;
  // Anexado em /album/meu:
  quantidade?: number;
  obtida?: boolean;
  repetida?: boolean;
  // Anexado ao abrir pacote:
  era_repetida?: boolean;
};

export type Pagina = {
  id: number;
  numero: number;
  tipo: TipoPagina;
  titulo: string | null;
  subtitulo: string | null;
  subtitulo_cor: string | null;
  tag: string | null;
  data_referencia: string | null;
  texto: string | null;
  meta_json: Record<string, unknown> | null;
};

export type Progresso = {
  total: number;
  obtidas: number;
  faltam: number;
  percentual: number;
};

export type MeuAlbumResponse = {
  ok: boolean;
  paginas: Pagina[];
  figurinhas: Figurinha[];
  progresso: Progresso;
  pacotes_fechados: number;
};

export type Pacote = {
  id: number;
  tipo: string;
  motivo: string | null;
  status: 'fechado' | 'aberto';
  criado_em: string;
  aberto_em: string | null;
};

// =============================================================
// Album do usuário
// =============================================================

export const useMeuAlbum = () =>
  useQuery<MeuAlbumResponse>({
    queryKey: ['album', 'meu'],
    queryFn: async () => (await api.get('/album/meu')).data,
  });

// =============================================================
// Pacotes
// =============================================================

export const useMeusPacotes = () =>
  useQuery<{ ok: boolean; pacotes: Pacote[] }>({
    queryKey: ['album', 'pacotes'],
    queryFn: async () => (await api.get('/album/pacotes')).data,
  });

export const useAbrirPacote = () => {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; figurinhas: Figurinha[] }, any, number>({
    mutationFn: async (pacoteId) =>
      (await api.post(`/album/pacotes/${pacoteId}/abrir`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', 'meu'] });
      qc.invalidateQueries({ queryKey: ['album', 'pacotes'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao abrir pacote'),
  });
};

// =============================================================
// WhatsApp (vínculo)
// =============================================================

export const useMeuWhatsapp = () =>
  useQuery<{ ok: boolean; whatsapp: string | null }>({
    queryKey: ['album', 'whatsapp'],
    queryFn: async () => (await api.get('/album/whatsapp')).data,
  });

export const useVincularWhatsapp = () => {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean; whatsapp: string }, any, string>({
    mutationFn: async (whatsapp) =>
      (await api.put('/album/whatsapp', { whatsapp })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', 'whatsapp'] });
      toast.success('WhatsApp vinculado!');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao vincular WhatsApp'),
  });
};

// =============================================================
// Admin — catálogo de figurinhas
// =============================================================

export const useFigurinhas = () =>
  useQuery<{ ok: boolean; figurinhas: Figurinha[] }>({
    queryKey: ['album', 'figurinhas'],
    queryFn: async () => (await api.get('/album/figurinhas')).data,
  });

export const usePaginas = () =>
  useQuery<{ ok: boolean; paginas: Pagina[] }>({
    queryKey: ['album', 'paginas'],
    queryFn: async () => (await api.get('/album/paginas')).data,
  });

export type NovaFigurinha = {
  numero: number;
  nome: string;
  descricao?: string;
  categoria: CategoriaFigurinha;
  raridade: Raridade;
  imagem_url?: string | null;
  pagina_id?: number | null;
  slot?: number | null;
};

export const useCriarFigurinha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fig: NovaFigurinha) =>
      (await api.post('/album/figurinhas', fig)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', 'figurinhas'] });
      toast.success('Figurinha cadastrada!');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao cadastrar figurinha'),
  });
};

export const useAtualizarFigurinha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: number } & Partial<NovaFigurinha>) =>
      (await api.put(`/album/figurinhas/${id}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', 'figurinhas'] });
      toast.success('Figurinha atualizada!');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao atualizar figurinha'),
  });
};

export const useDeletarFigurinha = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/album/figurinhas/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['album', 'figurinhas'] });
      toast.success('Figurinha removida.');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao remover figurinha'),
  });
};

// =============================================================
// Admin — usuários + distribuir pacotes
// =============================================================

export type UsuarioAlbum = {
  id: number;
  username: string;
  whatsapp: string | null;
  role: 'admin' | 'user';
  pacotes_fechados: number;
};

export const useUsuariosAlbum = () =>
  useQuery<{ ok: boolean; usuarios: UsuarioAlbum[] }>({
    queryKey: ['album', 'usuarios'],
    queryFn: async () => (await api.get('/album/admin/usuarios')).data,
  });

export type DistribuicaoItem = {
  usuario_id: number;
  quantidade: number;
  tipo?: string;
};

export const useDistribuirPacotes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { distribuicao: DistribuicaoItem[]; motivo?: string }) =>
      (await api.post('/album/admin/distribuir', body)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['album'] });
      toast.success(data?.message ?? 'Pacotes distribuídos!');
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao distribuir pacotes'),
  });
};

// =============================================================
// Upload de imagem (reusa o endpoint /upload/foto existente)
// =============================================================

export const useUploadImagem = () =>
  useMutation<string, any, File>({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('foto', file);
      const { data } = await api.post('/upload/foto?pasta=figurinhas', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.url as string;
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro no upload da imagem'),
  });
