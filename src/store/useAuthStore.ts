// Arquivo: src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Importamos nosso tipo de usuário global
import { Usuario } from '@/@types';

type AuthState = {
  token: string | null;
  user: Usuario | null;
  login: (token: string, user: Usuario) => void;
  logout: () => void;
};

/**
 * Hook do Zustand para gerenciamento de estado de autenticação.
 *
 * Salva o token e os dados do usuário no localStorage
 * para manter a sessão ativa após o refresh.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null });
      },
    }),
    {
      name: 'futlendas-auth-storage', // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);