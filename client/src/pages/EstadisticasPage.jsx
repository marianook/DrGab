import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function BarraLista({ titulo, items, etiquetaKey, valorKey, color }) {
  const max = Math.max(1, ...items.map((i) => i[valorKey]));
  return (
    <div className="card">
      <h3>{titulo}</h3>
      {items.length === 0 ? (
        <p style={{ color: 'var(--color-texto-suave)' }}>Sin datos todavía.</p>
      ) : (
        items.map((i, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>{i[etiquetaKey] || 'Sin especificar'}</span>
              <strong>{i[valorKey]}</strong>
            </div>
            <div style={{ background: 'var(--color-fondo)', borderRadius: 6, overflow: 'hidden', height: 10 }}>
              <div style={{ width: `${(i[valorKey] / max) * 100}%`, background: color, height: '100%' }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default function EstadisticasPage() {
  const [filtro, setFiltro] = useState('todas');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = filtro === 'todas' ? '' : `?especialidad=${filtro}`;
    api
      .get(`/stats${q}`)
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [filtro]);

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>Estadísticas</h1>
        <div className="grupo-botones">
          <button className={`btn ${filtro === 'todas' ? 'btn-primario' : 'btn-secundario'}`} onClick={() => setFiltro('todas')}>
            Todas
          </button>
          <button className={`btn ${filtro === 'Clinica' ? 'btn-clinica' : 'btn-secundario'}`} onClick={() => setFiltro('Clinica')}>
            Clínica
          </button>
          <button
            className={`btn ${filtro === 'Endocrinologia' ? 'btn-endocrino' : 'btn-secundario'}`}
            onClick={() => setFiltro('Endocrinologia')}
          >
            Endocrinología
          </button>
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}
      {!stats ? (
        <div className="vacio">Cargando…</div>
      ) : (
        <>
          <div className="form-grid dos-columnas">
            <div className="card" style={{ textAlign: 'center' }}>
              <h3>Consultas totales</h3>
              <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-clinica-dark)' }}>{stats.totalConsultas}</p>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3>Pacientes atendidos</h3>
              <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-endocrino-dark)' }}>{stats.pacientesAtendidos}</p>
            </div>
          </div>

          <BarraLista titulo="Consultas por mes" items={stats.consultasPorMes} etiquetaKey="mes" valorKey="cantidad" color="#4a90e2" />
          <BarraLista
            titulo="Consultas por especialidad"
            items={stats.consultasPorEspecialidad}
            etiquetaKey="especialidad"
            valorKey="cantidad"
            color="#2fa86a"
          />
          <BarraLista titulo="Turnos por estado" items={stats.turnosPorEstado} etiquetaKey="estado" valorKey="cantidad" color="#e67e22" />
          <BarraLista titulo="Motivos de consulta más frecuentes" items={stats.motivosFrecuentes} etiquetaKey="motivo" valorKey="cantidad" color="#9b59b6" />
        </>
      )}
    </div>
  );
}
