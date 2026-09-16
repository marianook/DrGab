import { NOMBRES_DIA, NOMBRES_MES, formatoISO, obtenerCeldasDelMes } from '../utils/calendario.js';
import './Calendar.css';

export default function Calendar({ anio, mes, onCambiarMes, estadosPorDia, diaSeleccionado, onSeleccionarDia }) {
  const celdas = obtenerCeldasDelMes(anio, mes);
  const hoyISO = formatoISO(new Date());

  return (
    <div className="calendario">
      <div className="calendario-header">
        <button type="button" className="btn btn-ghost" onClick={() => onCambiarMes(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <h3>
          {NOMBRES_MES[mes]} {anio}
        </h3>
        <button type="button" className="btn btn-ghost" onClick={() => onCambiarMes(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>

      <div className="calendario-dias-semana">
        {NOMBRES_DIA.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendario-grilla">
        {celdas.map((celda) => {
          const estado = estadosPorDia[celda.iso] || 'sin-atencion';
          const clases = [
            'calendario-celda',
            !celda.enMes ? 'fuera-de-mes' : '',
            celda.iso === hoyISO ? 'hoy' : '',
            celda.iso === diaSeleccionado ? 'seleccionado' : '',
            `estado-${estado}`,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              type="button"
              key={celda.iso}
              className={clases}
              onClick={() => onSeleccionarDia(celda.iso)}
              disabled={!celda.enMes}
            >
              {celda.fecha.getDate()}
            </button>
          );
        })}
      </div>

      <div className="calendario-leyenda">
        <span>
          <i className="punto disponible" /> Disponible
        </span>
        <span>
          <i className="punto ocupado" /> Turno completo
        </span>
        <span>
          <i className="punto seleccionado-punto" /> Seleccionado
        </span>
      </div>
    </div>
  );
}
