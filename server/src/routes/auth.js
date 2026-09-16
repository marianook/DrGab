import { Router } from 'express';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { usuario, password } = req.body || {};
  const validUser = process.env.DOCTOR_USER || 'doctor';
  const validPass = process.env.DOCTOR_PASSWORD || 'doctor123';

  if (usuario !== validUser || password !== validPass) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const token = signToken({ usuario: validUser, rol: 'medica' });
  res.json({ token, usuario: validUser });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ usuario: req.user.usuario, rol: req.user.rol });
});

export default router;
