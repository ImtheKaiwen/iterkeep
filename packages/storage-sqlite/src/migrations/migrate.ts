import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { StorageError } from '../errors.js';
import { inImmediateTransaction } from '../operations/transaction.js';

export const CURRENT_SCHEMA_VERSION = 1;

export interface MigrationEntry {
  readonly version: 1;
  readonly name: '0001_initial';
  readonly sql: string;
  readonly sha256: string;
}

interface MigrationRow {
  readonly version: number;
  readonly name: string;
  readonly sha256: string;
}

export function migrationSha256(sql: string): string {
  return createHash('sha256').update(sql.trimEnd()).digest('hex');
}

function hasUserTables(db: Database.Database): boolean {
  const row = db
    .prepare<[], { count: number }>(
      `SELECT count(*) AS count FROM sqlite_schema
       WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
    )
    .get();
  return (row?.count ?? 0) > 0;
}

export function ensureMigration(
  db: Database.Database,
  migration: MigrationEntry,
  appliedAt: string,
): 'applied' | 'current' {
  const actualHash = migrationSha256(migration.sql);
  if (actualHash !== migration.sha256) {
    throw new StorageError('MIGRATION_CHECKSUM_MISMATCH');
  }

  const userVersion = Number(db.pragma('user_version', { simple: true }));
  if (userVersion > CURRENT_SCHEMA_VERSION) {
    throw new StorageError('SCHEMA_INCOMPATIBLE', {
      currentVersion: CURRENT_SCHEMA_VERSION,
      databaseVersion: userVersion,
    });
  }

  if (userVersion === CURRENT_SCHEMA_VERSION) {
    const row = db
      .prepare<
        [number],
        MigrationRow
      >('SELECT version,name,sha256 FROM schema_migrations WHERE version=?')
      .get(migration.version);
    if (
      !row ||
      row.name !== migration.name ||
      row.sha256 !== migration.sha256
    ) {
      throw new StorageError('MIGRATION_CHECKSUM_MISMATCH');
    }
    return 'current';
  }

  if (hasUserTables(db)) throw new StorageError('UNRECOGNIZED_SCHEMA');

  inImmediateTransaction(db, () => {
    db.exec(migration.sql);
    db.prepare(
      `INSERT INTO schema_migrations(version,name,sha256,applied_at)
       VALUES (?,?,?,?)`,
    ).run(migration.version, migration.name, migration.sha256, appliedAt);
  });
  return 'applied';
}
