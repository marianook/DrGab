import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import EspecialidadBadge from '../components/EspecialidadBadge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import EvolutionChart from '../components/EvolutionChart.jsx';
import { useSpecialty } from '../context/SpecialtyContext.jsx';

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

function formatoFechaHora(fechaHora) {
  const d = new Date(fechaHora);
  return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

const ESTADO_TURNO_LABEL = { pendiente: 'Pendiente', completado: 'Completado', cancelado: 'Cancelado' };

export default function PacienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { especialidad } = useSpecialty();
  const [paciente, setPaciente] = useState(null);
  const [error, setError] = useState('');
  const [filtroEsp, setFiltroEsp] = useState('todas');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [notas, setNotas] = useState('');
  const [guardandoNotas, setGuardandoNotas] = useState(false);

  const cargar = () => {
    api
      .get(`/pacientes/${id}`)
      .then((p) => {
        setPaciente(p);
        setNotas(p.notas_privadas || '');
      })
      .catch((e) => setError(e.message));
  };

  useEffect(cargar, [id]);

  const consultasFiltradas = useMemo(() => {
    if (!paciente) return [];
    if (filtroEsp === 'todas') return paciente.consultas;
    return paciente.consultas.filter((c) => c.especialidad === filtroEsp);
  }, [paciente, filtroEsp]);

  const estadisticasTurnos = useMemo(() => {
    const turnos = paciente?.turnos || [];
    return {
      total: turnos.length,
      completados: turnos.filter((t) => t.estado === 'completado').length,
      cancelados: turnos.filter((t) => t.estado === 'cancelado').length,
      pendientes: turnos.filter((t) => t.estado === 'pendiente').length,
    };
  }, [paciente]);

  const serieEndocrino = useMemo(() => {
    if (!paciente) return [];
    return paciente.consultas
      .filter((c) => c.especialidad === 'Endocrinologia')
      .slice()
      .reverse()
      .map((c) => ({ fecha: c.fecha, ...c.datosVitales }));
  }, [paciente]);

  const eliminar = async () => {
    await api.del(`/pacientes/${id}`);
    navigate('/pacientes');
  };

  const guardarNotas = async () => {
    setGuardandoNotas(true);
    try {
      await api.put(`/pacientes/${id}`, { notasPrivadas: notas });
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardandoNotas(false);
    }
  };

  if (error) return <div className="alerta alerta-error">{error}</div>;
  if (!paciente) return <div className="vacio">Cargando…</div>;

  return (
    <div>
      <div className="encabezado-pagina">
        <div>
          <h1>{paciente.nombre}</h1>
          <p style={{ color: 'var(--color-texto-suave)' }}>
            DNI {paciente.dni} · {edad(paciente.fecha_nacimiento)}
          </p>
        </div>
        <div className="grupo-botones">
          <Link to={`/pacientes/${id}/editar`} className="btn btn-secundario">
            Editar
          </Link>
          <Link
            to={`/pacientes/${id}/consultas/nueva`}
            className={`btn ${especialidad === 'Clinica' ? 'btn-clinica' : 'btn-endocrino'}`}
          >
            + Nueva consulta
          </Link>
          <button className="btn btn-peligro" onClick={() => setConfirmarEliminar(true)}>
            Eliminar
          </button>
        </div>
      </div>

      <div className="form-grid dos-columnas">
        <div className="card">
          <h3>Datos de contacto</h3>
          <p>📞 {paciente.telefono || 'sin registrar'}</p>
          <p>✉️ {paciente.email || 'sin registrar'}</p>
          <p>🏠 {paciente.direccion || 'sin registrar'}</p>
          <div style={{ marginTop: 8 }}>
            {paciente.especialidadesAtendidas.map((e) => (
              <EspecialidadBadge key={e} especialidad={e} />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Próximos turnos</h3>
          {paciente.proximosTurnos.length === 0 ? (
            <p style={{ color: 'var(--color-texto-suave)' }}>No tiene turnos programados.</p>
          ) : (
            paciente.proximosTurnos.map((t) => (
              <p key={t.id}>
                <EspecialidadBadge especialidad={t.especialidad} /> {formatoFechaHora(t.fecha_hora)} — {t.motivo || 'sin motivo'}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3>Historial de turnos</h3>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{estadisticasTurnos.total}</div>
            <div style={{ fontSize: 13, color: 'var(--color-texto-suave)' }}>Turnos totales</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1e7e34' }}>{estadisticasTurnos.completados}</div>
            <div style={{ fontSize: 13, color: 'var(--color-texto-suave)' }}>Veces atendido</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{estadisticasTurnos.pendientes}</div>
            <div style={{ fontSize: 13, color: 'var(--color-texto-suave)' }}>Pendientes</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-peligro)' }}>{estadisticasTurnos.cancelados}</div>
            <div style={{ fontSize: 13, color: 'var(--color-texto-suave)' }}>Cancelados</div>
          </div>
        </div>

        {(paciente.turnos || []).length === 0 ? (
          <p style={{ color: 'var(--color-texto-suave)' }}>Todavía no tiene turnos registrados.</p>
        ) : (
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Especialidad</th>
                  <th className="oculto-movil">Motivo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {paciente.turnos.map((t) => (
                  <tr key={t.id}>
                    <td>{formatoFechaHora(t.fecha_hora)}</td>
                    <td>
                      <EspecialidadBadge especialidad={t.especialidad} />
                    </td>
                    <td className="oculto-movil">{t.motivo || '—'}</td>
                    <td>
                      <span className={`badge badge-estado-${t.estado}`}>{ESTADO_TURNO_LABEL[t.estado]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Antecedentes y alergias</h3>
        <div className="form-grid dos-columnas">
          <div>
            <strong>Antecedentes:</strong>
            <p>{paciente.antecedentes || '—'}</p>
          </div>
          <div>
            <strong>Alergias:</strong>
            <p style={paciente.alergias ? { color: 'var(--color-peligro)', fontWeight: 700 } : undefined}>
              {paciente.alergias || '—'}
            </p>
          </div>
          <div>
            <strong>Medicamentos actuales:</strong>
            <p>{paciente.medicamentos_actuales || '—'}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🔒 Notas privadas (solo visibles para la médica)</h3>
        <div className="campo">
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas personales sobre el paciente…" />
        </div>
        <button className="btn btn-secundario" onClick={guardarNotas} disabled={guardandoNotas}>
          {guardandoNotas ? <span className="spinner" /> : 'Guardar notas'}
        </button>
      </div>

      {serieEndocrino.length >= 2 && (
        <div className="form-grid dos-columnas">
          <EvolutionChart serie={serieEndocrino} campo="glucemia" etiqueta="Evolución de glucemia" unidad="mg/dL" />
          <EvolutionChart serie={serieEndocrino} campo="hba1c" etiqueta="Evolución de HbA1c" unidad="%" />
          <EvolutionChart serie={serieEndocrino} campo="peso" etiqueta="Evolución de peso" unidad="kg" />
          <EvolutionChart serie={serieEndocrino} campo="tsh" etiqueta="Evolución de TSH" unidad="µUI/mL" />
        </div>
      )}

      {paciente.medicamentos.length > 0 && (
        <div className="card">
          <h3>Historial de medicamentos prescriptos</h3>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Especialidad</th>
                  <th>Medicamento</th>
                  <th className="oculto-movil">Dosis / indicaciones</th>
                </tr>
              </thead>
              <tbody>
                {paciente.medicamentos.map((m) => (
                  <tr key={m.id}>
                    <td>{m.fecha?.slice(0, 10)}</td>
                    <td>
                      <EspecialidadBadge especialidad={m.especialidad} />
                    </td>
                    <td>{m.nombre}</td>
                    <td className="oculto-movil">
                      {m.dosis} {m.indicaciones}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="encabezado-pagina" style={{ marginTop: 8 }}>
        <h2>Cronología de consultas</h2>
        <div className="grupo-botones">
          <button
            className={`btn ${filtroEsp === 'todas' ? 'btn-primario' : 'btn-secundario'}`}
            onClick={() => setFiltroEsp('todas')}
          >
            Todas
          </button>
          <button
            className={`btn ${filtroEsp === 'Clinica' ? 'btn-clinica' : 'btn-secundario'}`}
            onClick={() => setFiltroEsp('Clinica')}
          >
            Clínica
          </button>
          <button
            className={`btn ${filtroEsp === 'Endocrinologia' ? 'btn-endocrino' : 'btn-secundario'}`}
            onClick={() => setFiltroEsp('Endocrinologia')}
          >
            Endocrinología
          </button>
        </div>
      </div>

      {consultasFiltradas.length === 0 ? (
        <div className="vacio">No hay consultas registradas.</div>
      ) : (
        consultasFiltradas.map((c) => (
          <Link key={c.id} to={`/consultas/${c.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <EspecialidadBadge especialidad={c.especialidad} /> <strong>{c.fecha}</strong>
              </div>
            </div>
            <p style={{ marginTop: 8 }}>
              <strong>Motivo:</strong> {c.motivo || '—'}
            </p>
            {c.diagnostico && (
              <p>
                <strong>Diagnóstico:</strong> {c.diagnostico}
              </p>
            )}
          </Link>
        ))
      )}

      {confirmarEliminar && (
        <ConfirmModal
          titulo="¿Eliminar este paciente?"
          mensaje="Se eliminarán también todas sus consultas y turnos. Esta acción no se puede deshacer."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmarEliminar(false)}
        />
      )}
    </div>
  );
}
