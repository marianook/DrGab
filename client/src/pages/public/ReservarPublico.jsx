import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ESPECIALIDADES } from '../../context/SpecialtyContext.jsx';
import { formatoISO } from '../../utils/calendario.js';

const VENTANA_DIAS = 14;
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function sumarDias(base, cantidad) {
  const d = new Date(base);
  d.setDate(d.getDate() + cantidad);
  return d;
}

function formatoDiaCorto(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

export default function ReservarPublico() {
  const { usuario } = useAuth();
  const [paso, setPaso] = useState('especialidad');
  const [especialidad, setEspecialidad] = useState('');
  const [offsetDias, setOffsetDias] = useState(0);
  const [dias, setDias] = useState([]);
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

  const desdeVentana = formatoISO(sumarDias(new Date(), offsetDias));
  const hastaVentana = formatoISO(sumarDias(new Date(), offsetDias + VENTANA_DIAS - 1));

  useEffect(() => {
    if (!especialidad) return;
    setCargandoSlots(true);
    setHoraSeleccionada('');
    api
      .get(`/public/slots-rango?especialidad=${especialidad}&desde=${desdeVentana}&dias=${VENTANA_DIAS}`)
      .then((r) => setDias(r.dias))
      .catch((e) => setError(e.message))
      .finally(() => setCargandoSlots(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidad, desdeVentana]);

  const elegirEspecialidad = (esp) => {
    setError('');
    setEspecialidad(esp);
    setOffsetDias(0);
    setPaso('horario');
  };

  const elegirHorario = (fechaHora) => {
    setError('');
    setHoraSeleccionada(fechaHora);
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

            <div className="navegador-fechas">
              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => setOffsetDias((o) => Math.max(0, o - VENTANA_DIAS))}
                disabled={offsetDias === 0}
              >
                ‹‹ Retroceder
              </button>
              <strong style={{ fontSize: 14, textAlign: 'center' }}>
                Turnos desde {formatoDiaCorto(desdeVentana)} hasta {formatoDiaCorto(hastaVentana)}
              </strong>
              <button type="button" className="btn btn-secundario" onClick={() => setOffsetDias((o) => o + VENTANA_DIAS)}>
                Avanzar ››
              </button>
            </div>

            {cargandoSlots ? (
              <p>Buscando horarios…</p>
            ) : dias.length === 0 ? (
              <p style={{ color: 'var(--color-texto-suave)' }}>
                No hay turnos configurados en este rango de fechas. Probá avanzar para ver más adelante.
              </p>
            ) : (
              dias.map((dia) => (
                <div key={dia.fecha} style={{ marginBottom: 16 }}>
                  <div className={`barra-dia ${infoEsp.claseBtn}`}>{formatoDiaCorto(dia.fecha)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {dia.slots.map((s) => (
                      <button
                        type="button"
                        key={s.hora}
                        disabled={!s.disponible}
                        className="btn btn-secundario"
                        style={{ minWidth: 84, opacity: s.disponible ? 1 : 0.4 }}
                        onClick={() => elegirHorario(s.fechaHora)}
                      >
                        {s.hora}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="grupo-botones" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-secundario" onClick={() => setPaso('especialidad')}>
                Volver
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
