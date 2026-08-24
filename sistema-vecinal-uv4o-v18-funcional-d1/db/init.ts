import { getD1 } from "./index";

let initialization: Promise<void> | null = null;

export function ensureDatabase() {
  if (!initialization) initialization = initializeDatabase();
  return initialization;
}

async function initializeDatabase() {
  const d1 = getD1();
  const statements = [
    `CREATE TABLE IF NOT EXISTS neighbors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      street TEXT NOT NULL,
      lot TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
      status TEXT NOT NULL DEFAULT 'Programada' CHECK (status IN ('Programada', 'Cerrada')),
      card_row_index INTEGER NOT NULL CHECK (card_row_index BETWEEN 0 AND 4),
      card_slot_index INTEGER NOT NULL CHECK (card_slot_index BETWEEN 0 AND 23),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (card_row_index, card_slot_index)
    )`,
    `CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      neighbor_id INTEGER NOT NULL REFERENCES neighbors(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('Presente', 'Faltó', 'Justificado')),
      charge_cents INTEGER NOT NULL DEFAULT 0 CHECK (charge_cents >= 0),
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (activity_id, neighbor_id)
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      neighbor_id INTEGER NOT NULL REFERENCES neighbors(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      note TEXT NOT NULL DEFAULT '',
      receipt TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL DEFAULT '',
      event_type TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      event_place TEXT NOT NULL,
      whatsapp TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY,
      management_year TEXT NOT NULL,
      theme_json TEXT NOT NULL DEFAULT '{}',
      labels_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor_email TEXT NOT NULL DEFAULT '',
      detail_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    "CREATE INDEX IF NOT EXISTS idx_neighbors_active_name ON neighbors(active, name)",
    "CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date)",
    "CREATE INDEX IF NOT EXISTS idx_attendance_neighbor ON attendance_records(neighbor_id)",
    "CREATE INDEX IF NOT EXISTS idx_payments_neighbor_date ON payments(neighbor_id, date)",
    "CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at)",
    "PRAGMA foreign_keys = ON",
    "PRAGMA optimize",
  ];
  await d1.batch(statements.map((statement) => d1.prepare(statement)));
}
