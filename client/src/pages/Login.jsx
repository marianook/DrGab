import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MODO_API } from '../api/client.js';

export default function Login() {
  const { usuario, login } = useAuth();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(form.usuario.trim(), form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #4a90e2, #2fa86a)',
        padding: 16,
      }}
    >
      <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ textAlign: 'center', color: 'var(--color-clinica-dark)' }}>DrGab</h1>
        <p style={{ textAlign: 'center', color: 'var(--color-texto-suave)', marginBottom: 24 }}>
          Historia Clínica Digital y Turnos
        </p>

        {error && <div className="alerta alerta-error">{error}</div>}

        <div className="form-grid">
          <div className="campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              autoFocus
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
              placeholder="doctor"
              autoComplete="username"
            />
          </div>
          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primario btn-bloque" disabled={enviando} type="submit">
            {enviando ? <span className="spinner" /> : 'Ingresar'}
          </button>
          {MODO_API === 'local' && (
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-texto-suave)' }}>
              Modo de prueba: usuario <strong>doctor</strong> / contraseña <strong>doctor123</strong>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
