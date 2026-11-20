import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'medicare.db');
export const db = new DatabaseSync(dbPath);

// Initialize schema
export function initDb() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('elderly', 'caregiver')),
      phone_number TEXT,
      link_code TEXT UNIQUE,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      preferred_language TEXT DEFAULT 'en',
      text_size TEXT DEFAULT 'normal',
      high_contrast INTEGER DEFAULT 0,
      voice_enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caregiver_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caregiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      elderly_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      UNIQUE(caregiver_id, elderly_id)
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      generic_name TEXT,
      pill_shape TEXT NOT NULL,
      pill_color TEXT NOT NULL,
      pill_color2 TEXT,
      pill_image_url TEXT,
      strength TEXT NOT NULL,
      quantity_per_dose TEXT NOT NULL,
      instructions TEXT NOT NULL,
      time_slots TEXT NOT NULL,
      frequency TEXT NOT NULL,
      frequency_details TEXT,
      duration_type TEXT NOT NULL,
      duration_value TEXT,
      is_critical INTEGER DEFAULT 0,
      current_stock INTEGER DEFAULT 30,
      refill_threshold INTEGER DEFAULT 5,
      notes TEXT,
      is_paused INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dose_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scheduled_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      actual_time TEXT,
      minutes_late INTEGER DEFAULT 0,
      snooze_count INTEGER DEFAULT 0,
      escalation_level INTEGER DEFAULT 1,
      caregiver_alerted INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caregiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      medicine_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
      dose_log_id INTEGER REFERENCES dose_logs(id) ON DELETE SET NULL,
      alert_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_acknowledged INTEGER DEFAULT 0,
      acknowledged_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caregiver_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      grace_period_minutes INTEGER DEFAULT 30,
      level2_minutes INTEGER DEFAULT 5,
      level3_minutes INTEGER DEFAULT 10,
      level4_minutes INTEGER DEFAULT 20,
      critical_level4_minutes INTEGER DEFAULT 10,
      max_snoozes INTEGER DEFAULT 3,
      pre_remind_miss_prone INTEGER DEFAULT 1,
      time_acceleration INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adaptive_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      medicine_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
      insight_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      action_suggested TEXT,
      is_applied INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dose_logs_user_date ON dose_logs(user_id, scheduled_time);
    CREATE INDEX IF NOT EXISTS idx_dose_logs_status ON dose_logs(status);
    CREATE INDEX IF NOT EXISTS idx_alerts_user_time ON alerts(user_id, created_at);
  `);
}

