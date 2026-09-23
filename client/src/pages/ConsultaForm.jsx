import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useSpecialty } from '../context/SpecialtyContext.jsx';
import { VITALES_CONFIG, calcularAlertas, calcularIMC } from '../utils/vitales.js';
import VoiceInputButton from '../components/VoiceInputButton.jsx';

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function ConsultaForm() {
  const { id: pacienteIdParam, consultaId } = useParams();
  const editando = Boolean(consultaId);
  const navigate = useNavigate();
  const { especialidad: especialidadActiva } = useSpecialty();

  const [pacienteId, setPacienteId] = useState(pacienteIdParam || null);
  const [paciente, setPaciente] = useState(null);
  const [especialidad, setEspecialidad] = useState(especialidadActiva);
  const [form, setForm] = useState({
    fecha: hoyISO(),
    motivo: '',
    sintomas: '',
    diagnostico: '',
    tratamiento: '',
    notas: '',
    estudios: '',
  });
  const [vitales, setVitales] = useState({});
  const [medicamentos, setMedicamentos] = useState([]);
  const [cargando, setCargando] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [iaDisponible, setIaDisponible] = useState(false);
  const [iaCargando, setIaCargando] = useState(false);
  const [iaResultado, setIaResultado] = useState(null);
  const [iaError, setIaError] = useState('');

  useEffect(() => {
    api.get('/claude/estado').then((r) => setIaDisponible(r.disponible)).catch(() => {});
  }, []);

  useEffect(() => {
    if (editando) {
      api
        .get(`/consultas/${consultaId}`)
        .then((c) => {
          setPacienteId(c.paciente_id);
          setEspecialidad(c.especialidad);
          setForm({
            fecha: c.fecha,
            motivo: c.motivo || '',
            sintomas: c.sintomas || '',
            diagnostico: c.diagnostico || '',
            tratamiento: c.tratamiento || '',
            notas: c.notas || '',
            estudios: c.estudios || '',
          });
          setVitales(c.datosVitales || {});
          return api.get(`/pacientes/${c.paciente_id}`);
        })
        .then(setPaciente)
        .catch((e) => setError(e.message))
        .finally(() => setCargando(false));
    } else if (pacienteIdParam) {
      api.get(`/pacientes/${pacienteIdParam}`).then(setPaciente).catch((e) => setError(e.message));
    }
  }, [editando, consultaId, pacienteIdParam]);

  const camposVitales = VITALES_CONFIG[especialidad] || [];
  const alertas = useMemo(() => calcularAlertas(especialidad, vitales), [especialidad, vitales]);

  const setCampo = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const setVital = (campo) => (e) => setVitales({ ...vitales, [campo]: e.target.value });

  const agregarMedicamento = () => setMedicamentos([...medicamentos, { nombre: '', dosis: '', indicaciones: '' }]);
  const quitarMedicamento = (i) => setMedicamentos(medicamentos.filter((_, idx) => idx !== i));
  const setMedicamento = (i, campo) => (e) => {
    const copia = [...medicamentos];
    copia[i] = { ...copia[i], [campo]: e.target.value };
    setMedicamentos(copia);
  };

  const analizarConIA = async () => {
    setIaError('');
    setIaResultado(null);
    if (!form.sintomas.trim()) {
      setIaError('Ingresá los síntomas antes de analizar.');
      return;
    }
    setIaCargando(true);
    try {
      const res = await api.post('/claude/analizar-sintomas', {
        pacienteId,
        especialidad,
        motivo: form.motivo,
        sintomas: form.sintomas,
        datosVitales: vitales,
      });
      setIaResultado(res);
    } catch (e) {
      setIaError(e.message);
    } finally {
      setIaCargando(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fecha) {
      setError('La fecha es obligatoria');
      return;
    }
    const datosVitales = { ...vitales };
    if (especialidad === 'Clinica') {
      const imc = calcularIMC(vitales.peso, vitales.altura);
      if (imc) datosVitales.imc = imc;
    }

    setGuardando(true);
    try {
      if (editando) {
        await api.put(`/consultas/${consultaId}`, { ...form, datosVitales, medicamentosPrescriptos: medicamentos });
        navigate(`/consultas/${consultaId}`);
      } else {
        const creada = await api.post(`/pacientes/${pacienteId}/consultas`, {
          especialidad,
          ...form,
          datosVitales,
          medicamentosPrescriptos: medicamentos,
        });
        navigate(`/consultas/${creada.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const agregarTexto = useCallback(
    (campo) => (textoNuevo) => setForm((f) => ({ ...f, [campo]: (f[campo] ? f[campo] + ' ' : '') + textoNuevo })),
    []
  );

  if (cargando) return <div className="vacio">Cargando…</div>;

  return (
    <div>
      <div className="encabezado-pagina">
        <h1>{editando ? 'Editar consulta' : 'Nueva consulta'}</h1>
        {paciente && <p style={{ color: 'var(--color-texto-suave)' }}>{paciente.nombre} · DNI {paciente.dni}</p>}
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="card">
          <div className="form-grid dos-columnas">
            <div className="campo">
              <label>Especialidad</label>
              {editando ? (
                <input value={especialidad === 'Clinica' ? 'Clínica' : 'Endocrinología'} disabled />
              ) : (
                <div className="grupo-botones">
                  <button
                    type="button"
                    className={`btn ${especialidad === 'Clinica' ? 'btn-clinica' : 'btn-secundario'}`}
                    onClick={() => setEspecialidad('Clinica')}
                  >
                    Clínica
                  </button>
                  <button
                    type="button"
                    className={`btn ${especialidad === 'Endocrinologia' ? 'btn-endocrino' : 'btn-secundario'}`}
                    onClick={() => setEspecialidad('Endocrinologia')}
                  >
                    Endocrinología
                  </button>
                </div>
              )}
            </div>
            <div className="campo">
              <label htmlFor="fecha">Fecha *</label>
              <input id="fecha" type="date" value={form.fecha} onChange={setCampo('fecha')} />
            </div>
          </div>
          <div className="campo" style={{ marginTop: 16 }}>
            <label htmlFor="motivo">Motivo de consulta</label>
            <input id="motivo" value={form.motivo} onChange={setCampo('motivo')} placeholder="Ej: control, dolor abdominal…" />
          </div>
        </div>

        <div className="card">
          <h3>Datos vitales — {especialidad === 'Clinica' ? 'Clínica' : 'Endocrinología'}</h3>
          <div className="form-grid dos-columnas">
            {camposVitales.map((campo) => (
              <div className="campo" key={campo.key}>
                <label htmlFor={campo.key}>
                  {campo.label} {campo.unidad && <span style={{ fontWeight: 400 }}>({campo.unidad})</span>}
                </label>
                <input
                  id={campo.key}
                  type={campo.tipo === 'number' ? 'number' : 'text'}
                  step="any"
                  placeholder={campo.placeholder}
                  value={vitales[campo.key] ?? ''}
                  onChange={setVital(campo.key)}
                />
              </div>
            ))}
            {especialidad === 'Clinica' && vitales.peso && vitales.altura && (
              <div className="campo">
                <label>IMC calculado</label>
                <input disabled value={calcularIMC(vitales.peso, vitales.altura) ?? ''} />
              </div>
            )}
          </div>

          {alertas.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {alertas.map((a, i) => (
                <div key={i} className="alerta alerta-critica">
                  {a}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="sintomas" style={{ fontWeight: 600 }}>
              Síntomas
            </label>
            <VoiceInputButton onResultado={agregarTexto('sintomas')} />
          </div>
          <div className="campo">
            <textarea id="sintomas" value={form.sintomas} onChange={setCampo('sintomas')} placeholder="Describí los síntomas relatados…" />
          </div>

          {iaDisponible ? (
            <div style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-primario" onClick={analizarConIA} disabled={iaCargando}>
                {iaCargando ? <span className="spinner" /> : '🤖 Analizar síntomas con IA'}
              </button>
              {iaError && <div className="alerta alerta-error" style={{ marginTop: 12 }}>{iaError}</div>}
              {iaResultado && (
                <div className="alerta alerta-info" style={{ marginTop: 12, display: 'block' }}>
                  {iaResultado.diagnosticosDiferenciales?.length > 0 && (
                    <div>
                      <strong>Diagnósticos diferenciales a considerar:</strong>
                      <ul>
                        {iaResultado.diagnosticosDiferenciales.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {iaResultado.estudiosRecomendados?.length > 0 && (
                    <div>
                      <strong>Estudios recomendados:</strong>
                      <ul>
                        {iaResultado.estudiosRecomendados.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {iaResultado.tratamientosPreviosRelevantes?.length > 0 && (
                    <div>
                      <strong>Tratamientos previos relevantes:</strong>
                      <ul>
                        {iaResultado.tratamientosPreviosRelevantes.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {iaResultado.alertasValores?.length > 0 && (
                    <div>
                      <strong>Alertas sobre valores:</strong>
                      <ul>
                        {iaResultado.alertasValores.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {iaResultado.observaciones && (
                    <p>
                      <strong>Observaciones:</strong> {iaResultado.observaciones}
                    </p>
                  )}
                  <p style={{ fontSize: 13, marginTop: 8 }}>
                    Estas sugerencias son solo de apoyo y no reemplazan el criterio médico.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="ayuda">La sugerencia de diagnósticos con IA no está disponible (falta configurar ANTHROPIC_API_KEY).</p>
          )}
        </div>

        <div className="card">
          <div className="form-grid">
            <div className="campo">
              <label htmlFor="diagnostico">Diagnóstico</label>
              <textarea id="diagnostico" value={form.diagnostico} onChange={setCampo('diagnostico')} />
            </div>
            <div className="campo">
              <label htmlFor="tratamiento">Tratamiento</label>
              <textarea id="tratamiento" value={form.tratamiento} onChange={setCampo('tratamiento')} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 600 }} htmlFor="notas">
                  Notas de la consulta
                </label>
                <VoiceInputButton onResultado={agregarTexto('notas')} />
              </div>
              <div className="campo">
                <textarea id="notas" value={form.notas} onChange={setCampo('notas')} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="estudios">Observaciones / resultados de estudios</label>
              <textarea id="estudios" value={form.estudios} onChange={setCampo('estudios')} placeholder="Resultados de laboratorio, ecografías, etc." />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="encabezado-pagina">
            <h3 style={{ margin: 0 }}>Medicamentos prescriptos en esta consulta</h3>
            <button type="button" className="btn btn-secundario" onClick={agregarMedicamento}>
              + Agregar medicamento
            </button>
          </div>
          {medicamentos.map((m, i) => (
            <div className="form-grid dos-columnas" key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-borde)' }}>
              <div className="campo">
                <label>Nombre</label>
                <input value={m.nombre} onChange={setMedicamento(i, 'nombre')} />
              </div>
              <div className="campo">
                <label>Dosis</label>
                <input value={m.dosis} onChange={setMedicamento(i, 'dosis')} placeholder="Ej: 850mg cada 12hs" />
              </div>
              <div className="campo" style={{ gridColumn: '1 / -1' }}>
                <label>Indicaciones</label>
                <input value={m.indicaciones} onChange={setMedicamento(i, 'indicaciones')} />
              </div>
              <button type="button" className="btn btn-peligro" onClick={() => quitarMedicamento(i)}>
                Quitar
              </button>
            </div>
          ))}
        </div>

        <div className="grupo-botones" style={{ marginBottom: 32 }}>
          <button type="button" className="btn btn-secundario" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            {guardando ? <span className="spinner" /> : 'Guardar consulta'}
          </button>
        </div>
      </form>
    </div>
  );
}
