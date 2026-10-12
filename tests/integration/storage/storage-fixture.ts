import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type Database from 'better-sqlite3';
import {
  bootstrapWorkspace,
  ensureMigration,
  migrationSha256,
  openDatabase,
  type MigrationEntry,
} from '@iterkeep/storage-sqlite';

export const NOW = '2026-10-10T14:15:00.000Z';
export const EXPIRES_AT = '2026-11-10T14:15:00.000Z';
export const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
export const INBOX_ID = '00000000-0000-4000-8000-000000000002';

export async function loadMigration(): Promise<MigrationEntry> {
  const sql = await fs.readFile(
    path.join(
      process.cwd(),
      'packages/storage-sqlite/migrations/0001_initial.sql',
    ),
    'utf8',
  );
  return {
    version: 1,
    name: '0001_initial',
    sql,
    sha256: migrationSha256(sql),
  };
}

export interface TestWorkspace {
  readonly db: Database.Database;
  readonly dbPath: string;
  readonly root: string;
  close(): Promise<void>;
}

export async function createTestWorkspace(): Promise<TestWorkspace> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'iterkeep-ip04-'));
  const dbPath = path.join(root, 'workspace.db');
  const db = openDatabase({ path: dbPath, intent: 'create_new' });
  const migration = await loadMigration();
  ensureMigration(db, migration, NOW);
  bootstrapWorkspace(db, {
    workspaceId: WORKSPACE_ID,
    inboxProjectId: INBOX_ID,
    displayName: 'IP-04 workspace',
    timezone: 'Europe/Istanbul',
    now: NOW,
  });
  return {
    db,
    dbPath,
    root,
    async close() {
      if (db.open) db.close();
      await fs.rm(root, { force: true, recursive: true });
    },
  };
}

export function sequentialIds(...ids: readonly string[]): () => string {
  let index = 0;
  return () => {
    const id = ids[index];
    if (!id) throw new Error('Test ID sequence exhausted');
    index += 1;
    return id;
  };
}
