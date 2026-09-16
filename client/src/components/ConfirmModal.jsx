export default function ConfirmModal({ titulo, mensaje, onConfirmar, onCancelar, peligro = true, textoConfirmar = 'Eliminar' }) {
  return (
    <div className="modal-fondo" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>{titulo}</h2>
        <p style={{ fontSize: 16, color: 'var(--color-texto-suave)' }}>{mensaje}</p>
        <div className="grupo-botones" style={{ marginTop: 16 }}>
          <button className="btn btn-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className={`btn ${peligro ? 'btn-peligro' : 'btn-primario'}`} onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
