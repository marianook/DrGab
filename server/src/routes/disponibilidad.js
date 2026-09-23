import { Router } from 'express';
import db from '../db.js';

const router = Router();
const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];

router.get('/', (req, res) => {
  const { especialidad } = req.query;
  let rows;
  if (especialidad) {
    rows = db
      .prepare('SELECT * FROM disponibilidad WHERE especialidad = ? ORDER BY dia_semana, hora_inicio')
      .all(especialidad);
  } else {
    rows = db.prepare('SELECT * FROM disponibilidad ORDER BY especialidad, dia_semana, hora_inicio').all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const { especialidad, diaSemana, horaInicio, horaFin, duracionTurno = 30 } = req.body || {};
  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (diaSemana === undefined || diaSemana < 0 || diaSemana > 6) {
    return res.status(400).json({ error: 'Día de la semana inválido' });
  }
  if (!horaInicio || !horaFin || horaInicio >= horaFin) {
    return res.status(400).json({ error: 'El horario ingresado no es válido' });
  }

  const info = db
    .prepare(
      `INSERT INTO disponibilidad (especialidad, dia_semana, hora_inicio, hora_fin, duracion_turno)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(especialidad, diaSemana, horaInicio, horaFin, duracionTurno);
  const row = db.prepare('SELECT * FROM disponibilidad WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM disponibilidad WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Disponibilidad no encontrada' });
  db.prepare('DELETE FROM disponibilidad WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
