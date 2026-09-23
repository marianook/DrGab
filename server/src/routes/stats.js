import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { especialidad } = req.query;
  const filtroEsp = especialidad ? 'WHERE especialidad = ?' : '';
  const args = especialidad ? [especialidad] : [];

  const totalConsultas = db.prepare(`SELECT COUNT(*) c FROM consultas ${filtroEsp}`).get(...args).c;

  const pacientesAtendidos = db
    .prepare(`SELECT COUNT(DISTINCT paciente_id) c FROM consultas ${filtroEsp}`)
    .get(...args).c;

  const consultasPorMes = db
    .prepare(
      `SELECT strftime('%Y-%m', fecha) AS mes, COUNT(*) AS cantidad FROM consultas ${filtroEsp}
       GROUP BY mes ORDER BY mes DESC LIMIT 12`
    )
    .all(...args);

  const consultasPorEspecialidad = db
    .prepare(`SELECT especialidad, COUNT(*) AS cantidad FROM consultas GROUP BY especialidad`)
    .all();

  const turnosPorEstado = db
    .prepare(
      `SELECT estado, COUNT(*) AS cantidad FROM turnos ${filtroEsp} GROUP BY estado`
    )
    .all(...args);

  const motivos = especialidad
    ? db
        .prepare(
          `SELECT motivo, COUNT(*) AS cantidad FROM consultas WHERE especialidad = ? AND motivo != ''
           GROUP BY motivo ORDER BY cantidad DESC LIMIT 5`
        )
        .all(especialidad)
    : db
        .prepare(
          `SELECT motivo, COUNT(*) AS cantidad FROM consultas WHERE motivo != ''
           GROUP BY motivo ORDER BY cantidad DESC LIMIT 5`
        )
        .all();

  res.json({
    totalConsultas,
    pacientesAtendidos,
    consultasPorMes,
    consultasPorEspecialidad,
    turnosPorEstado,
    motivosFrecuentes: motivos,
  });
});

router.get('/evolucion/:pacienteId', (req, res) => {
  const rows = db
    .prepare(
      `SELECT fecha, datos_vitales FROM consultas WHERE paciente_id = ? AND especialidad = 'Endocrinologia' ORDER BY fecha ASC`
    )
    .all(req.params.pacienteId);

  const serie = rows.map((r) => ({ fecha: r.fecha, ...JSON.parse(r.datos_vitales || '{}') }));
  res.json(serie);
});

export default router;
