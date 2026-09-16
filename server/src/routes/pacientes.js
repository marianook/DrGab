import { Router } from 'express';
import db from '../db.js';

const router = Router();

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

function conEspecialidades(paciente) {
  const rows = db
    .prepare('SELECT DISTINCT especialidad FROM consultas WHERE paciente_id = ?')
    .all(paciente.id);
  return { ...paciente, especialidadesAtendidas: rows.map((r) => r.especialidad) };
}

router.get('/', (req, res) => {
  const { search } = req.query;
  let rows;
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    rows = db
      .prepare(
        `SELECT * FROM pacientes WHERE nombre LIKE ? OR dni LIKE ? OR telefono LIKE ? OR email LIKE ?
         ORDER BY nombre COLLATE NOCASE ASC`
      )
      .all(q, q, q, q);
  } else {
    rows = db.prepare('SELECT * FROM pacientes ORDER BY nombre COLLATE NOCASE ASC').all();
  }
  res.json(rows.map(conEspecialidades));
});

router.get('/:id', (req, res) => {
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id);
  if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

  const consultas = db
    .prepare('SELECT * FROM consultas WHERE paciente_id = ? ORDER BY fecha DESC')
    .all(paciente.id)
    .map((c) => ({ ...c, datosVitales: JSON.parse(c.datos_vitales || '{}') }));

  const proximosTurnos = db
    .prepare(
      `SELECT * FROM turnos WHERE paciente_id = ? AND estado = 'pendiente' AND fecha_hora >= datetime('now')
       ORDER BY fecha_hora ASC`
    )
    .all(paciente.id);

  const medicamentos = db
    .prepare('SELECT * FROM medicamentos_prescriptos WHERE paciente_id = ? ORDER BY fecha DESC')
    .all(paciente.id);

  res.json({
    ...conEspecialidades(paciente),
    consultas,
    proximosTurnos,
    medicamentos,
  });
});

router.post('/', (req, res) => {
  const errores = validarPaciente(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  const {
    nombre,
    dni,
    fechaNacimiento = '',
    telefono = '',
    email = '',
    direccion = '',
    antecedentes = '',
    alergias = '',
    medicamentosActuales = '',
  } = req.body;

  try {
    const info = db
      .prepare(
        `INSERT INTO pacientes (nombre, dni, fecha_nacimiento, telefono, email, direccion, antecedentes, alergias, medicamentos_actuales)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(nombre.trim(), dni.trim(), fechaNacimiento, telefono, email, direccion, antecedentes, alergias, medicamentosActuales);
    const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(conEspecialidades(paciente));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un paciente con ese DNI' });
    }
    res.status(500).json({ error: 'Error al crear el paciente' });
  }
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Paciente no encontrado' });

  const errores = validarPaciente(req.body, { partial: true });
  if (errores.length) return res.status(400).json({ error: errores.join('. ') });

  const campos = [
    'nombre',
    'dni',
    'fechaNacimiento',
    'telefono',
    'email',
    'direccion',
    'antecedentes',
    'alergias',
    'medicamentosActuales',
    'notasPrivadas',
  ];
  const columnas = {
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

  const sets = [];
  const valores = [];
  for (const campo of campos) {
    if (req.body[campo] !== undefined) {
      sets.push(`${columnas[campo]} = ?`);
      valores.push(req.body[campo]);
    }
  }
  if (!sets.length) return res.json(conEspecialidades(existente));

  sets.push("updated_at = datetime('now')");
  valores.push(req.params.id);

  try {
    db.prepare(`UPDATE pacientes SET ${sets.join(', ')} WHERE id = ?`).run(...valores);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un paciente con ese DNI' });
    }
    return res.status(500).json({ error: 'Error al actualizar el paciente' });
  }
  const actualizado = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id);
  res.json(conEspecialidades(actualizado));
});

router.delete('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ error: 'Paciente no encontrado' });
  db.prepare('DELETE FROM pacientes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
