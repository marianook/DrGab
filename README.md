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

## Puesta en marcha

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
- **IA (opcional, requiere `ANTHROPIC_API_KEY`)**: sugerencia de diagnósticos diferenciales y estudios recomendados a partir de los síntomas, análisis de valores de laboratorio en Endocrinología, y generación de resúmenes automáticos de consulta.
- **Extras**: alertas de valores clínicos críticos, gráficos de evolución (glucemia, HbA1c, peso, TSH), estadísticas por especialidad, modo oscuro, dictado por voz de síntomas/notas (Chrome/Edge), impresión de consulta/receta con membrete por especialidad.

## Notas de seguridad

- El login es único (una sola médica) mediante usuario/contraseña configurados por variables de entorno y sesión JWT.
- Pensado para uso en red local/consultorio; si se expone a internet, usar HTTPS y cambiar `JWT_SECRET` y `DOCTOR_PASSWORD`.
