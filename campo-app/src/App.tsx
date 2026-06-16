import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ElencoPage from './pages/ElencoPage'
import AdversariosPage from './pages/AdversariosPage'
import PartidasPage from './pages/PartidasPage'
import CapturaPage from './pages/CapturaPage'
import EscalacaoPage from './pages/EscalacaoPage'
import RelatorioPartidaPage from './pages/RelatorioPartidaPage'
import EstrategiaPage from './pages/EstrategiaPage'
import AgendaPage from './pages/AgendaPage'
import RelatoriosPage from './pages/RelatoriosPage'
import CallbackPage from './pages/CallbackPage'
import ConvitePage from './pages/ConvitePage'
import ConvidarPage from './pages/ConvidarPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="/convite/:token" element={<ConvitePage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/elenco"
        element={
          <ProtectedRoute papeis={['tecnico', 'diretor']}>
            <ElencoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/adversarios"
        element={
          <ProtectedRoute papeis={['tecnico', 'diretor']}>
            <AdversariosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/estrategia"
        element={
          <ProtectedRoute papeis={['tecnico', 'diretor']}>
            <EstrategiaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <RelatoriosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <ProtectedRoute>
            <AgendaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partidas"
        element={
          <ProtectedRoute>
            <PartidasPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partidas/:id/escalacao"
        element={
          <ProtectedRoute papeis={['tecnico', 'diretor']}>
            <EscalacaoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partidas/:id/anotar"
        element={
          <ProtectedRoute papeis={['tecnico', 'diretor']}>
            <CapturaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/partidas/:id/relatorio"
        element={
          <ProtectedRoute>
            <RelatorioPartidaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/convidar"
        element={
          <ProtectedRoute papeis={['diretor', 'tecnico']}>
            <ConvidarPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
