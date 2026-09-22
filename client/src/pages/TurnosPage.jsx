import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useSpecialty } from '../context/SpecialtyContext.jsx';
import Calendar from '../components/Calendar.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { formatoISO, slotsPosiblesPorDia } from '../utils/calendario.js';

const ESTADO_LABEL = { pendiente: 'Pendiente', completado: 'Completado', cancelado: 'Cancelado' };
const ESTADO_PAGO_LABEL = { pendiente: 'Pago pendiente', pagado: 'Pagado', rechazado: 'Pago rechazado' };
const ESTADO_PAGO_CLASE = { pendiente: 'badge-estado-pendiente', pagado: 'badge-estado-completado', rechazado: 'badge-estado-cancelado' };

function formatoHora(fechaHora) {
  return new Date(fechaHora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function TurnosPage() {
  const { especialidad } = useSpecialty();
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState(formatoISO(hoy));
  const [turnosMes, setTurnosMes] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [proximos, setProximos] = useState([]);
  const [modalReserva, setModalReserva] = useState(null);
  const [turnoACancelar, setTurnoACancelar] = useState(null);
  const [error, setError] = useState('');

  const cargarMes = () => {
    const desde = formatoISO(new Date(anio, mes, 1));
    const hasta = formatoISO(new Date(anio, mes + 1, 0));
    api
      .get(`/turnos?especialidad=${especialidad}&desde=${desde}T00:00:00&hasta=${hasta}T23:59:59`)
      .then(setTurnosMes)
      .catch((e) => setError(e.message));
  };

  useEffect(cargarMes, [anio, mes, especialidad]);

  useEffect(() => {
    api.get(`/disponibilidad?especialidad=${especialidad}`).then(setDisponibilidad);
  }, [especialidad]);

  useEffect(() => {
    api.get(`/turnos/proximos?especialidad=${especialidad}&limite=4`).then(setProximos);
  }, [especialidad, turnosMes]);

  const estadosPorDia = useMemo(() => {
    const bloquesPorDia = {};
    for (const b of disponibilidad) {
      bloquesPorDia[b.dia_semana] = [...(bloquesPorDia[b.dia_semana] || []), b];
    }
    const ocupadosPorDia = {};
    for (const t of turnosMes) {
      if (t.estado === 'cancelado') continue;
      const iso = t.fecha_hora.slice(0, 10);
      ocupadosPorDia[iso] = (ocupadosPorDia[iso] || 0) + 1;
    }

    const estados = {};
    const cursor = new Date(anio, mes, 1);
    const finMes = new Date(anio, mes + 1, 0);
    while (cursor <= finMes) {
      const iso = formatoISO(cursor);
      const diaSemana = cursor.getDay();
      const bloques = bloquesPorDia[diaSemana];
      if (!bloques || bloques.length === 0) {
        estados[iso] = 'sin-atencion';
      } else {
        const total = slotsPosiblesPorDia(bloques);
        const ocupados = ocupadosPorDia[iso] || 0;
        estados[iso] = ocupados >= total ? 'ocupado' : 'disponible';
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return estados;
  }, [disponibilidad, turnosMes, anio, mes]);

  const turnosDelDia = useMemo(
    () =>
      turnosMes
        .filter((t) => t.fecha_hora.slice(0, 10) === diaSeleccionado)
        .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)),
    [turnosMes, diaSeleccionado]
  );

  const cambiarMes = (delta) => {
    const nuevo = new Date(anio, mes + delta, 1);
    setAnio(nuevo.getFullYear());
    setMes(nuevo.getMonth());
  };

  const cancelarTurno = async () => {
    await api.put(`/turnos/${turnoACancelar.id}`, { estado: 'cancelado' });
    setTurnoACancelar(null);
    cargarMes();
  };

  const marcarCompletado = async (turno) => {
    await api.put(`/turnos/${turno.id}`, { estado: 'completado' });
    cargarMes();
  };

  const marcarPagado = async (turno) => {
    await api.put(`/turnos/${turno.id}`, { estadoPago: 'pagado' });
    cargarMes();
  };

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Turnos</h1>
        <button
          className={`btn ${especialidad === 'Clinica' ? 'btn-clinica' : 'btn-endocrino'}`}
          onClick={() => setModalReserva({ fecha: diaSeleccionado })}
        >
          + Reservar turno
        </button>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      {proximos.length > 0 && (
        <div className="alerta alerta-info" style={{ display: 'block' }}>
          <strong>Próximos turnos:</strong>
          <ul style={{ margin: '6px 0 0' }}>
            {proximos.map((t) => (
              <li key={t.id}>
                {new Date(t.fecha_hora).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })} — {t.paciente?.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-grid dos-columnas">
        <Calendar
          anio={anio}
          mes={mes}
          onCambiarMes={cambiarMes}
          estadosPorDia={estadosPorDia}
          diaSeleccionado={diaSeleccionado}
          onSeleccionarDia={setDiaSeleccionado}
        />

        <div className="card">
          <h3>Turnos del {new Date(`${diaSeleccionado}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {turnosDelDia.length === 0 ? (
            <p style={{ color: 'var(--color-texto-suave)' }}>No hay turnos para este día.</p>
          ) : (
            turnosDelDia.map((t) => (
              <div key={t.id} className="card" style={{ boxShadow: 'none', border: '1px solid var(--color-borde)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{formatoHora(t.fecha_hora)}</strong> — {t.paciente?.nombre}
                    {t.origen === 'publico' && (
                      <span className="badge badge-clinica" style={{ marginLeft: 8 }}>
                        Reservado online
                      </span>
                    )}
                    <div style={{ fontSize: 14, color: 'var(--color-texto-suave)' }}>{t.motivo || 'Sin motivo especificado'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className={`badge badge-estado-${t.estado}`}>{ESTADO_LABEL[t.estado]}</span>
                    {t.estado_pago && t.estado_pago !== 'no_requerido' && (
                      <span className={`badge ${ESTADO_PAGO_CLASE[t.estado_pago]}`}>{ESTADO_PAGO_LABEL[t.estado_pago]}</span>
                    )}
                  </div>
                </div>
                {t.estado === 'pendiente' && (
                  <div className="grupo-botones" style={{ marginTop: 10 }}>
                    <button className="btn btn-secundario" onClick={() => setModalReserva({ turno: t })}>
                      Reprogramar
                    </button>
                    <button className="btn btn-secundario" onClick={() => marcarCompletado(t)}>
                      Marcar completado
                    </button>
                    {t.estado_pago === 'pendiente' && (
                      <button className="btn btn-secundario" onClick={() => marcarPagado(t)}>
                        Marcar como pagado
                      </button>
                    )}
                    <button className="btn btn-peligro" onClick={() => setTurnoACancelar(t)}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {modalReserva && (
        <BookingModal
          especialidad={especialidad}
          fechaInicial={modalReserva.fecha || diaSeleccionado}
          turno={modalReserva.turno}
          onClose={() => setModalReserva(null)}
          onGuardado={() => {
            setModalReserva(null);
            cargarMes();
          }}
        />
      )}

      {turnoACancelar && (
        <ConfirmModal
          titulo="¿Cancelar este turno?"
          mensaje={`Se cancelará el turno de ${turnoACancelar.paciente?.nombre} del ${formatoHora(turnoACancelar.fecha_hora)}.`}
          onConfirmar={cancelarTurno}
          onCancelar={() => setTurnoACancelar(null)}
          textoConfirmar="Sí, cancelar"
        />
      )}
    </div>
  );
}
