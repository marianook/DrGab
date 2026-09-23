import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unico);
  },
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();

const ESPECIALIDADES = ['Clinica', 'Endocrinologia'];

function mapConsulta(c) {
  const adjuntos = db.prepare('SELECT * FROM adjuntos WHERE consulta_id = ?').all(c.id);
  return {
    ...c,
    datosVitales: JSON.parse(c.datos_vitales || '{}'),
    sugerenciasIA: c.sugerencias_ia ? JSON.parse(c.sugerencias_ia) : null,
    adjuntos,
  };
}

function guardarMedicamentos(pacienteId, consultaId, especialidad, medicamentos) {
  if (!Array.isArray(medicamentos)) return;
  const insert = db.prepare(
    `INSERT INTO medicamentos_prescriptos (paciente_id, consulta_id, especialidad, nombre, dosis, indicaciones)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const m of medicamentos) {
    if (!m || !m.nombre || !m.nombre.trim()) continue;
    insert.run(pacienteId, consultaId, especialidad, m.nombre.trim(), m.dosis || '', m.indicaciones || '');
  }
}

// Listar consultas de un paciente
router.get('/pacientes/:pacienteId/consultas', (req, res) => {
  const { especialidad } = req.query;
  let rows;
  if (especialidad) {
    rows = db
      .prepare('SELECT * FROM consultas WHERE paciente_id = ? AND especialidad = ? ORDER BY fecha DESC')
      .all(req.params.pacienteId, especialidad);
  } else {
    rows = db
      .prepare('SELECT * FROM consultas WHERE paciente_id = ? ORDER BY fecha DESC')
      .all(req.params.pacienteId);
  }
  res.json(rows.map(mapConsulta));
});

// Crear consulta
router.post('/pacientes/:pacienteId/consultas', (req, res) => {
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.pacienteId);
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

  const {
    especialidad,
    fecha,
    motivo = '',
    sintomas = '',
    diagnostico = '',
    tratamiento = '',
    notas = '',
    estudios = '',
    datosVitales = {},
    medicamentosPrescriptos = [],
  } = req.body || {};

  if (!ESPECIALIDADES.includes(especialidad)) {
    return res.status(400).json({ error: 'Especialidad inválida' });
  }
  if (!fecha) return res.status(400).json({ error: 'La fecha es obligatoria' });

  const info = db
    .prepare(
      `INSERT INTO consultas (paciente_id, especialidad, fecha, motivo, sintomas, diagnostico, tratamiento, notas, estudios, datos_vitales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      paciente.id,
      especialidad,
      fecha,
      motivo,
      sintomas,
      diagnostico,
      tratamiento,
      notas,
      estudios,
      JSON.stringify(datosVitales || {})
    );

  guardarMedicamentos(paciente.id, info.lastInsertRowid, especialidad, medicamentosPrescriptos);

  const consulta = db.prepare('SELECT * FROM consultas WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(mapConsulta(consulta));
});

router.get('/consultas/:id', (req, res) => {
  const consulta = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada' });
  res.json(mapConsulta(consulta));
});

router.put('/consultas/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Consulta no encontrada' });

  const campos = ['fecha', 'motivo', 'sintomas', 'diagnostico', 'tratamiento', 'notas', 'estudios'];
  const sets = [];
  const valores = [];
  for (const campo of campos) {
    if (req.body[campo] !== undefined) {
      sets.push(`${campo} = ?`);
      valores.push(req.body[campo]);
    }
  }
  if (req.body.datosVitales !== undefined) {
    sets.push('datos_vitales = ?');
    valores.push(JSON.stringify(req.body.datosVitales || {}));
  }
  if (req.body.resumenIA !== undefined) {
    sets.push('resumen_ia = ?');
    valores.push(req.body.resumenIA);
  }
  if (!sets.length) return res.json(mapConsulta(existente));

  valores.push(req.params.id);
  db.prepare(`UPDATE consultas SET ${sets.join(', ')} WHERE id = ?`).run(...valores);

  if (Array.isArray(req.body.medicamentosPrescriptos)) {
    guardarMedicamentos(existente.paciente_id, existente.id, existente.especialidad, req.body.medicamentosPrescriptos);
  }

  const actualizada = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  res.json(mapConsulta(actualizada));
});

router.delete('/consultas/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Consulta no encontrada' });

  const adjuntos = db.prepare('SELECT * FROM adjuntos WHERE consulta_id = ?').all(existente.id);
  for (const a of adjuntos) {
    const filePath = path.join(uploadsDir, a.nombre_archivo);
    fs.rm(filePath, { force: true }, () => {});
  }
  db.prepare('DELETE FROM consultas WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/consultas/:id/adjuntos', upload.single('archivo'), (req, res) => {
  const consulta = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada' });
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

  const info = db
    .prepare(
      `INSERT INTO adjuntos (consulta_id, nombre_original, nombre_archivo, tipo) VALUES (?, ?, ?, ?)`
    )
    .run(consulta.id, req.file.originalname, req.file.filename, req.file.mimetype);

  const adjunto = db.prepare('SELECT * FROM adjuntos WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(adjunto);
});

router.delete('/adjuntos/:id', (req, res) => {
  const adjunto = db.prepare('SELECT * FROM adjuntos WHERE id = ?').get(req.params.id);
  if (!adjunto) return res.status(404).json({ error: 'Adjunto no encontrado' });
  fs.rm(path.join(uploadsDir, adjunto.nombre_archivo), { force: true }, () => {});
  db.prepare('DELETE FROM adjuntos WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.get('/pacientes/:pacienteId/medicamentos', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM medicamentos_prescriptos WHERE paciente_id = ? ORDER BY fecha DESC')
    .all(req.params.pacienteId);
  res.json(rows);
});

export { uploadsDir };
export default router;
