// Arquivo: src/routes/index.tsx
import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { LoginPage } from "@/features/auth/routes/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "@/components/shared/AppLayout";
import { AtivarContaPage } from "@/features/auth/routes/AtivarContaPage";
import { AuthCallbackPage } from "@/features/auth/routes/AuthCallbackPage";
import { ForgotPasswordPage } from "@/features/auth/routes/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/routes/ResetPasswordPage";

// Lazy loading de todas as rotas protegidas
const DashboardPage = lazy(() => import("@/features/dashboard/routes/DashboardPage").then(m => ({ default: m.DashboardPage })));
const JogadoresPage = lazy(() => import("@/features/jogadores/routes/JogadoresPage").then(m => ({ default: m.JogadoresPage })));
const JogadorCreatePage = lazy(() => import("@/features/jogadores/routes/JogadorCreatePage").then(m => ({ default: m.JogadorCreatePage })));
const JogadorEditPage = lazy(() => import("@/features/jogadores/routes/JogadorEditPage").then(m => ({ default: m.JogadorEditPage })));
const LigasPage = lazy(() => import("@/features/ligas/routes/LigasPage").then(m => ({ default: m.LigasPage })));
const RodadasPage = lazy(() => import("@/features/rodadas/routes/RodadasPage").then(m => ({ default: m.RodadasPage })));
const GerenciarRodadaPage = lazy(() => import("@/features/rodadas/routes/GerenciarRodadaPage").then(m => ({ default: m.GerenciarRodadaPage })));
const PartidasPage = lazy(() => import("@/features/rodadas/routes/PartidasPage").then(m => ({ default: m.PartidasPage })));
const HallDaFamaPage = lazy(() => import("@/features/HallDaFama/routes/HallDaFamaPage").then(m => ({ default: m.HallDaFamaPage })));
const PartidasGlobalPage = lazy(() => import("@/features/partidas/routes/PartidasGlobalPage").then(m => ({ default: m.PartidasGlobalPage })));
const CampeonatosPage = lazy(() => import("@/features/campeonatos/routes/CampeonatosPage").then(m => ({ default: m.CampeonatosPage })));
const CampeonatoCreatePage = lazy(() => import("@/features/campeonatos/routes/CampeonatoCreatePage").then(m => ({ default: m.CampeonatoCreatePage })));
const CampeonatoDetailPage = lazy(() => import("@/features/campeonatos/routes/CampeonatoDetailPage").then(m => ({ default: m.CampeonatoDetailPage })));
const CampeonatoRodadaCheckinPage = lazy(() => import("@/features/campeonatos/routes/CampeonatoRodadaCheckinPage").then(m => ({ default: m.CampeonatoRodadaCheckinPage })));
const CampeonatoPartidaLivePage = lazy(() => import("@/features/campeonatos/routes/CampeonatoPartidaLivePage").then(m => ({ default: m.CampeonatoPartidaLivePage })));
const CampeonatoRodadaHistoryPage = lazy(() => import("@/features/campeonatos/routes/CampeonatoRodadaHistoryPage").then(m => ({ default: m.CampeonatoRodadaHistoryPage })));
const TimesPage = lazy(() => import("@/features/Times/routes/TimesPage").then(m => ({ default: m.TimesPage })));
const PerfilPage = lazy(() => import("@/features/perfil/routes/PerfilPage"));
const AnalyticsPage = lazy(() => import("@/features/Analytics/routes/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const CampeonatoSorteioPage = lazy(() => import("@/features/campeonatos/components/CampeonatoSorteioPage"));
const CartolendaPage = lazy(() => import("@/features/cartolendas/routes/CartolendaPage").then(m => ({ default: m.CartolendaPage })));
const PartidaDetalhePage = lazy(() => import("@/features/partidas/routes/PartidaDetalhePage"));
const RachaPage = lazy(() => import("@/features/presenca/routes/RachaPage").then(m => ({ default: m.RachaPage })));
const AlbumPage = lazy(() => import("@/features/album/routes/AlbumPage").then(m => ({ default: m.AlbumPage })));
const AlbumAdminPage = lazy(() => import("@/features/album/routes/AlbumAdminPage").then(m => ({ default: m.AlbumAdminPage })));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/ativar-conta/:token" element={<AtivarContaPage />} />

      {/* Auth — callback OAuth do Google e fluxo de reset de senha */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Rotas para qualquer usuário logado */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Ligas — visualização */}
          <Route path="/ligas" element={<LigasPage />} />
          <Route path="/ligas/:id/rodadas" element={<RodadasPage />} />
          <Route path="/ligas/:id/rodadas/:rodadaId/partidas" element={<PartidasPage />} />

          {/* Campeonatos — visualização */}
          <Route path="/campeonatos" element={<CampeonatosPage />} />
          <Route path="/campeonatos/:id" element={<CampeonatoDetailPage />} />
          <Route path="/campeonatos/:id/rodadas/:rodadaId/historico" element={<CampeonatoRodadaHistoryPage />} />

          {/* Features Globais — visualização */}
          <Route path="/partidas" element={<PartidasGlobalPage />} />
          <Route path="/partidas/:id" element={<PartidaDetalhePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/hall-da-fama" element={<HallDaFamaPage />} />
          <Route path="/cartolendas" element={<CartolendaPage />} />

          {/* Times / Jogadores — visualização */}
          <Route path="/times" element={<TimesPage />} />
          <Route path="/jogadores" element={<JogadoresPage />} />

          {/* Perfil */}
          <Route path="/perfil" element={<PerfilPage />} />

          {/* Racha — gestão de presença / bot WhatsApp */}
          <Route path="/racha" element={<RachaPage />} />

          {/* Álbum de Figurinhas */}
          <Route path="/album" element={<AlbumPage />} />
        </Route>
      </Route>

      {/* Rotas exclusivas de admin */}
      <Route element={<ProtectedRoute isAdminRoute />}>
        <Route element={<AppLayout />}>
          {/* Álbum — administração */}
          <Route path="/album/admin" element={<AlbumAdminPage />} />

          {/* Ligas — gerenciamento */}
          <Route path="/ligas/:id/rodadas/:rodadaId/gerenciar" element={<GerenciarRodadaPage />} />

          {/* Campeonatos — gerenciamento */}
          <Route path="/campeonatos/novo" element={<CampeonatoCreatePage />} />
          <Route path="/campeonatos/:id/sorteio" element={<CampeonatoSorteioPage />} />
          <Route path="/campeonatos/:id/rodadas/:rodadaId" element={<CampeonatoRodadaCheckinPage />} />
          <Route path="/campeonatos/:id/rodadas/:rodadaId/partidas" element={<CampeonatoPartidaLivePage />} />

          {/* Jogadores — criação/edição */}
          <Route path="/jogadores/novo" element={<JogadorCreatePage />} />
          <Route path="/jogadores/:id/edit" element={<JogadorEditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<h1>404 - Página Não Encontrada</h1>} />
    </Routes>
  );
};