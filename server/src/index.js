import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import pacientesRoutes from './routes/pacientes.js';
import consultasRoutes, { uploadsDir } from './routes/consultas.js';
import turnosRoutes from './routes/turnos.js';
import disponibilidadRoutes from './routes/disponibilidad.js';
import claudeRoutes from './routes/claude.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/pacientes', requireAuth, pacientesRoutes);
app.use('/api', requireAuth, consultasRoutes);
app.use('/api/turnos', requireAuth, turnosRoutes);
app.use('/api/disponibilidad', requireAuth, disponibilidadRoutes);
app.use('/api/claude', requireAuth, claudeRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DrGab API escuchando en http://localhost:${PORT}`);
});
