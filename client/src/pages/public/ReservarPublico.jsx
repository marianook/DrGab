import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ESPECIALIDADES } from '../../context/SpecialtyContext.jsx';
import { formatoISO } from '../../utils/calendario.js';

export default function ReservarPublico() {
  const { usuario } = useAuth();
  const [paso, setPaso] = useState('especialidad');
  const [especialidad, setEspecialidad] = useState('');
  const [fecha, setFecha] = useState(formatoISO(new Date()));
  const [slots, setSlots] = useState([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [precios, setPrecios] = useState({ pagoHabilitado: false, precios: {} });
  const [datos, setDatos] = useState({ nombre: '', dni: '', fechaNacimiento: '', telefono: '', email: '' });
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api.get('/public/precios').then(setPrecios).catch(() => {});
  }, []);

  useEffect(() => {
    if (!especialidad || !fecha) return;
    setCargandoSlots(true);
    setHoraSeleccionada('');
    api
      .get(`/public/slots?especialidad=${especialidad}&fecha=${fecha}`)
      .then((r) => setSlots(r.slots))
      .catch((e) => setError(e.message))
      .finally(() => setCargandoSlots(false));
  }, [especialidad, fecha]);

  const elegirEspecialidad = (esp) => {
    setError('');
    setEspecialidad(esp);
    setPaso('horario');
  };

  const confirmarHorario = () => {
    if (!horaSeleccionada) {
      setError('Elegí un horario disponible');
      return;
    }
    setError('');
    setPaso('datos');
  };

  const enviarReserva = async (e) => {
    e.preventDefault();
    setError('');
    if (!datos.nombre.trim() || !datos.dni.trim()) {
      setError('El nombre y el DNI son obligatorios');
      return;
    }
    setEnviando(true);
    try {
      const r = await api.post('/public/turnos', {
        especialidad,
        fechaHora: horaSeleccionada,
        motivo,
        paciente: datos,
      });
      if (r.requierePago && r.initPoint) {
        window.location.href = r.initPoint;
        return;
      }
      setResultado(r);
      setPaso('listo');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const infoEsp = especialidad ? ESPECIALIDADES[especialidad] : null;
  const montoEsp = especialidad ? precios.precios?.[especialidad] || 0 : 0;
  const pideMonto = precios.pagoHabilitado && montoEsp > 0;

  return (
    <div className="pagina-publica">
      <div className="card" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        {usuario && (
          <Link to="/turnos" style={{ display: 'inline-block', marginBottom: 8, fontWeight: 600 }}>
            ‹ Volver al panel
          </Link>
        )}
        <h1>Reservar turno</h1>
        <p className="ayuda">Dra. Gabriela Iñigo Diaz</p>

        {error && <div className="alerta alerta-error">{error}</div>}

        {paso === 'especialidad' && (
          <div className="grupo-botones" style={{ flexDirection: 'column' }}>
            {Object.entries(ESPECIALIDADES).map(([key, esp]) => (
              <button
                key={key}
                type="button"
                className={`btn ${esp.claseBtn} btn-bloque`}
                style={{ justifyContent: 'space-between', minHeight: 64 }}
                onClick={() => elegirEspecialidad(key)}
              >
                <span>{esp.nombre}</span>
                {precios.precios?.[key] > 0 && <span>${precios.precios[key]}</span>}
              </button>
            ))}
          </div>
        )}

        {paso === 'horario' && infoEsp && (
          <>
            <h2 style={{ color: infoEsp.color }}>{infoEsp.nombre}</h2>
            <div className="campo">
              <label htmlFor="fecha-publica">Fecha</label>
              <input
                id="fecha-publica"
                type="date"
                value={fecha}
                min={formatoISO(new Date())}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Horario disponible</label>
              {cargandoSlots ? (
                <p>Buscando horarios…</p>
              ) : slots.length === 0 ? (
                <p style={{ color: 'var(--color-texto-suave)' }}>No hay atención este día. Elegí otra fecha.</p>
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
            <div className="grupo-botones" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secundario" onClick={() => setPaso('especialidad')}>
                Volver
              </button>
              <button type="button" className="btn btn-primario" onClick={confirmarHorario}>
                Continuar
              </button>
            </div>
          </>
        )}

        {paso === 'datos' && infoEsp && (
          <form onSubmit={enviarReserva}>
            <h2 style={{ color: infoEsp.color }}>{infoEsp.nombre}</h2>
            <p className="ayuda">
              {new Date(horaSeleccionada).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}
            </p>

            <div className="form-grid dos-columnas">
              <div className="campo">
                <label htmlFor="nombre-pub">Nombre y apellido *</label>
                <input
                  id="nombre-pub"
                  value={datos.nombre}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="campo">
                <label htmlFor="dni-pub">DNI *</label>
                <input id="dni-pub" value={datos.dni} onChange={(e) => setDatos({ ...datos, dni: e.target.value })} required />
              </div>
              <div className="campo">
                <label htmlFor="nacimiento-pub">Fecha de nacimiento</label>
                <input
                  id="nacimiento-pub"
                  type="date"
                  value={datos.fechaNacimiento}
                  onChange={(e) => setDatos({ ...datos, fechaNacimiento: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="telefono-pub">Teléfono</label>
                <input
                  id="telefono-pub"
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="email-pub">Email</label>
                <input
                  id="email-pub"
                  type="email"
                  value={datos.email}
                  onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="motivo-pub">Motivo de la consulta</label>
                <input
                  id="motivo-pub"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: control, primera consulta…"
                />
              </div>
            </div>

            {pideMonto ? (
              <div className="alerta alerta-info" style={{ display: 'block', marginTop: 16 }}>
                Este turno tiene un costo de <strong>${montoEsp}</strong>. Al confirmar vas a ser redirigido a Mercado
                Pago para abonarlo.
              </div>
            ) : (
              <div className="alerta alerta-info" style={{ display: 'block', marginTop: 16 }}>
                Versión de prueba: por ahora no es necesario abonar para reservar.
              </div>
            )}

            <div className="grupo-botones" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secundario" onClick={() => setPaso('horario')}>
                Volver
              </button>
              <button type="submit" className="btn btn-primario" disabled={enviando}>
                {enviando ? <span className="spinner" /> : pideMonto ? 'Continuar al pago' : 'Confirmar reserva'}
              </button>
            </div>
          </form>
        )}

        {paso === 'listo' && resultado && (
          <div className="alerta alerta-exito" style={{ display: 'block' }}>
            <strong>¡Turno reservado!</strong>
            <p style={{ marginTop: 8 }}>
              Te esperamos el{' '}
              {new Date(resultado.turno.fecha_hora).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}.
            </p>
            {resultado.avisoPago && <p>{resultado.avisoPago}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
