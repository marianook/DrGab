import { Router } from 'express';
import db from '../db.js';
import { claudeDisponible, llamarClaude, extraerJSON } from '../utils/claude.js';

const router = Router();

router.get('/estado', (req, res) => {
  res.json({ disponible: claudeDisponible() });
});

router.post('/analizar-sintomas', async (req, res) => {
  if (!claudeDisponible()) {
    return res.status(503).json({ error: 'La función de IA no está configurada (falta ANTHROPIC_API_KEY)' });
  }

  const { pacienteId, especialidad, motivo = '', sintomas = '', datosVitales = {} } = req.body || {};
  if (!sintomas.trim()) return res.status(400).json({ error: 'Ingresá los síntomas para poder analizarlos' });

  const paciente = pacienteId ? db.prepare('SELECT * FROM pacientes WHERE id = ?').get(pacienteId) : null;
  const historial = pacienteId
    ? db
        .prepare(
          `SELECT fecha, especialidad, motivo, diagnostico, tratamiento FROM consultas
           WHERE paciente_id = ? ORDER BY fecha DESC LIMIT 8`
        )
        .all(pacienteId)
    : [];

  const contextoPaciente = paciente
    ? `Antecedentes: ${paciente.antecedentes || 'ninguno registrado'}
Alergias: ${paciente.alergias || 'ninguna registrada'}
Medicamentos actuales: ${paciente.medicamentos_actuales || 'ninguno registrado'}`
    : 'Sin datos previos del paciente.';

  const historialTexto = historial.length
    ? historial
        .map((h) => `- ${h.fecha} [${h.especialidad}] Motivo: ${h.motivo || '-'} | Diagnóstico: ${h.diagnostico || '-'} | Tratamiento: ${h.tratamiento || '-'}`)
        .join('\n')
    : 'Sin consultas previas registradas.';

  const vitalesTexto = Object.keys(datosVitales || {}).length
    ? Object.entries(datosVitales)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    : 'No se cargaron datos vitales en esta consulta.';

  const system = `Sos un asistente clínico que apoya a una médica de la especialidad ${especialidad} durante la consulta.
Respondé siempre en español, en formato JSON estricto (sin texto adicional fuera del JSON), con esta forma exacta:
{
  "diagnosticosDiferenciales": ["..."],
  "estudiosRecomendados": ["..."],
  "tratamientosPreviosRelevantes": ["..."],
  "alertasValores": ["..."],
  "observaciones": "texto breve"
}
No des un diagnóstico definitivo, son solo sugerencias de apoyo para que la médica decida. Sé conciso y específico para la especialidad ${especialidad}.
Si la especialidad es Endocrinología y hay valores de glucemia, HbA1c, TSH o perfil lipídico, analizalos en "alertasValores" y sugerí ajustes de tratamiento en "estudiosRecomendados" u "observaciones" según corresponda.`;

  const prompt = `Datos del paciente:
${contextoPaciente}

Historial de consultas previas:
${historialTexto}

Consulta actual:
Motivo: ${motivo || 'no especificado'}
Síntomas: ${sintomas}
Datos vitales: ${vitalesTexto}`;

  try {
    const texto = await llamarClaude({ system, prompt, maxTokens: 1024 });
    const json = extraerJSON(texto) || { observaciones: texto };
    res.json(json);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/resumen-consulta/:id', async (req, res) => {
  if (!claudeDisponible()) {
    return res.status(503).json({ error: 'La función de IA no está configurada (falta ANTHROPIC_API_KEY)' });
  }
  const consulta = db.prepare('SELECT * FROM consultas WHERE id = ?').get(req.params.id);
  if (!consulta) return res.status(404).json({ error: 'Consulta no encontrada' });
  const paciente = db.prepare('SELECT * FROM pacientes WHERE id = ?').get(consulta.paciente_id);

  const system = `Sos un asistente que redacta resúmenes clínicos breves y claros en español, de no más de 5 líneas, para el legajo de un paciente. No inventes datos que no estén en la información brindada.`;
  const prompt = `Paciente: ${paciente?.nombre || 'desconocido'}
Especialidad: ${consulta.especialidad}
Fecha: ${consulta.fecha}
Motivo: ${consulta.motivo}
Síntomas: ${consulta.sintomas}
Diagnóstico: ${consulta.diagnostico}
Tratamiento: ${consulta.tratamiento}
Notas: ${consulta.notas}
Datos vitales: ${consulta.datos_vitales}

Redactá un resumen breve de esta consulta.`;

  try {
    const resumen = await llamarClaude({ system, prompt, maxTokens: 400 });
    db.prepare('UPDATE consultas SET resumen_ia = ? WHERE id = ?').run(resumen, consulta.id);
    res.json({ resumen });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

export default router;
