import { ESPECIALIDADES } from '../context/SpecialtyContext.jsx';

export default function EspecialidadBadge({ especialidad }) {
  const info = ESPECIALIDADES[especialidad] || { nombre: especialidad, claseBadge: 'badge-clinica' };
  return <span className={`badge ${info.claseBadge}`}>{info.nombre}</span>;
}
