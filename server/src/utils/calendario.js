export function sumarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatoISOFecha(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function ahoraLocalISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${formatoISOFecha(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function calcularSlots(db, especialidad, fecha) {
  const diaSemana = new Date(`${fecha}T00:00:00`).getDay();
  const bloques = db
    .prepare('SELECT * FROM disponibilidad WHERE especialidad = ? AND dia_semana = ? ORDER BY hora_inicio')
    .all(especialidad, diaSemana);

  const ocupados = new Set(
    db
      .prepare(
        `SELECT fecha_hora FROM turnos WHERE especialidad = ? AND estado != 'cancelado' AND date(fecha_hora) = date(?)`
      )
      .all(especialidad, fecha)
      .map((t) => t.fecha_hora)
  );

  const ahora = ahoraLocalISO();
  const slots = [];
  for (const bloque of bloques) {
    let hora = bloque.hora_inicio;
    while (hora < bloque.hora_fin) {
      const fechaHora = `${fecha}T${hora}:00`;
      if (fechaHora >= ahora) {
        slots.push({ hora, fechaHora, disponible: !ocupados.has(fechaHora) });
      }
      hora = sumarMinutos(hora, bloque.duracion_turno);
    }
  }
  return { fecha, especialidad, diaSemana, slots };
}

// Para la reserva pública: en vez de elegir un día a la vez, se navega por
// una ventana de N días (con << Retroceder / Avanzar >>) y se listan solo
// los días que tienen atención configurada para la especialidad.
export function calcularRangoSlots(db, especialidad, desdeISO, dias) {
  const resultado = [];
  const cursor = new Date(`${desdeISO}T00:00:00`);
  for (let i = 0; i < dias; i++) {
    const fecha = formatoISOFecha(cursor);
    const { diaSemana, slots } = calcularSlots(db, especialidad, fecha);
    if (slots.length > 0) resultado.push({ fecha, diaSemana, slots });
    cursor.setDate(cursor.getDate() + 1);
  }
  return resultado;
}
