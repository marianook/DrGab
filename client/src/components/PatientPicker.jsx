import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useDebounce } from '../hooks/useDebounce.js';

export default function PatientPicker({ pacienteSeleccionado, onSeleccionar }) {
  const [texto, setTexto] = useState('');
  const debounced = useDebounce(texto, 250);
  const [resultados, setResultados] = useState([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      setResultados([]);
      return;
    }
    api.get(`/pacientes?search=${encodeURIComponent(debounced.trim())}`).then(setResultados);
  }, [debounced]);

  if (pacienteSeleccionado) {
    return (
      <div className="campo">
        <label>Paciente</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input disabled value={`${pacienteSeleccionado.nombre} — DNI ${pacienteSeleccionado.dni}`} />
          <button type="button" className="btn btn-secundario" onClick={() => onSeleccionar(null)}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campo" style={{ position: 'relative' }}>
      <label htmlFor="buscar-paciente">Paciente *</label>
      <input
        id="buscar-paciente"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar paciente por nombre o DNI…"
        autoComplete="off"
      />
      {abierto && resultados.length > 0 && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            maxHeight: 260,
            overflowY: 'auto',
            padding: 8,
          }}
        >
          {resultados.map((p) => (
            <button
              type="button"
              key={p.id}
              className="btn btn-ghost btn-bloque"
              style={{ justifyContent: 'flex-start', marginBottom: 6 }}
              onClick={() => {
                onSeleccionar(p);
                setAbierto(false);
                setTexto('');
              }}
            >
              {p.nombre} — DNI {p.dni}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
