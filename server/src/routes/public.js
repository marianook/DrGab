import { Router } from 'express';
import db from '../db.js';
import { calcularSlots, calcularRangoSlots } from '../utils/calendario.js';
import { mpConfigurado, crearPreferencia, obtenerPago } from '../utils/mercadoPago.js';

const router = Router();
const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];

function validarDatosPaciente(paciente) {
  const errores = [];
  if (!paciente || !paciente.nombre || !paciente.nombre.trim()) errores.push('El nombre es obligatorio');
  if (!paciente || !paciente.dni || !paciente.dni.trim()) errores.push('El DNI es obligatorio');
  if (paciente?.email && paciente.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paciente.email)) {
    errores.push('El email no es válido');
  }
  return errores;
}

function buscarOCrearPaciente(datos) {
  const dni = datos.dni.trim();
  const existente = db.prepare('SELECT * FROM pacientes WHERE dni = ?').get(dni);
  if (existente) return existente;

  const info = db
    .prepare(
      `INSERT INTO pacientes (nombre, dni, fecha_nacimiento, telefono, email)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(datos.nombre.trim(), dni, datos.fechaNacimiento || '', datos.telefono || '', datos.email || '');
  return db.prepare('SELECT * FROM pacientes WHERE id = ?').get(info.lastInsertRowid);
}

router.get('/precios', (req, res) => {
  const rows = db.prepare('SELECT * FROM precios_turno').all();
  const precios = {};
  for (const r of rows) precios[r.especialidad] = r.monto;
  res.json({ pagoHabilitado: mpConfigurado(), precios });
});

router.get('/slots', (req, res) => {
  const { especialidad, fecha } = req.query;
  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });
  res.json(calcularSlots(db, especialidad, fecha));
});

router.get('/slots-rango', (req, res) => {
  const { especialidad, desde, dias } = req.query;
  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!desde) return res.status(400).json({ error: 'La fecha de inicio es obligatoria' });
  const cantidadDias = Math.min(Math.max(Number(dias) || 14, 1), 31);
  const diasConTurnos = calcularRangoSlots(db, especialidad, desde, cantidadDias);
  res.json({ desde, dias: diasConTurnos });
});

router.post('/turnos', async (req, res) => {
  const { especialidad, fechaHora, motivo = '', paciente } = req.body || {};

  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!fechaHora) return res.status(400).json({ error: 'La fecha y hora son obligatorias' });

  const erroresPaciente = validarDatosPaciente(paciente);
  if (erroresPaciente.length) return res.status(400).json({ error: erroresPaciente.join('. ') });

  const choque = db
    .prepare(`SELECT * FROM turnos WHERE especialidad = ? AND fecha_hora = ? AND estado != 'cancelado'`)
    .get(especialidad, fechaHora);
  if (choque) return res.status(409).json({ error: 'Ese horario ya no está disponible, elegí otro' });

  const pacienteRow = buscarOCrearPaciente(paciente);
  const precioRow = db.prepare('SELECT monto FROM precios_turno WHERE especialidad = ?').get(especialidad);
  const monto = precioRow?.monto || 0;
  const pagoRequerido = mpConfigurado() && monto > 0;

  const info = db
    .prepare(
      `INSERT INTO turnos (paciente_id, especialidad, fecha_hora, motivo, origen, estado_pago, pago_monto)
       VALUES (?, ?, ?, ?, 'publico', ?, ?)`
    )
    .run(pacienteRow.id, especialidad, fechaHora, motivo, pagoRequerido ? 'pendiente' : 'no_requerido', monto);
  const turnoId = info.lastInsertRowid;

  if (!pagoRequerido) {
    const turno = db.prepare('SELECT * FROM turnos WHERE id = ?').get(turnoId);
    return res.status(201).json({ turno, requierePago: false });
  }

  try {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const apiPublicUrl = process.env.API_PUBLIC_URL || 'http://localhost:4000';
    const preferencia = await crearPreferencia({ turnoId, especialidad, monto, appUrl, apiPublicUrl });
    db.prepare('UPDATE turnos SET pago_id = ? WHERE id = ?').run(String(preferencia.id), turnoId);
    const turno = db.prepare('SELECT * FROM turnos WHERE id = ?').get(turnoId);
    res.status(201).json({ turno, requierePago: true, initPoint: preferencia.init_point });
  } catch (e) {
    // Si Mercado Pago falla, no perdemos la reserva: queda pendiente de pago
    // y la doctora puede confirmarla manualmente desde su panel de turnos.
    console.error('Error al crear la preferencia de pago:', e);
    const turno = db.prepare('SELECT * FROM turnos WHERE id = ?').get(turnoId);
    res.status(201).json({
      turno,
      requierePago: true,
      initPoint: null,
      avisoPago: 'No se pudo iniciar el pago online. Tu turno quedó reservado y pendiente de pago.',
    });
  }
});

router.post('/pagos/webhook', async (req, res) => {
  try {
    const tipo = req.query.type || req.query.topic || req.body?.type;
    const paymentId = req.query['data.id'] || req.query.id || req.body?.data?.id;

    if (tipo !== 'payment' || !paymentId) {
      return res.status(200).end();
    }

    const pago = await obtenerPago(paymentId);
    const turnoId = Number(pago.external_reference);
    if (!turnoId) return res.status(200).end();

    const estadoPago = pago.status === 'approved' ? 'pagado' : pago.status === 'rejected' ? 'rechazado' : 'pendiente';
    db.prepare('UPDATE turnos SET estado_pago = ?, pago_id = ? WHERE id = ?').run(estadoPago, String(paymentId), turnoId);
    res.status(200).end();
  } catch (e) {
    console.error('Error al procesar el webhook de Mercado Pago:', e);
    res.status(200).end();
  }
});

export default router;
