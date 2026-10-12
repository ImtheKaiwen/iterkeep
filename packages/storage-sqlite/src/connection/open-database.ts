import fs from 'node:fs';
import Database from 'better-sqlite3';

export interface OpenDatabaseOptions {
  readonly path: string;
  readonly intent: 'open_existing' | 'create_new';
  readonly nativeBinding?: string;
}

export function openDatabase(options: OpenDatabaseOptions): Database.Database {
  const existed = fs.existsSync(options.path);
  if (options.intent === 'create_new' && existed) {
    throw new Error('WORKSPACE_ALREADY_EXISTS');
  }

  const db = new Database(options.path, {
    fileMustExist: options.intent === 'open_existing',
    nativeBinding: options.nativeBinding,
    timeout: 3_000,
  });
  try {
    db.pragma('foreign_keys = ON');
    if (Number(db.pragma('foreign_keys', { simple: true })) !== 1) {
      throw new Error('DB_FOREIGN_KEYS_OFF');
    }
    db.pragma('busy_timeout = 3000');
    const journalMode = String(
      db.pragma('journal_mode = WAL', { simple: true }),
    ).toLowerCase();
    if (journalMode !== 'wal') throw new Error('DB_WAL_UNAVAILABLE');
    db.pragma('synchronous = FULL');
    if (Number(db.pragma('synchronous', { simple: true })) !== 2) {
      throw new Error('DB_SYNCHRONOUS_MISMATCH');
    }
    return db;
  } catch (error) {
    db.close();
    if (options.intent === 'create_new' && !existed) {
      fs.rmSync(options.path, { force: true });
    }
    throw error;
  }
}
