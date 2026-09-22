import { Router } from 'express';
import db from '../db.js';
import { calcularSlots } from '../utils/calendario.js';

const router = Router();
const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];
const ESTADOS = ['pendiente', 'completado', 'cancelado'];
const ESTADOS_PAGO = ['no_requerido', 'pendiente', 'pagado', 'rechazado'];

function conPaciente(turno) {
  const paciente = db.prepare('SELECT id, nombre, dni, telefono FROM pacientes WHERE id = ?').get(turno.paciente_id);
  return { ...turno, paciente };
}

router.get('/', (req, res) => {
  const { especialidad, desde, hasta, estado } = req.query;
  const condiciones = [];
  const valores = [];

  if (especialidad) {
    condiciones.push('especialidad = ?');
    valores.push(especialidad);
  }
  if (estado) {
    condiciones.push('estado = ?');
    valores.push(estado);
  }
  if (desde) {
    condiciones.push('fecha_hora >= ?');
    valores.push(desde);
  }
  if (hasta) {
    condiciones.push('fecha_hora <= ?');
    valores.push(hasta);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM turnos ${where} ORDER BY fecha_hora ASC`).all(...valores);
  res.json(rows.map(conPaciente));
});

router.get('/proximos', (req, res) => {
  const { especialidad, limite = 5 } = req.query;
  const condiciones = ["estado = 'pendiente'", "fecha_hora >= datetime('now')"];
  const valores = [];
  if (especialidad) {
    condiciones.push('especialidad = ?');
    valores.push(especialidad);
  }
  const rows = db
    .prepare(
      `SELECT * FROM turnos WHERE ${condiciones.join(' AND ')} ORDER BY fecha_hora ASC LIMIT ?`
    )
    .all(...valores, Number(limite));
  res.json(rows.map(conPaciente));
});

router.get('/slots', (req, res) => {
  const { especialidad, fecha } = req.query;
  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });

  res.json(calcularSlots(db, especialidad, fecha));
});

router.post('/', (req, res) => {
  const { pacienteId, especialidad, fechaHora, motivo = '', duracion = 30 } = req.body || {};

  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!pacienteId || !fechaHora) {
    return res.status(400).json({ error: 'El paciente y la fecha/hora son obligatorios' });
  }
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId);
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

  const choque = db
    .prepare(
      `SELECT * FROM turnos WHERE especialidad = ? AND fecha_hora = ? AND estado != 'cancelado'`
    )
    .get(especialidad, fechaHora);
  if (choque) return res.status(409).json({ error: 'Ese horario ya está ocupado para la especialidad seleccionada' });

  const info = db
    .prepare(
      `INSERT INTO turnos (paciente_id, especialidad, fecha_hora, duracion, motivo, origen, estado_pago)
       VALUES (?, ?, ?, ?, ?, 'manual', 'no_requerido')`
    )
    .run(pacienteId, especialidad, fechaHora, duracion, motivo);

  const turno = db.prepare('SELECT * FROM turnos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(conPaciente(turno));
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM turnos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Turno no encontrado' });

  const { fechaHora, estado, motivo, estadoPago } = req.body || {};
  if (estado && !ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  if (estadoPago && !ESTADOS_PAGO.includes(estadoPago)) {
    return res.status(400).json({ error: 'Estado de pago inválido' });
  }

  if (fechaHora && fechaHora !== existente.fecha_hora) {
    const choque = db
      .prepare(
        `SELECT * FROM turnos WHERE especialidad = ? AND fecha_hora = ? AND estado != 'cancelado' AND id != ?`
      )
      .get(existente.especialidad, fechaHora, req.params.id);
    if (choque) return res.status(409).json({ error: 'Ese horario ya está ocupado para la especialidad seleccionada' });
  }

  const sets = [];
  const valores = [];
  if (fechaHora !== undefined) {
    sets.push('fecha_hora = ?');
    valores.push(fechaHora);
  }
  if (estado !== undefined) {
    sets.push('estado = ?');
    valores.push(estado);
  }
  if (motivo !== undefined) {
    sets.push('motivo = ?');
    valores.push(motivo);
  }
  if (estadoPago !== undefined) {
    sets.push('estado_pago = ?');
    valores.push(estadoPago);
  }
  if (sets.length) {
    valores.push(req.params.id);
    db.prepare(`UPDATE turnos SET ${sets.join(', ')} WHERE id = ?`).run(...valores);
  }

  const actualizado = db.prepare('SELECT * FROM turnos WHERE id = ?').get(req.params.id);
  res.json(conPaciente(actualizado));
});

router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM turnos WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Turno no encontrado' });
  db.prepare('DELETE FROM turnos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
