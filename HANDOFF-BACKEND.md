# Backend + Mercado Pago — guía de traspaso

El backend **ya está completo** en este repo, incluida la integración con
Mercado Pago. No hay que programarlo desde cero: falta alojarlo en algún
lado y cargar las credenciales reales. Esta guía es para quien se encargue
de esa parte.

## Dónde está todo

```
server/
  src/
    index.js              # arranque del servidor Express
    db.js                 # conexión SQLite + migraciones automáticas
    schema.sql             # tablas: pacientes, consultas, turnos, precios_turno, etc.
    middleware/auth.js      # JWT (login único de la doctora)
    routes/
      auth.js
      pacientes.js
      consultas.js
      turnos.js             # turnos cargados por la doctora
      disponibilidad.js      # horarios de atención por especialidad
      precios.js             # precio del turno por especialidad
      public.js               # reserva pública de turnos + Mercado Pago
      claude.js               # IA opcional (Anthropic)
      stats.js
    utils/
      calendario.js          # cálculo de horarios disponibles
      mercadoPago.js          # crear preferencia de pago + consultar un pago
```

## Cómo funciona el pago hoy

- `server/src/utils/mercadoPago.js` ya tiene armado:
  - `crearPreferencia(...)`: crea la preferencia de pago (Checkout Pro) y
    devuelve el link al que hay que redirigir al paciente.
  - `obtenerPago(...)`: consulta un pago por su ID (lo usa el webhook).
- `server/src/routes/public.js` ya usa esas funciones en:
  - `POST /api/public/turnos`: si hay precio cargado para la especialidad
    **y** hay `MP_ACCESS_TOKEN` configurado, crea la preferencia y devuelve
    el link de pago. Si no, confirma el turno directo sin pedir pago.
  - `POST /api/public/pagos/webhook`: recibe la notificación de Mercado
    Pago cuando se acredita el pago y marca el turno como `pagado`.
- **Mientras `MP_ACCESS_TOKEN` esté vacío, todo funciona sin pedir pago**
  (para poder probar el resto del sistema). En cuanto se carga esa
  variable, el cobro se activa solo — no hay que tocar código.
- El precio por especialidad lo carga la doctora desde la app
  (**Configuración → Precio del turno**), no está hardcodeado.

## Checklist para poner el backend en producción

1. **Clonar el repo** y pararse en `server/`.
2. **Elegir dónde alojarlo.** Usa SQLite (un archivo en disco), así que
   **no puede ir en Netlify ni Vercel** (son serverless y borran el disco
   entre requests). Opciones simples que sí sirven:
   - [Railway](https://railway.app)
   - [Render](https://render.com)
   - [Fly.io](https://fly.io)
   - Un VPS cualquiera (correr `npm install && npm start`)
3. **Copiar `server/.env.example` a `.env`** (o cargar las mismas
   variables en el panel del hosting elegido):

   | Variable | Para qué sirve |
   |---|---|
   | `PORT` | Puerto de la API (lo suele fijar el hosting solo) |
   | `JWT_SECRET` | Firma la sesión — poner algo random y secreto |
   | `DOCTOR_USER` / `DOCTOR_PASSWORD` | Credenciales de acceso de la doctora |
   | `ANTHROPIC_API_KEY` | Opcional, habilita las funciones de IA |
   | `MP_ACCESS_TOKEN` | Access token de Mercado Pago — activa el cobro online |
   | `APP_URL` | URL pública del **frontend** en Netlify (a donde Mercado Pago devuelve al paciente tras pagar) |
   | `API_PUBLIC_URL` | URL pública de **este backend** (a donde Mercado Pago manda el webhook de pago) |

4. **Conseguir las credenciales de Mercado Pago** en el
   [panel de developers](https://www.mercadopago.com.ar/developers/panel):
   - Primero un *access token* de **prueba** (sandbox) para testear todo
     el flujo sin plata real.
   - Después el *access token* de **producción** para cobrar de verdad.
   - Se carga en `MP_ACCESS_TOKEN`, no hay ningún otro paso.
5. **Probar el webhook**: Mercado Pago necesita poder llegar a
   `API_PUBLIC_URL/api/public/pagos/webhook` desde internet, así que el
   backend tiene que estar desplegado (no sirve `localhost` salvo con un
   túnel tipo ngrok para pruebas locales).
6. **Conectar el frontend al backend real**: en las variables de entorno
   del sitio de Netlify, agregar:
   ```
   VITE_API_MODE=remote
   ```
   Hoy corre en modo `local` (todo en el localStorage del navegador). Con
   esta variable, la app deja de simular y empieza a hablar con este
   backend de verdad.

## Referencia rápida

- Documentación general del proyecto y variables de entorno: `README.md`
  (raíz del repo).
- Ejemplo de variables: `server/.env.example`.
- Esquema completo de la base de datos: `server/src/schema.sql`.
