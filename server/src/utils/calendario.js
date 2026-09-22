export function sumarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
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
