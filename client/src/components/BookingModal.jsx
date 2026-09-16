import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import PatientPicker from './PatientPicker.jsx';
import { ESPECIALIDADES } from '../context/SpecialtyContext.jsx';

export default function BookingModal({ especialidad, fechaInicial, turno, onClose, onGuardado }) {
  const reprogramando = Boolean(turno);
  const [paciente, setPaciente] = useState(turno?.paciente || null);
  const [fecha, setFecha] = useState(fechaInicial);
  const [motivo, setMotivo] = useState(turno?.motivo || '');
  const [slots, setSlots] = useState([]);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fecha) return;
    setCargandoSlots(true);
    api
      .get(`/turnos/slots?especialidad=${especialidad}&fecha=${fecha}`)
      .then((r) => setSlots(r.slots))
      .catch((e) => setError(e.message))
      .finally(() => setCargandoSlots(false));
  }, [fecha, especialidad]);

  const infoEsp = ESPECIALIDADES[especialidad];

  const confirmar = async () => {
    setError('');
    if (!reprogramando && !paciente) {
      setError('Seleccioná un paciente');
      return;
    }
    if (!horaSeleccionada) {
      setError('Seleccioná un horario disponible');
      return;
    }
    setGuardando(true);
    try {
      if (reprogramando) {
        await api.put(`/turnos/${turno.id}`, { fechaHora: horaSeleccionada, motivo });
      } else {
        await api.post('/turnos', { pacienteId: paciente.id, especialidad, fechaHora: horaSeleccionada, motivo });
      }
      onGuardado();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 560 }}>
        <h2 style={{ color: infoEsp.color }}>
          {reprogramando ? 'Reprogramar turno' : 'Reservar turno'} — {infoEsp.nombre}
        </h2>

        {error && <div className="alerta alerta-error">{error}</div>}

        {!reprogramando && <PatientPicker pacienteSeleccionado={paciente} onSeleccionar={setPaciente} />}
        {reprogramando && (
          <div className="campo">
            <label>Paciente</label>
            <input disabled value={`${turno.paciente?.nombre || ''} — DNI ${turno.paciente?.dni || ''}`} />
          </div>
        )}

        <div className="campo">
          <label htmlFor="fecha-turno">Fecha</label>
          <input
            id="fecha-turno"
            type="date"
            value={fecha}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setFecha(e.target.value);
              setHoraSeleccionada('');
            }}
          />
        </div>

        <div className="campo">
          <label>Horario disponible</label>
          {cargandoSlots ? (
            <p>Buscando horarios…</p>
          ) : slots.length === 0 ? (
            <p style={{ color: 'var(--color-texto-suave)' }}>No hay franja horaria configurada para este día.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map((s) => (
                <button
                  type="button"
                  key={s.hora}
                  disabled={!s.disponible}
                  className={`btn ${horaSeleccionada === s.fechaHora ? 'btn-primario' : 'btn-secundario'}`}
                  style={{ minWidth: 84, opacity: s.disponible ? 1 : 0.4 }}
                  onClick={() => setHoraSeleccionada(s.fechaHora)}
                >
                  {s.hora}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="campo">
          <label htmlFor="motivo-turno">Motivo</label>
          <input id="motivo-turno" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: control, primera consulta…" />
        </div>

        <div className="grupo-botones" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secundario" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primario" onClick={confirmar} disabled={guardando}>
            {guardando ? <span className="spinner" /> : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
