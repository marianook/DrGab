export function formatoISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function obtenerCeldasDelMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const inicioGrilla = new Date(primerDia);
  inicioGrilla.setDate(primerDia.getDate() - primerDia.getDay());

  const celdas = [];
  const cursor = new Date(inicioGrilla);
  for (let i = 0; i < 42; i++) {
    celdas.push({
      fecha: new Date(cursor),
      iso: formatoISO(cursor),
      enMes: cursor.getMonth() === mes,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return celdas;
}

export function sumarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function slotsPosiblesPorDia(bloques) {
  return bloques.reduce((total, b) => {
    const [hi, mi] = b.hora_inicio.split(':').map(Number);
    const [hf, mf] = b.hora_fin.split(':').map(Number);
    const minutos = hf * 60 + mf - (hi * 60 + mi);
    return total + Math.floor(minutos / b.duracion_turno);
  }, 0);
}

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
