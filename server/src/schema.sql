CREATE TABLE IF NOT EXISTS pacientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  fecha_nacimiento TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  antecedentes TEXT DEFAULT '',
  alergias TEXT DEFAULT '',
  medicamentos_actuales TEXT DEFAULT '',
  notas_privadas TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  especialidad TEXT NOT NULL CHECK (especialidad IN ('Clinica','Endocrinologia')),
  fecha TEXT NOT NULL,
  motivo TEXT DEFAULT '',
  sintomas TEXT DEFAULT '',
  diagnostico TEXT DEFAULT '',
  tratamiento TEXT DEFAULT '',
  notas TEXT DEFAULT '',
  estudios TEXT DEFAULT '',
  datos_vitales TEXT DEFAULT '{}',
  resumen_ia TEXT DEFAULT '',
  sugerencias_ia TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medicamentos_prescriptos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  consulta_id INTEGER REFERENCES consultas(id) ON DELETE SET NULL,
  especialidad TEXT NOT NULL CHECK (especialidad IN ('Clinica','Endocrinologia')),
  nombre TEXT NOT NULL,
  dosis TEXT DEFAULT '',
  indicaciones TEXT DEFAULT '',
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS adjuntos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  nombre_original TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  tipo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turnos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  especialidad TEXT NOT NULL CHECK (especialidad IN ('Clinica','Endocrinologia')),
  fecha_hora TEXT NOT NULL,
  duracion INTEGER NOT NULL DEFAULT 30,
  motivo TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado','cancelado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disponibilidad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  especialidad TEXT NOT NULL CHECK (especialidad IN ('Clinica','Endocrinologia')),
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  duracion_turno INTEGER NOT NULL DEFAULT 30
);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_especialidad ON consultas(especialidad);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_turnos_especialidad ON turnos(especialidad);
CREATE INDEX IF NOT EXISTS idx_medicamentos_paciente ON medicamentos_prescriptos(paciente_id);
