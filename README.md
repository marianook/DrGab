# DrGab

Sistema Médico para Gabriela Iñigo Diaz — Historia Clínica Digital y Reserva de Turnos, optimizado para uso en tablet durante la consulta.

## Estructura del proyecto

```
DrGab/
  server/   API en Node.js + Express + SQLite (better-sqlite3)
  client/   Aplicación React (Vite), mobile/tablet-first
```

## Requisitos

- Node.js 18 o superior

## Modo de datos: local (localStorage) vs. backend real

El frontend puede funcionar de dos formas, controladas por `client/src/api/client.js`:

- **`local` (modo actual por defecto)**: todo se guarda en el `localStorage` del navegador. No hace falta backend corriendo. Pensado para probar la interfaz y el flujo completo antes de invertir en el backend. Los datos son **por navegador** (no se comparten entre dispositivos ni sobreviven a un "borrar datos del sitio"). La IA y los adjuntos grandes no están disponibles en este modo.
- **`remote`**: habla con la API real en `server/` (SQLite persistente, IA con Claude, adjuntos en disco).

Para pasar a modo remoto cuando el backend esté listo, en `client/.env`:

```
VITE_API_MODE=remote
```

No hace falta tocar ningún componente: todas las pantallas usan `client/src/api/client.js` sin saber cuál de los dos modos está activo.

## Puesta en marcha

### Probar solo el frontend (sin backend)

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

Entrás con usuario `doctor` / contraseña `doctor123` (fijos en modo local) y ya podés usar todo el sistema.

### Deploy en Vercel / Netlify (solo frontend, modo local)

Como en modo `local` no depende de ningún backend, se puede desplegar el `client/` tal cual en Vercel o Netlify:

- **Vercel**: importar el repo, configurar el *root directory* en `client/`, build command `npm run build`, output `dist`. Ya incluye `vercel.json` con el rewrite para que las rutas de React Router funcionen.
- **Netlify**: mismo *base directory* `client/`, build command `npm run build`, publish directory `client/dist`. Ya incluye `public/_redirects` para las rutas de React Router.

### 1. Backend

```bash
cd server
cp .env.example .env   # ajustar usuario/contraseña y ANTHROPIC_API_KEY si se desea
npm install
npm run dev             # http://localhost:4000
```

Variables de entorno (`server/.env`):

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto de la API | `4000` |
| `JWT_SECRET` | Secreto para firmar la sesión | (cambiar en producción) |
| `DOCTOR_USER` | Usuario de acceso | `doctor` |
| `DOCTOR_PASSWORD` | Contraseña de acceso | `doctor123` |
| `ANTHROPIC_API_KEY` | Habilita las sugerencias con IA (opcional) | vacío = función deshabilitada |
| `MP_ACCESS_TOKEN` | Access token de Mercado Pago; habilita el cobro online en la reserva pública (opcional) | vacío = reserva pública sin pago |
| `APP_URL` | URL pública del frontend (a donde Mercado Pago devuelve al paciente tras pagar) | `http://localhost:5173` |
| `API_PUBLIC_URL` | URL pública de este backend (a donde Mercado Pago envía la notificación de pago) | `http://localhost:4000` |

La base de datos SQLite se guarda en `server/data/clinic.db` (persistente entre reinicios) y los archivos adjuntos en `server/uploads/`.

### 2. Frontend

```bash
cd client
npm install
npm run dev              # http://localhost:5173
```

El servidor de desarrollo de Vite redirige `/api` y `/uploads` hacia el backend en `localhost:4000`.

Para producción: `npm run build` genera `client/dist`, que puede servirse con cualquier servidor estático (o agregando `express.static` al backend).

## Funcionalidades

- **Pacientes**: alta, búsqueda instantánea, edición, perfil completo con antecedentes, alergias, medicamentos actuales y notas privadas.
- **Historia clínica**: consultas por especialidad (Clínica / Endocrinología) con datos vitales específicos, diagnóstico, tratamiento, medicamentos prescriptos, adjuntos de estudios, y cronología filtrable.
- **Turnos**: calendario mensual táctil, disponibilidad semanal configurable por especialidad, reserva/cancelación/reprogramación, recordatorio de próximos turnos.
- **Reserva pública de turnos** (`/#/reservar`, sin login): el propio paciente elige especialidad, fecha y horario disponible según la disponibilidad configurada por la doctora, y se identifica con nombre y DNI (si el DNI ya existe, se usa esa ficha; si no, se crea una nueva) para que el turno quede asentado en su historia clínica. La doctora sigue pudiendo cargar turnos manualmente desde su panel (ej. pacientes que llaman por teléfono). El enlace para compartir con pacientes está en **Configuración**.
  - **Pago del turno (Mercado Pago, opcional)**: en Configuración se puede cargar un precio por especialidad. Si además el backend tiene `MP_ACCESS_TOKEN` configurado, la reserva pública redirige a Mercado Pago (Checkout Pro) para cobrar antes de confirmar el turno, y un webhook actualiza el estado de pago automáticamente. **Mientras no se cargue `MP_ACCESS_TOKEN`, todo el flujo funciona igual pero sin pedir pago** (el turno queda confirmado directo), para poder probar el sistema completo antes de activar el cobro online. La doctora también puede marcar un turno como "pagado" manualmente desde su panel de turnos (ej. si el paciente pagó en efectivo o por transferencia).
  - En el **modo local (localStorage)** la reserva pública funciona igual, pero el pago siempre queda "no requerido": al no haber backend ni credenciales reales, no tiene sentido simular una pasarela de pago ahí.
- **IA (opcional, requiere `ANTHROPIC_API_KEY`)**: sugerencia de diagnósticos diferenciales y estudios recomendados a partir de los síntomas, análisis de valores de laboratorio en Endocrinología, y generación de resúmenes automáticos de consulta.
- **Extras**: alertas de valores clínicos críticos, gráficos de evolución (glucemia, HbA1c, peso, TSH), estadísticas por especialidad, modo oscuro, dictado por voz de síntomas/notas (Chrome/Edge), impresión de consulta/receta con membrete por especialidad.

## Notas de seguridad

- El login es único (una sola médica) mediante usuario/contraseña configurados por variables de entorno y sesión JWT.
- Pensado para uso en red local/consultorio; si se expone a internet, usar HTTPS y cambiar `JWT_SECRET` y `DOCTOR_PASSWORD`.
