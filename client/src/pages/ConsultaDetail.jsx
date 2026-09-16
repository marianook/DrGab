import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import EspecialidadBadge from '../components/EspecialidadBadge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { ESPECIALIDADES } from '../context/SpecialtyContext.jsx';
import { calcularAlertas } from '../utils/vitales.js';

const ETIQUETAS_VITALES = {
  presionArterial: 'Presión arterial',
  frecuenciaCardiaca: 'Frecuencia cardíaca',
  peso: 'Peso',
  altura: 'Altura',
  imc: 'IMC',
  glucemia: 'Glucemia',
  hba1c: 'HbA1c',
  insulina: 'Insulina',
  tsh: 'TSH',
  colesterolTotal: 'Colesterol total',
  ldl: 'LDL',
  hdl: 'HDL',
  trigliceridos: 'Triglicéridos',
};

export default function ConsultaDetail() {
  const { consultaId } = useParams();
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [error, setError] = useState('');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [generandoResumen, setGenerandoResumen] = useState(false);
  const [resumenError, setResumenError] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef(null);

  const cargar = () => {
    api
      .get(`/consultas/${consultaId}`)
      .then((c) => {
        setConsulta(c);
        return api.get(`/pacientes/${c.paciente_id}`);
      })
      .then(setPaciente)
      .catch((e) => setError(e.message));
  };

  useEffect(cargar, [consultaId]);

  const eliminar = async () => {
    await api.del(`/consultas/${consultaId}`);
    navigate(`/pacientes/${consulta.paciente_id}`);
  };

  const generarResumen = async () => {
    setResumenError('');
    setGenerandoResumen(true);
    try {
      const { resumen } = await api.post(`/claude/resumen-consulta/${consultaId}`);
      setConsulta((c) => ({ ...c, resumen_ia: resumen }));
    } catch (e) {
      setResumenError(e.message);
    } finally {
      setGenerandoResumen(false);
    }
  };

  const subirArchivo = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      await api.postForm(`/consultas/${consultaId}/adjuntos`, formData);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const eliminarAdjunto = async (adjuntoId) => {
    await api.del(`/adjuntos/${adjuntoId}`);
    cargar();
  };

  if (error) return <div className="alerta alerta-error">{error}</div>;
  if (!consulta || !paciente) return <div className="vacio">Cargando…</div>;

  const alertas = calcularAlertas(consulta.especialidad, consulta.datosVitales);
  const infoEsp = ESPECIALIDADES[consulta.especialidad];

  return (
    <div>
      <div className="encabezado-pagina no-imprimir">
        <div>
          <h1>Consulta — {consulta.fecha}</h1>
          <p>
            <Link to={`/pacientes/${paciente.id}`}>{paciente.nombre}</Link> · DNI {paciente.dni}
          </p>
        </div>
        <div className="grupo-botones">
          <button className="btn btn-secundario" onClick={() => window.print()}>
            🖨️ Imprimir / PDF
          </button>
          <Link to={`/consultas/${consultaId}/editar`} className="btn btn-secundario">
            Editar
          </Link>
          <button className="btn btn-peligro" onClick={() => setConfirmarEliminar(true)}>
            Eliminar
          </button>
        </div>
      </div>

      <div className="imprimible">
        <div className="membrete" style={{ color: infoEsp.color }}>
          <div>
            <h2>DrGab · Consultorio de {infoEsp.nombre}</h2>
            <p>Paciente: {paciente.nombre} — DNI {paciente.dni}</p>
            <p>Fecha de consulta: {consulta.fecha}</p>
          </div>
        </div>

        <div className="card">
          <EspecialidadBadge especialidad={consulta.especialidad} />
          <p style={{ marginTop: 8 }}>
            <strong>Motivo:</strong> {consulta.motivo || '—'}
          </p>
          <p>
            <strong>Síntomas:</strong> {consulta.sintomas || '—'}
          </p>
          <p>
            <strong>Diagnóstico:</strong> {consulta.diagnostico || '—'}
          </p>
          <p>
            <strong>Tratamiento:</strong> {consulta.tratamiento || '—'}
          </p>
          {consulta.notas && (
            <p>
              <strong>Notas:</strong> {consulta.notas}
            </p>
          )}
          {consulta.estudios && (
            <p>
              <strong>Estudios / observaciones:</strong> {consulta.estudios}
            </p>
          )}
        </div>

        {Object.keys(consulta.datosVitales || {}).length > 0 && (
          <div className="card">
            <h3>Datos vitales</h3>
            <div className="form-grid dos-columnas">
              {Object.entries(consulta.datosVitales).map(([k, v]) => (
                <p key={k}>
                  <strong>{ETIQUETAS_VITALES[k] || k}:</strong> {v}
                </p>
              ))}
            </div>
            {alertas.length > 0 && (
              <div className="no-imprimir">
                {alertas.map((a, i) => (
                  <div key={i} className="alerta alerta-critica">
                    {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {consulta.resumen_ia && (
          <div className="card no-imprimir">
            <h3>Resumen generado con IA</h3>
            <p>{consulta.resumen_ia}</p>
          </div>
        )}
      </div>

      <div className="card no-imprimir">
        <button className="btn btn-secundario" onClick={generarResumen} disabled={generandoResumen}>
          {generandoResumen ? <span className="spinner" /> : '🤖 Generar resumen automático'}
        </button>
        {resumenError && <div className="alerta alerta-error" style={{ marginTop: 12 }}>{resumenError}</div>}
      </div>

      <div className="card no-imprimir">
        <h3>Adjuntos / resultados de estudios</h3>
        {consulta.adjuntos.length === 0 && <p style={{ color: 'var(--color-texto-suave)' }}>No hay archivos adjuntos.</p>}
        {consulta.adjuntos.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <a href={`/uploads/${a.nombre_archivo}`} target="_blank" rel="noreferrer">
              📎 {a.nombre_original}
            </a>
            <button className="btn btn-peligro" style={{ minHeight: 40, padding: '6px 14px' }} onClick={() => eliminarAdjunto(a.id)}>
              Quitar
            </button>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <input ref={fileRef} type="file" onChange={subirArchivo} disabled={subiendo} />
        </div>
      </div>

      {confirmarEliminar && (
        <ConfirmModal
          titulo="¿Eliminar esta consulta?"
          mensaje="Se perderán los datos de esta consulta y sus adjuntos. Esta acción no se puede deshacer."
          onConfirmar={eliminar}
          onCancelar={() => setConfirmarEliminar(false)}
        />
      )}
    </div>
  );
}
