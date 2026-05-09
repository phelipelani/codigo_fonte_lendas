// Arquivo: src/features/auth/api/useValidarConvite.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/api';

type ValidarConviteResponse = {
  message: string;
  convite: {
    jogador_id: number;
    jogador_nome: string;
    jogador_foto?: string;
    expira_em: string;
  };
};

const validarConvite = async (token: string): Promise<ValidarConviteResponse> => {
  const { data } = await api.get(`/auth/convite/validar/${token}`);
  return data;
};

export const useValidarConvite = (token: string) => {
  return useQuery<ValidarConviteResponse, Error>({
    queryKey: ['validarConvite', token],
    queryFn: () => validarConvite(token),
    enabled: !!token,
    retry: false, // Não retentar se o token for inválido
  });
};