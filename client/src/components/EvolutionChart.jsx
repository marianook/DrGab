const COLORES = ['#2fa86a', '#4a90e2', '#e67e22', '#9b59b6'];

export default function EvolutionChart({ serie, campo, etiqueta, unidad = '' }) {
  const puntos = serie.filter((s) => s[campo] !== undefined && s[campo] !== null && s[campo] !== '');
  if (puntos.length < 2) {
    return (
      <div className="card">
        <h3>{etiqueta}</h3>
        <p style={{ color: 'var(--color-texto-suave)' }}>
          Se necesitan al menos 2 consultas con este dato para mostrar la evolución.
        </p>
      </div>
    );
  }

  const valores = puntos.map((p) => Number(p[campo]));
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const w = 600;
  const h = 200;
  const padX = 40;
  const padY = 24;

  const coords = puntos.map((p, i) => {
    const x = padX + (i * (w - padX * 2)) / (puntos.length - 1);
    const y = h - padY - ((Number(p[campo]) - min) * (h - padY * 2)) / rango;
    return { x, y, valor: p[campo], fecha: p.fecha };
  });

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const color = COLORES[0];

  return (
    <div className="card">
      <h3>
        {etiqueta} {unidad && <span style={{ fontWeight: 400, color: 'var(--color-texto-suave)' }}>({unidad})</span>}
      </h3>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="5" fill={color} />
            <text x={c.x} y={h - 4} fontSize="10" textAnchor="middle" style={{ fill: 'var(--color-texto-suave)' }}>
              {c.fecha?.slice(5)}
            </text>
            <text x={c.x} y={c.y - 10} fontSize="11" textAnchor="middle" style={{ fill: 'var(--color-texto)' }}>
              {c.valor}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
