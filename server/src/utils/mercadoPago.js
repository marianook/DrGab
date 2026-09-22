const MP_API = 'https://api.mercadopago.com';

// La integración queda "armada" pero inactiva hasta que se cargue MP_ACCESS_TOKEN
// en el .env: así se puede probar todo el flujo de reserva sin pasarela real,
// y activarla más adelante sin tocar código.
export function mpConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

function nombreEspecialidad(especialidad) {
  return especialidad === 'Clinica' ? 'Clínica' : 'Endocrinología';
}

export async function crearPreferencia({ turnoId, especialidad, monto, appUrl, apiPublicUrl }) {
  const token = process.env.MP_ACCESS_TOKEN;
  const body = {
    items: [
      {
        title: `Turno de ${nombreEspecialidad(especialidad)} — Dra. Gabriela Iñigo Diaz`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: Number(monto),
      },
    ],
    external_reference: String(turnoId),
    back_urls: {
      success: `${appUrl}/#/reservar/confirmacion?estado=aprobado`,
      pending: `${appUrl}/#/reservar/confirmacion?estado=pendiente`,
      failure: `${appUrl}/#/reservar/confirmacion?estado=rechazado`,
    },
    auto_return: 'approved',
    notification_url: `${apiPublicUrl}/api/public/pagos/webhook`,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`Error al crear la preferencia de pago en Mercado Pago: ${texto}`);
  }
  return res.json();
}

export async function obtenerPago(paymentId) {
  const token = process.env.MP_ACCESS_TOKEN;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudo consultar el pago en Mercado Pago');
  return res.json();
}
