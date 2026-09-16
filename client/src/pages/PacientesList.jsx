import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useDebounce } from '../hooks/useDebounce.js';
import EspecialidadBadge from '../components/EspecialidadBadge.jsx';

function edad(fechaNacimiento) {
  if (!fechaNacimiento) return '—';
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return '—';
  const hoy = new Date();
  let años = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) años--;
  return `${años} años`;
}

export default function PacientesList() {
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 250);
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setCargando(true);
    const q = busquedaDebounced.trim() ? `?search=${encodeURIComponent(busquedaDebounced.trim())}` : '';
    api
      .get(`/pacientes${q}`)
      .then(setPacientes)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [busquedaDebounced]);

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Pacientes</h1>
        <Link to="/pacientes/nuevo" className="btn btn-primario">
          + Nuevo paciente
        </Link>
      </div>

      <div className="campo" style={{ marginBottom: 16 }}>
        <input
          placeholder="Buscar por nombre, DNI, teléfono o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      {cargando ? (
        <div className="vacio">Buscando pacientes…</div>
      ) : pacientes.length === 0 ? (
        <div className="vacio">
          <p>No se encontraron pacientes.</p>
        </div>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th className="oculto-movil">Edad</th>
                <th className="oculto-movil">Teléfono</th>
                <th>Especialidades</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/pacientes/${p.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>
                      {p.nombre}
                    </Link>
                  </td>
                  <td>{p.dni}</td>
                  <td className="oculto-movil">{edad(p.fecha_nacimiento)}</td>
                  <td className="oculto-movil">{p.telefono || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {p.especialidadesAtendidas.length === 0 ? (
                        <span style={{ color: 'var(--color-texto-suave)' }}>Sin consultas</span>
                      ) : (
                        p.especialidadesAtendidas.map((e) => <EspecialidadBadge key={e} especialidad={e} />)
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
