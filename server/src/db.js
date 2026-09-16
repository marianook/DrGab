import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'clinic.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

function seedDisponibilidadDefault() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM disponibilidad').get().c;
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO disponibilidad (especialidad, dia_semana, hora_inicio, hora_fin, duracion_turno)
     VALUES (?, ?, ?, ?, ?)`
  );
  const dias = [1, 2, 3, 4, 5];
  const tx = db.transaction(() => {
    for (const dia of dias) {
      insert.run('Clinica', dia, '08:00', '12:00', 30);
      insert.run('Endocrinologia', dia, '14:00', '18:00', 30);
    }
  });
  tx();
}
seedDisponibilidadDefault();

export default db;
