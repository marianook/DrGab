import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSpecialty } from '../context/SpecialtyContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { MODO_API } from '../api/client.js';

const ITEMS = [
  { to: '/pacientes', icono: '🧑‍⚕️', label: 'Pacientes' },
  { to: '/turnos', icono: '📅', label: 'Turnos' },
  { to: '/reservar', icono: '🗓️', label: 'Reservar turno' },
  { to: '/estadisticas', icono: '📊', label: 'Estadísticas' },
  { to: '/configuracion', icono: '⚙️', label: 'Configuración' },
];

export default function Layout() {
  const [abierto, setAbierto] = useState(false);
  const { usuario, logout } = useAuth();
  const { especialidad, setEspecialidad } = useSpecialty();
  const { tema, alternarTema } = useTheme();
  const navigate = useNavigate();

  const cerrarSesion = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="btn-menu" aria-label="Abrir menú" onClick={() => setAbierto((v) => !v)}>
          ☰
        </button>
        <span className="logo">DrGab</span>

        <div className="selector-especialidad" title="Especialidad activa: define qué turnos ves en el calendario y con qué datos vitales se carga una consulta nueva. No filtra la lista de pacientes.">
          <button
            className={`clinica ${especialidad === 'Clinica' ? 'activo' : ''}`}
            onClick={() => setEspecialidad('Clinica')}
          >
            <span className="texto-largo">Clínica</span>
            <span className="texto-corto">Clín.</span>
          </button>
          <button
            className={`endocrino ${especialidad === 'Endocrinologia' ? 'activo' : ''}`}
            onClick={() => setEspecialidad('Endocrinologia')}
          >
            <span className="texto-largo">Endocrinología</span>
            <span className="texto-corto">Endo.</span>
          </button>
        </div>

        <button
          className="btn btn-ghost oculto-movil"
          onClick={alternarTema}
          style={{ minHeight: 44, padding: '8px 14px' }}
          title="Cambiar tema"
        >
          {tema === 'claro' ? '🌙' : '☀️'}
        </button>

        <div className="usuario">
          <span className="oculto-movil">{usuario}</span>
          <button className="btn btn-secundario btn-salir" onClick={cerrarSesion} style={{ minHeight: 44 }}>
            Salir
          </button>
        </div>
      </header>

      {abierto && <div className="sidebar-overlay" onClick={() => setAbierto(false)} />}

      <aside className={`sidebar ${abierto ? 'abierto' : ''}`}>
        <nav>
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'activo' : '')}
              onClick={() => setAbierto(false)}
            >
              <span className="icono">{item.icono}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="contenido">
        {MODO_API === 'local' && (
          <div className="banner-demo-local">
            🧪 Modo de prueba local: los datos se guardan solo en este navegador (localStorage). Todavía no hay backend conectado.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
