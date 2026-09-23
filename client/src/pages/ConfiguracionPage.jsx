import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { NOMBRES_DIA } from '../utils/calendario.js';
import { useTheme } from '../context/ThemeContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];

const ENLACE_RESERVA = `${window.location.origin}${window.location.pathname}#/reservar`;

export default function ConfiguracionPage() {
  const { tema, alternarTema } = useTheme();
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [precios, setPrecios] = useState([]);
  const [guardandoPrecio, setGuardandoPrecio] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState({
    especialidad: 'Clinica',
    diaSemana: 1,
    horaInicio: '08:00',
    horaFin: '12:00',
    duracionTurno: 30,
  });
  const [aBorrar, setABorrar] = useState(null);

  const cargar = () => {
    api.get('/disponibilidad').then(setDisponibilidad).catch((e) => setError(e.message));
    api.get('/precios').then(setPrecios).catch((e) => setError(e.message));
  };
  useEffect(cargar, []);

  const actualizarPrecio = async (especialidad, monto) => {
    setGuardandoPrecio(especialidad);
    setError('');
    try {
      await api.put(`/precios/${especialidad}`, { monto: Number(monto) });
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPrecio('');
    }
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(ENLACE_RESERVA);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar el enlace. Copialo manualmente.');
    }
  };

  const agregar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/disponibilidad', nuevo);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminar = async () => {
    await api.del(`/disponibilidad/${aBorrar.id}`);
    setABorrar(null);
    cargar();
  };

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Configuración</h1>
      </div>

      <div className="card">
        <h3>Apariencia</h3>
        <p>Modo {tema === 'claro' ? 'claro' : 'oscuro'} activo.</p>
        <button className="btn btn-secundario" onClick={alternarTema}>
          Cambiar a modo {tema === 'claro' ? 'oscuro' : 'claro'}
        </button>
      </div>

      <div className="card">
        <h3>Reserva de turnos online</h3>
        <p className="ayuda">
          Compartí este enlace con tus pacientes para que reserven su propio turno, eligiendo especialidad, fecha y
          horario disponible.
        </p>
        <div className="form-grid dos-columnas" style={{ alignItems: 'end' }}>
          <div className="campo">
            <label htmlFor="enlace-reserva">Enlace público</label>
            <input id="enlace-reserva" value={ENLACE_RESERVA} readOnly />
          </div>
          <button type="button" className="btn btn-secundario" onClick={copiarEnlace}>
            {copiado ? 'Copiado ✓' : 'Copiar enlace'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Precio del turno por especialidad</h3>
        <p className="ayuda">
          Si cargás un monto mayor a $0 y configurás Mercado Pago en el servidor, el paciente deberá abonarlo online
          para confirmar su turno. Con $0 (o sin Mercado Pago configurado), la reserva pública queda confirmada sin
          pago.
        </p>
        <div className="form-grid dos-columnas">
          {precios.map((p) => (
            <div className="campo" key={p.especialidad}>
              <label htmlFor={`precio-${p.especialidad}`}>{p.especialidad === 'Clinica' ? 'Clínica' : 'Endocrinología'}</label>
              <input
                id={`precio-${p.especialidad}`}
                type="number"
                min={0}
                step={100}
                defaultValue={p.monto}
                onBlur={(e) => {
                  if (Number(e.target.value) !== p.monto) actualizarPrecio(p.especialidad, e.target.value);
                }}
                disabled={guardandoPrecio === p.especialidad}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Disponibilidad semanal por especialidad</h3>
        <p className="ayuda">Definí los horarios en que se pueden reservar turnos para cada especialidad, día por día.</p>

        {error && <div className="alerta alerta-error">{error}</div>}

        <form onSubmit={agregar} className="form-grid dos-columnas" style={{ marginBottom: 20 }}>
          <div className="campo">
            <label>Especialidad</label>
            <select value={nuevo.especialidad} onChange={(e) => setNuevo({ ...nuevo, especialidad: e.target.value })}>
              <option value="Clinica">Clínica</option>
              <option value="Endocrinologia">Endocrinología</option>
            </select>
          </div>
          <div className="campo">
            <label>Día</label>
            <select value={nuevo.diaSemana} onChange={(e) => setNuevo({ ...nuevo, diaSemana: Number(e.target.value) })}>
              {NOMBRES_DIA.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Hora de inicio</label>
            <input type="time" value={nuevo.horaInicio} onChange={(e) => setNuevo({ ...nuevo, horaInicio: e.target.value })} />
          </div>
          <div className="campo">
            <label>Hora de fin</label>
            <input type="time" value={nuevo.horaFin} onChange={(e) => setNuevo({ ...nuevo, horaFin: e.target.value })} />
          </div>
          <div className="campo">
            <label>Duración de turno (minutos)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={nuevo.duracionTurno}
              onChange={(e) => setNuevo({ ...nuevo, duracionTurno: Number(e.target.value) })}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primario btn-bloque">
              + Agregar franja horaria
            </button>
          </div>
        </form>

        {ESPECIALIDADES.map((esp) => (
          <div key={esp} style={{ marginBottom: 16 }}>
            <h3>{esp === 'Clinica' ? 'Clínica' : 'Endocrinología'}</h3>
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th className="oculto-movil">Duración</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {disponibilidad
                    .filter((d) => d.especialidad === esp)
                    .map((d) => (
                      <tr key={d.id}>
                        <td>{NOMBRES_DIA[d.dia_semana]}</td>
                        <td>{d.hora_inicio}</td>
                        <td>{d.hora_fin}</td>
                        <td className="oculto-movil">{d.duracion_turno} min</td>
                        <td>
                          <button className="btn btn-peligro" style={{ minHeight: 40, padding: '6px 14px' }} onClick={() => setABorrar(d)}>
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  {disponibilidad.filter((d) => d.especialidad === esp).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ color: 'var(--color-texto-suave)' }}>
                        Sin franjas configuradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {aBorrar && (
        <ConfirmModal
          titulo="¿Quitar esta franja horaria?"
          mensaje="Los turnos ya reservados no se verán afectados, pero no se podrán reservar nuevos turnos en este horario."
          onConfirmar={eliminar}
          onCancelar={() => setABorrar(null)}
        />
      )}
    </div>
  );
}
