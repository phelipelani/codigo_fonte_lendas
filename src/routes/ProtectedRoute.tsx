// Arquivo: src/routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  isAdminRoute?: boolean; // Se for uma rota que exige admin
};

export const ProtectedRoute = ({ isAdminRoute = false }: ProtectedRouteProps) => {
  const { isLoggedIn, isAdmin } = useAuth();

  // 1. O usuário não está logado?
  if (!isLoggedIn) {
    // Redireciona para /login, guardando a página que ele tentou acessar
    return <Navigate to="/login" replace />;
  }

  // 2. A rota é SÓ para admin E o usuário NÃO é admin?
  if (isAdminRoute && !isAdmin) {
    // Redireciona para a Home (ou uma página "Acesso Negado")
    return <Navigate to="/" replace />;
  }

  // 3. Se passou por tudo, o usuário está autorizado.
  // <Outlet /> é o placeholder para onde a rota filha (ex: <AppLayout />) será renderizada.
  return <Outlet />;
};