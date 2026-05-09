// Arquivo: src/features/auth/api/useAtivarConta.ts (CORRIGIDO)
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Usuario } from '@/@types';
import { getApiErrorMessage } from '@/utils/errorHandling';

type AtivarContaPayload = {
  token: string;
  username: string;
  password: string;
};

type AtivarContaResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    jogador_id: number;
    jogador_nome: string;
  };
};

const ativarConta = async (payload: AtivarContaPayload): Promise<AtivarContaResponse> => {
  const { data } = await api.post('/auth/convite/ativar', payload);
  return data;
};

export const useAtivarConta = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  return useMutation<
    AtivarContaResponse,
    AxiosError<{ message: string; error?: string }>,
    AtivarContaPayload
  >({
    mutationFn: ativarConta,
    // Desabilita retry automático para evitar chamadas duplicadas
    retry: false,
    onSuccess: (data) => {
      try {
        // Extrai campos que o store espera (tipo Usuario)
        const usuario: Usuario = {
          id: data.user.id,
          name: data.user.jogador_nome,
          username: data.user.username,
          role: data.user.role as Usuario['role'],
          jogadorId: data.user.jogador_id,
          jogador_id: data.user.jogador_id,
        };

        // Salva o token e dados do usuário
        login(data.token, usuario);

        // Feedback visual
        toast.success(`Bem-vindo, ${data.user.jogador_nome}! Sua conta foi ativada com sucesso! 🎉`);
        
        // Pequeno delay antes de redirecionar (para garantir que o auth foi salvo)
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Erro ao salvar autenticação:', error);
        toast.error('Conta ativada, mas houve um erro ao fazer login. Tente fazer login manualmente.');
        navigate('/login', { replace: true });
      }
    },
    onError: (error) => {
      // Log detalhado do erro
      if (import.meta.env.DEV) console.error('Erro ao ativar conta:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        fullError: error,
      });

      // Verifica se é erro de convite já usado
      if (error.response?.data?.message?.includes('já foi utilizado')) {
        toast.error('Este convite já foi usado. A conta já está ativa!');
        // Redireciona para login
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }

      // Verifica se é erro de username já em uso
      if (error.response?.data?.message?.includes('já está em uso')) {
        toast.error('Este username já está em uso. Tente outro.');
        return;
      }

      // Verifica se é erro de convite expirado
      if (error.response?.data?.message?.includes('expirou')) {
        toast.error('Este convite expirou. Solicite um novo convite ao administrador.');
        return;
      }

      // Erro genérico
      toast.error(
        getApiErrorMessage(error, 'Erro ao ativar conta. Tente novamente.')
      );
    },
  });
};