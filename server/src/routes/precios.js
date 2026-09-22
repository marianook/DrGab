import { Router } from 'express';
import db from '../db.js';

const router = Router();
const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM precios_turno ORDER BY especialidad').all();
  res.json(rows);
});

router.put('/:especialidad', (req, res) => {
  const { especialidad } = req.params;
  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  const { monto } = req.body || {};
  if (monto === undefined || Number.isNaN(Number(monto)) || Number(monto) < 0) {
    return res.status(400).json({ error: 'El monto no es válido' });
  }
  db.prepare('UPDATE precios_turno SET monto = ? WHERE especialidad = ?').run(Number(monto), especialidad);
  const row = db.prepare('SELECT * FROM precios_turno WHERE especialidad = ?').get(especialidad);
  res.json(row);
});

export default router;
