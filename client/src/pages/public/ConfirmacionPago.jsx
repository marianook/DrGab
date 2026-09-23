import { Link, useSearchParams } from 'react-router-dom';

const MENSAJES = {
  aprobado: {
    titulo: '¡Pago aprobado!',
    clase: 'alerta-exito',
    texto: 'Tu turno quedó confirmado. Te esperamos en el consultorio.',
  },
  pendiente: {
    titulo: 'Pago pendiente',
    clase: 'alerta-info',
    texto: 'Tu pago está siendo procesado. Te confirmaremos el turno en cuanto se acredite.',
  },
  rechazado: {
    titulo: 'Pago rechazado',
    clase: 'alerta-error',
    texto: 'No pudimos procesar el pago. Podés intentar reservar de nuevo.',
  },
};

export default function ConfirmacionPago() {
  const [params] = useSearchParams();
  const estado = params.get('estado') || 'pendiente';
  const info = MENSAJES[estado] || MENSAJES.pendiente;

  return (
    <div className="pagina-publica">
      <div className="card" style={{ maxWidth: 480, margin: '0 auto', width: '100%', textAlign: 'center' }}>
        <h1>{info.titulo}</h1>
        <div className={`alerta ${info.clase}`} style={{ display: 'block' }}>
          {info.texto}
        </div>
        <Link to="/reservar" className="btn btn-secundario" style={{ marginTop: 16 }}>
          Volver a reservar
        </Link>
      </div>
    </div>
  );
}
