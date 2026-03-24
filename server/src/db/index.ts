import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(): Database.Database {
  // Ensure data directory exists
  const dataDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_text TEXT NOT NULL,
      refined_text TEXT,
      language TEXT DEFAULT 'zh-TW',
      duration_ms INTEGER,
      stt_engine TEXT DEFAULT 'groq',
      stt_latency_ms INTEGER,
      llm_latency_ms INTEGER,
      audio_path TEXT,
      source TEXT DEFAULT 'mac-mini',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term TEXT NOT NULL,
      alternatives TEXT DEFAULT '[]',
      category TEXT DEFAULT 'other',
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create FTS index if not exists
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS transcriptions_fts USING fts5(
      raw_text, refined_text,
      content=transcriptions, content_rowid=id
    );
  `);

  // Insert default settings (ignore if already exist)
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );

  const defaults: Record<string, string> = {
    stt_engine: 'groq',
    stt_fallback: 'local',
    whisper_model: 'small',
    ollama_model: 'qwen2.5:7b',
    language: config.defaultLanguage,
    hotkey_mode: 'toggle',
    hotkey_key: 'ctrl+`',
    auto_paste: 'true',
    ai_refinement: 'true',
    groq_api_key: config.groqApiKey,
    server_url: `http://localhost:${config.port}`,
    shared_password_hash: '',
  };

  const insertMany = db.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value);
    }
  });
  insertMany();

  console.log('  Database initialized at', config.dbPath);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
