// Arquivo: src/hooks/useAuth.ts
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Hook customizado para acessar o estado de autenticação (token e usuário)
 * e a ação de logout em qualquer componente.
 */
export const useAuth = () => {
  const { token, user, logout, login } = useAuthStore((state) => ({
    token: state.token,
    user: state.user,
    logout: state.logout,
    login: state.login,
  }));

  return {
    isLoggedIn: !!token && !!user,
    user,
    token,
    isAdmin: user?.role === 'admin',
    logout,
    login,
  };
};