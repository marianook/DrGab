import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';

const VACIO = {
  nombre: '',
  dni: '',
  fechaNacimiento: '',
  telefono: '',
  email: '',
  direccion: '',
  antecedentes: '',
  alergias: '',
  medicamentosActuales: '',
};

export default function PacienteForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    api
      .get(`/pacientes/${id}`)
      .then((p) =>
        setForm({
          nombre: p.nombre || '',
          dni: p.dni || '',
          fechaNacimiento: p.fecha_nacimiento || '',
          telefono: p.telefono || '',
          email: p.email || '',
          direccion: p.direccion || '',
          antecedentes: p.antecedentes || '',
          alergias: p.alergias || '',
          medicamentosActuales: p.medicamentos_actuales || '',
        })
      )
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id, editando]);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre.trim() || !form.dni.trim()) {
      setError('El nombre y el DNI son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/pacientes/${id}`, form);
        navigate(`/pacientes/${id}`);
      } else {
        const creado = await api.post('/pacientes', form);
        navigate(`/pacientes/${creado.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="vacio">Cargando…</div>;

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>{editando ? 'Editar paciente' : 'Nuevo paciente'}</h1>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <form onSubmit={onSubmit} className="card">
        <h3>Datos personales</h3>
        <div className="form-grid dos-columnas">
          <div className="campo">
            <label htmlFor="nombre">Nombre completo *</label>
            <input id="nombre" value={form.nombre} onChange={set('nombre')} autoFocus />
          </div>
          <div className="campo">
            <label htmlFor="dni">DNI *</label>
            <input id="dni" value={form.dni} onChange={set('dni')} inputMode="numeric" />
          </div>
          <div className="campo">
            <label htmlFor="fechaNacimiento">Fecha de nacimiento</label>
            <input id="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} />
          </div>
          <div className="campo">
            <label htmlFor="telefono">Teléfono</label>
            <input id="telefono" value={form.telefono} onChange={set('telefono')} inputMode="tel" />
          </div>
          <div className="campo">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className="campo">
            <label htmlFor="direccion">Dirección</label>
            <input id="direccion" value={form.direccion} onChange={set('direccion')} />
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Historia clínica base</h3>
        <div className="form-grid">
          <div className="campo">
            <label htmlFor="antecedentes">Antecedentes médicos</label>
            <textarea id="antecedentes" value={form.antecedentes} onChange={set('antecedentes')} placeholder="Ej: hipertensión, cirugías previas…" />
          </div>
          <div className="campo">
            <label htmlFor="alergias">Alergias</label>
            <textarea id="alergias" value={form.alergias} onChange={set('alergias')} placeholder="Ej: penicilina, ibuprofeno…" />
          </div>
          <div className="campo">
            <label htmlFor="medicamentosActuales">Medicamentos actuales</label>
            <textarea
              id="medicamentosActuales"
              value={form.medicamentosActuales}
              onChange={set('medicamentosActuales')}
              placeholder="Ej: metformina 850mg cada 12hs…"
            />
          </div>
        </div>

        <div className="grupo-botones" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-secundario" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? <span className="spinner" /> : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
