import { getToken, setToken } from './tokenStorage.js';
import { sumarMinutos } from '../utils/calendario.js';

const DB_KEY = 'drgab_local_db_v1';
const DOCTOR_USER = 'doctor';
const DOCTOR_PASSWORD = 'doctor123';
const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];
const MAX_ADJUNTO_BYTES = 1.5 * 1024 * 1024;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function crearDBInicial() {
  const disponibilidad = [];
  let contador = 0;
  for (const dia of [1, 2, 3, 4, 5]) {
    disponibilidad.push({ id: ++contador, especialidad: 'Clinica', dia_semana: dia, hora_inicio: '08:00', hora_fin: '12:00', duracion_turno: 30 });
    disponibilidad.push({ id: ++contador, especialidad: 'Endocrinologia', dia_semana: dia, hora_inicio: '14:00', hora_fin: '18:00', duracion_turno: 30 });
  }
  return {
    counters: { pacientes: 0, consultas: 0, turnos: 0, medicamentos: 0, adjuntos: 0, disponibilidad: contador },
    pacientes: [],
    consultas: [],
    turnos: [],
    medicamentos: [],
    adjuntos: [],
    disponibilidad,
  };
}

function leerDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) throw new Error('vacío');
    return JSON.parse(raw);
  } catch {
    const inicial = crearDBInicial();
    localStorage.setItem(DB_KEY, JSON.stringify(inicial));
    return inicial;
  }
}

function guardarDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function siguienteId(db, coleccion) {
  db.counters[coleccion] += 1;
  return db.counters[coleccion];
}

function ahora() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function conEspecialidades(db, paciente) {
  const especialidadesAtendidas = [
    ...new Set(db.consultas.filter((c) => c.paciente_id === paciente.id).map((c) => c.especialidad)),
  ];
  return { ...paciente, especialidadesAtendidas };
}

function validarPaciente(body, { partial = false } = {}) {
  const errores = [];
  if (!partial || body.nombre !== undefined) {
    if (!body.nombre || !body.nombre.trim()) errores.push('El nombre es obligatorio');
  }
  if (!partial || body.dni !== undefined) {
    if (!body.dni || !body.dni.trim()) errores.push('El DNI es obligatorio');
  }
  if (body.email && body.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errores.push('El email no es válido');
  }
  return errores;
}

function mapConsulta(db, c) {
  const adjuntos = db.adjuntos.filter((a) => a.consulta_id === c.id);
  return { ...c, adjuntos };
}

function guardarMedicamentos(db, pacienteId, consultaId, especialidad, medicamentos) {
  if (!Array.isArray(medicamentos)) return;
  for (const m of medicamentos) {
    if (!m || !m.nombre || !m.nombre.trim()) continue;
    db.medicamentos.push({
      id: siguienteId(db, 'medicamentos'),
      paciente_id: pacienteId,
      consulta_id: consultaId,
      especialidad,
      nombre: m.nombre.trim(),
      dosis: m.dosis || '',
      indicaciones: m.indicaciones || '',
      fecha: ahora(),
    });
  }
}

function conPaciente(db, turno) {
  const p = db.pacientes.find((x) => x.id === turno.paciente_id);
  const paciente = p ? { id: p.id, nombre: p.nombre, dni: p.dni, telefono: p.telefono } : null;
  return { ...turno, paciente };
}

function leerArchivoComoDataURL(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

async function manejar(method, ruta, queryString, body) {
  const db = leerDB();
  const params = new URLSearchParams(queryString || '');
  let m;

  // --- auth ---
  if (method === 'POST' && ruta === '/auth/login') {
    const { usuario, password } = body || {};
    if (usuario !== DOCTOR_USER || password !== DOCTOR_PASSWORD) {
      throw new ApiError('Usuario o contraseña incorrectos', 401);
    }
    return { token: 'local-demo-token', usuario: DOCTOR_USER };
  }
  if (method === 'GET' && ruta === '/auth/me') {
    return { usuario: DOCTOR_USER, rol: 'medica' };
  }

  // --- pacientes ---
  if (method === 'GET' && ruta === '/pacientes') {
    const search = (params.get('search') || '').trim().toLowerCase();
    let rows = db.pacientes;
    if (search) {
      rows = rows.filter((p) =>
        [p.nombre, p.dni, p.telefono, p.email].some((v) => (v || '').toLowerCase().includes(search))
      );
    }
    rows = [...rows].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    return rows.map((p) => conEspecialidades(db, p));
  }

  if (method === 'POST' && ruta === '/pacientes') {
    const errores = validarPaciente(body);
    if (errores.length) throw new ApiError(errores.join('. '), 400);
    if (db.pacientes.some((p) => p.dni === body.dni.trim())) {
      throw new ApiError('Ya existe un paciente con ese DNI', 409);
    }
    const paciente = {
      id: siguienteId(db, 'pacientes'),
      nombre: body.nombre.trim(),
      dni: body.dni.trim(),
      fecha_nacimiento: body.fechaNacimiento || '',
      telefono: body.telefono || '',
      email: body.email || '',
      direccion: body.direccion || '',
      antecedentes: body.antecedentes || '',
      alergias: body.alergias || '',
      medicamentos_actuales: body.medicamentosActuales || '',
      notas_privadas: '',
      created_at: ahora(),
      updated_at: ahora(),
    };
    db.pacientes.push(paciente);
    guardarDB(db);
    return conEspecialidades(db, paciente);
  }

  if ((m = ruta.match(/^\/pacientes\/(\d+)$/))) {
    const id = Number(m[1]);
    const paciente = db.pacientes.find((p) => p.id === id);
    if (!paciente) throw new ApiError('Paciente no encontrado', 404);

    if (method === 'GET') {
      const consultas = db.consultas
        .filter((c) => c.paciente_id === id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      const proximosTurnos = db.turnos
        .filter((t) => t.paciente_id === id && t.estado === 'pendiente' && t.fecha_hora >= ahora())
        .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
      const medicamentos = db.medicamentos
        .filter((med) => med.paciente_id === id)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return { ...conEspecialidades(db, paciente), consultas, proximosTurnos, medicamentos };
    }

    if (method === 'PUT') {
      const errores = validarPaciente(body, { partial: true });
      if (errores.length) throw new ApiError(errores.join('. '), 400);
      if (body.dni !== undefined && db.pacientes.some((p) => p.id !== id && p.dni === body.dni.trim())) {
        throw new ApiError('Ya existe un paciente con ese DNI', 409);
      }
      const campos = {
        nombre: 'nombre',
        dni: 'dni',
        fechaNacimiento: 'fecha_nacimiento',
        telefono: 'telefono',
        email: 'email',
        direccion: 'direccion',
        antecedentes: 'antecedentes',
        alergias: 'alergias',
        medicamentosActuales: 'medicamentos_actuales',
        notasPrivadas: 'notas_privadas',
      };
      for (const [campoBody, campoDB] of Object.entries(campos)) {
        if (body[campoBody] !== undefined) {
          paciente[campoDB] = campoBody === 'nombre' || campoBody === 'dni' ? body[campoBody].trim() : body[campoBody];
        }
      }
      paciente.updated_at = ahora();
      guardarDB(db);
      return conEspecialidades(db, paciente);
    }

    if (method === 'DELETE') {
      const consultaIds = new Set(db.consultas.filter((c) => c.paciente_id === id).map((c) => c.id));
      db.adjuntos = db.adjuntos.filter((a) => !consultaIds.has(a.consulta_id));
      db.consultas = db.consultas.filter((c) => c.paciente_id !== id);
      db.turnos = db.turnos.filter((t) => t.paciente_id !== id);
      db.medicamentos = db.medicamentos.filter((med) => med.paciente_id !== id);
      db.pacientes = db.pacientes.filter((p) => p.id !== id);
      guardarDB(db);
      return null;
    }
  }

  // --- consultas ---
  if (method === 'POST' && (m = ruta.match(/^\/pacientes\/(\d+)\/consultas$/))) {
    const pacienteId = Number(m[1]);
    const paciente = db.pacientes.find((p) => p.id === pacienteId);
    if (!paciente) throw new ApiError('Paciente no encontrado', 404);
    const { especialidad, fecha, motivo = '', sintomas = '', diagnostico = '', tratamiento = '', notas = '', estudios = '', datosVitales = {}, medicamentosPrescriptos = [] } = body || {};
    if (!ESPECIALIDADES.includes(especialidad)) throw new ApiError('Especialidad inválida', 400);
    if (!fecha) throw new ApiError('La fecha es obligatoria', 400);

    const consulta = {
      id: siguienteId(db, 'consultas'),
      paciente_id: pacienteId,
      especialidad,
      fecha,
      motivo,
      sintomas,
      diagnostico,
      tratamiento,
      notas,
      estudios,
      datosVitales: datosVitales || {},
      resumen_ia: '',
      created_at: ahora(),
    };
    db.consultas.push(consulta);
    guardarMedicamentos(db, pacienteId, consulta.id, especialidad, medicamentosPrescriptos);
    guardarDB(db);
    return mapConsulta(db, consulta);
  }

  if ((m = ruta.match(/^\/consultas\/(\d+)$/))) {
    const id = Number(m[1]);
    const consulta = db.consultas.find((c) => c.id === id);
    if (!consulta) throw new ApiError('Consulta no encontrada', 404);

    if (method === 'GET') return mapConsulta(db, consulta);

    if (method === 'PUT') {
      const campos = ['fecha', 'motivo', 'sintomas', 'diagnostico', 'tratamiento', 'notas', 'estudios'];
      for (const campo of campos) {
        if (body[campo] !== undefined) consulta[campo] = body[campo];
      }
      if (body.datosVitales !== undefined) consulta.datosVitales = body.datosVitales || {};
      if (body.resumenIA !== undefined) consulta.resumen_ia = body.resumenIA;
      if (Array.isArray(body.medicamentosPrescriptos)) {
        guardarMedicamentos(db, consulta.paciente_id, consulta.id, consulta.especialidad, body.medicamentosPrescriptos);
      }
      guardarDB(db);
      return mapConsulta(db, consulta);
    }

    if (method === 'DELETE') {
      db.adjuntos = db.adjuntos.filter((a) => a.consulta_id !== id);
      db.medicamentos.forEach((med) => {
        if (med.consulta_id === id) med.consulta_id = null;
      });
      db.consultas = db.consultas.filter((c) => c.id !== id);
      guardarDB(db);
      return null;
    }
  }

  if (method === 'POST' && (m = ruta.match(/^\/consultas\/(\d+)\/adjuntos$/))) {
    const consultaId = Number(m[1]);
    const consulta = db.consultas.find((c) => c.id === consultaId);
    if (!consulta) throw new ApiError('Consulta no encontrada', 404);
    const archivo = body instanceof FormData ? body.get('archivo') : null;
    if (!archivo) throw new ApiError('No se recibió ningún archivo', 400);
    if (archivo.size > MAX_ADJUNTO_BYTES) {
      throw new ApiError('El archivo es muy grande para el modo de prueba local (máx. 1.5MB)', 400);
    }
    const dataUrl = await leerArchivoComoDataURL(archivo);
    const adjunto = {
      id: siguienteId(db, 'adjuntos'),
      consulta_id: consultaId,
      nombre_original: archivo.name,
      nombre_archivo: dataUrl,
      url: dataUrl,
      tipo: archivo.type,
      created_at: ahora(),
    };
    db.adjuntos.push(adjunto);
    guardarDB(db);
    return adjunto;
  }

  if (method === 'DELETE' && (m = ruta.match(/^\/adjuntos\/(\d+)$/))) {
    const id = Number(m[1]);
    if (!db.adjuntos.some((a) => a.id === id)) throw new ApiError('Adjunto no encontrado', 404);
    db.adjuntos = db.adjuntos.filter((a) => a.id !== id);
    guardarDB(db);
    return null;
  }

  // --- turnos ---
  if (method === 'GET' && ruta === '/turnos') {
    let rows = db.turnos;
    const especialidad = params.get('especialidad');
    const estado = params.get('estado');
    const desde = params.get('desde');
    const hasta = params.get('hasta');
    if (especialidad) rows = rows.filter((t) => t.especialidad === especialidad);
    if (estado) rows = rows.filter((t) => t.estado === estado);
    if (desde) rows = rows.filter((t) => t.fecha_hora >= desde);
    if (hasta) rows = rows.filter((t) => t.fecha_hora <= hasta);
    rows = [...rows].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    return rows.map((t) => conPaciente(db, t));
  }

  if (method === 'GET' && ruta === '/turnos/proximos') {
    const especialidad = params.get('especialidad');
    const limite = Number(params.get('limite') || 5);
    let rows = db.turnos.filter((t) => t.estado === 'pendiente' && t.fecha_hora >= ahora());
    if (especialidad) rows = rows.filter((t) => t.especialidad === especialidad);
    rows = [...rows].sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora)).slice(0, limite);
    return rows.map((t) => conPaciente(db, t));
  }

  if (method === 'GET' && ruta === '/turnos/slots') {
    const especialidad = params.get('especialidad');
    const fecha = params.get('fecha');
    if (!ESPECIALIDADES.includes(especialidad)) throw new ApiError('Especialidad inválida', 400);
    if (!fecha) throw new ApiError('La fecha es obligatoria', 400);

    const diaSemana = new Date(`${fecha}T00:00:00`).getDay();
    const bloques = db.disponibilidad
      .filter((b) => b.especialidad === especialidad && b.dia_semana === diaSemana)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    const ocupados = new Set(
      db.turnos
        .filter((t) => t.especialidad === especialidad && t.estado !== 'cancelado' && t.fecha_hora.startsWith(fecha))
        .map((t) => t.fecha_hora)
    );

    const slots = [];
    for (const bloque of bloques) {
      let hora = bloque.hora_inicio;
      while (hora < bloque.hora_fin) {
        const fechaHora = `${fecha}T${hora}:00`;
        slots.push({ hora, fechaHora, disponible: !ocupados.has(fechaHora) });
        hora = sumarMinutos(hora, bloque.duracion_turno);
      }
    }
    return { fecha, especialidad, diaSemana, slots };
  }

  if (method === 'POST' && ruta === '/turnos') {
    const { pacienteId, especialidad, fechaHora, motivo = '', duracion = 30 } = body || {};
    if (!ESPECIALIDADES.includes(especialidad)) throw new ApiError('Especialidad inválida', 400);
    if (!pacienteId || !fechaHora) throw new ApiError('El paciente y la fecha/hora son obligatorios', 400);
    if (!db.pacientes.some((p) => p.id === pacienteId)) throw new ApiError('Paciente no encontrado', 404);
    if (db.turnos.some((t) => t.especialidad === especialidad && t.fecha_hora === fechaHora && t.estado !== 'cancelado')) {
      throw new ApiError('Ese horario ya está ocupado para la especialidad seleccionada', 409);
    }
    const turno = {
      id: siguienteId(db, 'turnos'),
      paciente_id: pacienteId,
      especialidad,
      fecha_hora: fechaHora,
      duracion,
      motivo,
      estado: 'pendiente',
      created_at: ahora(),
    };
    db.turnos.push(turno);
    guardarDB(db);
    return conPaciente(db, turno);
  }

  if ((m = ruta.match(/^\/turnos\/(\d+)$/))) {
    const id = Number(m[1]);
    const turno = db.turnos.find((t) => t.id === id);
    if (!turno) throw new ApiError('Turno no encontrado', 404);

    if (method === 'PUT') {
      const { fechaHora, estado, motivo } = body || {};
      if (estado && !['pendiente', 'completado', 'cancelado'].includes(estado)) {
        throw new ApiError('Estado inválido', 400);
      }
      if (fechaHora && fechaHora !== turno.fecha_hora) {
        const choque = db.turnos.some(
          (t) => t.id !== id && t.especialidad === turno.especialidad && t.fecha_hora === fechaHora && t.estado !== 'cancelado'
        );
        if (choque) throw new ApiError('Ese horario ya está ocupado para la especialidad seleccionada', 409);
        turno.fecha_hora = fechaHora;
      }
      if (estado !== undefined) turno.estado = estado;
      if (motivo !== undefined) turno.motivo = motivo;
      guardarDB(db);
      return conPaciente(db, turno);
    }

    if (method === 'DELETE') {
      db.turnos = db.turnos.filter((t) => t.id !== id);
      guardarDB(db);
      return null;
    }
  }

  // --- disponibilidad ---
  if (method === 'GET' && ruta === '/disponibilidad') {
    const especialidad = params.get('especialidad');
    let rows = db.disponibilidad;
    if (especialidad) rows = rows.filter((d) => d.especialidad === especialidad);
    return [...rows].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio));
  }

  if (method === 'POST' && ruta === '/disponibilidad') {
    const { especialidad, diaSemana, horaInicio, horaFin, duracionTurno = 30 } = body || {};
    if (!ESPECIALIDADES.includes(especialidad)) throw new ApiError('Especialidad inválida', 400);
    if (diaSemana === undefined || diaSemana < 0 || diaSemana > 6) throw new ApiError('Día de la semana inválido', 400);
    if (!horaInicio || !horaFin || horaInicio >= horaFin) throw new ApiError('El horario ingresado no es válido', 400);
    const fila = { id: siguienteId(db, 'disponibilidad'), especialidad, dia_semana: diaSemana, hora_inicio: horaInicio, hora_fin: horaFin, duracion_turno: duracionTurno };
    db.disponibilidad.push(fila);
    guardarDB(db);
    return fila;
  }

  if (method === 'DELETE' && (m = ruta.match(/^\/disponibilidad\/(\d+)$/))) {
    const id = Number(m[1]);
    if (!db.disponibilidad.some((d) => d.id === id)) throw new ApiError('Disponibilidad no encontrada', 404);
    db.disponibilidad = db.disponibilidad.filter((d) => d.id !== id);
    guardarDB(db);
    return null;
  }

  // --- claude (deshabilitado en modo local: no se expone una API key en el navegador) ---
  if (method === 'GET' && ruta === '/claude/estado') {
    return { disponible: false };
  }
  if (method === 'POST' && (ruta === '/claude/analizar-sintomas' || /^\/claude\/resumen-consulta\/\d+$/.test(ruta))) {
    throw new ApiError('La función de IA no está disponible en el modo de prueba local', 503);
  }

  // --- stats ---
  if (method === 'GET' && ruta === '/stats') {
    const especialidad = params.get('especialidad');
    const consultas = especialidad ? db.consultas.filter((c) => c.especialidad === especialidad) : db.consultas;
    const turnos = especialidad ? db.turnos.filter((t) => t.especialidad === especialidad) : db.turnos;

    const contarPor = (items, campo) => {
      const mapa = new Map();
      for (const item of items) {
        const clave = item[campo];
        if (!clave) continue;
        mapa.set(clave, (mapa.get(clave) || 0) + 1);
      }
      return mapa;
    };

    const porMes = new Map();
    for (const c of consultas) {
      const mes = (c.fecha || '').slice(0, 7);
      if (!mes) continue;
      porMes.set(mes, (porMes.get(mes) || 0) + 1);
    }

    const porEspecialidad = contarPor(db.consultas, 'especialidad');
    const porEstadoTurno = contarPor(turnos, 'estado');
    const porMotivo = contarPor(consultas, 'motivo');

    const aArray = (mapa, clave) =>
      [...mapa.entries()].map(([k, v]) => ({ [clave]: k, cantidad: v }));

    return {
      totalConsultas: consultas.length,
      pacientesAtendidos: new Set(consultas.map((c) => c.paciente_id)).size,
      consultasPorMes: aArray(porMes, 'mes').sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 12),
      consultasPorEspecialidad: aArray(porEspecialidad, 'especialidad'),
      turnosPorEstado: aArray(porEstadoTurno, 'estado'),
      motivosFrecuentes: aArray(porMotivo, 'motivo').sort((a, b) => b.cantidad - a.cantidad).slice(0, 5),
    };
  }

  throw new ApiError(`No implementado en modo local: ${method} ${ruta}`, 501);
}

function separarRuta(path) {
  const [ruta, queryString] = path.split('?');
  return [ruta, queryString];
}

export const api = {
  async get(path) {
    const [ruta, qs] = separarRuta(path);
    return manejar('GET', ruta, qs);
  },
  async post(path, body) {
    const [ruta, qs] = separarRuta(path);
    return manejar('POST', ruta, qs, body);
  },
  async put(path, body) {
    const [ruta, qs] = separarRuta(path);
    return manejar('PUT', ruta, qs, body);
  },
  async del(path) {
    const [ruta, qs] = separarRuta(path);
    return manejar('DELETE', ruta, qs);
  },
  async postForm(path, formData) {
    const [ruta, qs] = separarRuta(path);
    return manejar('POST', ruta, qs, formData);
  },
};

export { ApiError, getToken, setToken };
