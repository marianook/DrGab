import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import PacientesList from './pages/PacientesList.jsx';
import PacienteDetail from './pages/PacienteDetail.jsx';
import PacienteForm from './pages/PacienteForm.jsx';
import ConsultaForm from './pages/ConsultaForm.jsx';
import ConsultaDetail from './pages/ConsultaDetail.jsx';
import TurnosPage from './pages/TurnosPage.jsx';
import ConfiguracionPage from './pages/ConfiguracionPage.jsx';
import EstadisticasPage from './pages/EstadisticasPage.jsx';

function RutaPrivada({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="vacio">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RutaPrivada>
            <Layout />
          </RutaPrivada>
        }
      >
        <Route index element={<Navigate to="/pacientes" replace />} />
        <Route path="pacientes" element={<PacientesList />} />
        <Route path="pacientes/nuevo" element={<PacienteForm />} />
        <Route path="pacientes/:id" element={<PacienteDetail />} />
        <Route path="pacientes/:id/editar" element={<PacienteForm />} />
        <Route path="pacientes/:id/consultas/nueva" element={<ConsultaForm />} />
        <Route path="consultas/:consultaId" element={<ConsultaDetail />} />
        <Route path="consultas/:consultaId/editar" element={<ConsultaForm />} />
        <Route path="turnos" element={<TurnosPage />} />
        <Route path="estadisticas" element={<EstadisticasPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
