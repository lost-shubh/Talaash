import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH =
  process.env.NODE_ENV === 'production'
    ? '/tmp/talaash.db'
    : path.join(process.cwd(), 'talaash.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  _db = new Database(DB_PATH)

  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  initSchema(_db)

  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      location TEXT NOT NULL,
      state TEXT NOT NULL,
      description TEXT NOT NULL,
      physical_desc TEXT NOT NULL,
      identifying_marks TEXT,
      age_progression TEXT,
      report_type TEXT NOT NULL DEFAULT 'adult',
      status TEXT NOT NULL DEFAULT 'pending',
      reporter_id TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_relation TEXT NOT NULL,
      admin_notes TEXT,
      verified_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reporter_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      data TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sightings (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      reporter_name TEXT,
      description TEXT NOT NULL,
      lat REAL,
      lng REAL,
      accuracy REAL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT,
      notes TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_photos_report ON photos(report_id);
    CREATE INDEX IF NOT EXISTS idx_sightings_report ON sightings(report_id);
    CREATE INDEX IF NOT EXISTS idx_audit_report ON audit_log(report_id);
  `)
}

export default getDb