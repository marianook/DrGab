import { createContext, useContext, useEffect, useState } from 'react';

const SpecialtyContext = createContext(null);
const KEY = 'drgab_especialidad';

export const ESPECIALIDADES = {
  Clinica: { nombre: 'Clínica', color: '#4a90e2', claseBtn: 'btn-clinica', claseBadge: 'badge-clinica' },
  Endocrinologia: {
    nombre: 'Endocrinología',
    color: '#2fa86a',
    claseBtn: 'btn-endocrino',
    claseBadge: 'badge-endocrino',
  },
};

export function SpecialtyProvider({ children }) {
  const [especialidad, setEspecialidadState] = useState(
    () => localStorage.getItem(KEY) || 'Clinica'
  );

  useEffect(() => {
    localStorage.setItem(KEY, especialidad);
  }, [especialidad]);

  const setEspecialidad = (valor) => setEspecialidadState(valor);

  return (
    <SpecialtyContext.Provider value={{ especialidad, setEspecialidad }}>
      {children}
    </SpecialtyContext.Provider>
  );
}

export function useSpecialty() {
  return useContext(SpecialtyContext);
}
