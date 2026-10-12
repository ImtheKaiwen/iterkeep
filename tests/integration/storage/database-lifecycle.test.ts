import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  bootstrapWorkspace,
  ensureMigration,
  migrationSha256,
  openDatabase,
  readWorkspace,
  StorageError,
  verifyDatabaseIntegrity,
} from '@iterkeep/storage-sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import {
  INBOX_ID,
  loadMigration,
  NOW,
  WORKSPACE_ID,
} from './storage-fixture.js';

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(
    cleanup
      .splice(0)
      .map((root) => fs.rm(root, { force: true, recursive: true })),
  );
});

async function temporaryDatabase() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'iterkeep-lifecycle-'));
  cleanup.push(root);
  const dbPath = path.join(root, 'workspace.db');
  return { dbPath, root };
}

describe('IP-04 database lifecycle', () => {
  it('does not create a missing database in open-existing mode', async () => {
    const { dbPath } = await temporaryDatabase();
    expect(() =>
      openDatabase({ path: dbPath, intent: 'open_existing' }),
    ).toThrow();
    await expect(fs.stat(dbPath)).rejects.toThrow();
  });

  it('applies the canonical migration and bootstraps Workspace plus Inbox atomically', async () => {
    const { dbPath } = await temporaryDatabase();
    const db = openDatabase({ path: dbPath, intent: 'create_new' });
    try {
      const migration = await loadMigration();
      expect(ensureMigration(db, migration, NOW)).toBe('applied');
      expect(
        bootstrapWorkspace(db, {
          workspaceId: WORKSPACE_ID,
          inboxProjectId: INBOX_ID,
          displayName: 'Workspace',
          timezone: 'Europe/Istanbul',
          now: NOW,
        }),
      ).toMatchObject({ id: WORKSPACE_ID, inboxProjectId: INBOX_ID });
      expect(readWorkspace(db)).toMatchObject({
        id: WORKSPACE_ID,
        revision: 1,
      });
      expect(verifyDatabaseIntegrity(db)).toEqual({
        quickCheck: 'ok',
        foreignKeyViolations: 0,
        workspaceId: WORKSPACE_ID,
        inboxProjectId: INBOX_ID,
      });
      expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
      expect(db.pragma('synchronous', { simple: true })).toBe(2);
      expect(
        db
          .prepare<[], { count: number }>(
            `SELECT count(*) AS count FROM sqlite_schema
             WHERE type='table' AND sql LIKE '% STRICT'`,
          )
          .get()?.count,
      ).toBeGreaterThan(0);
    } finally {
      db.close();
    }
  });

  it('rolls back a partially failed bootstrap', async () => {
    const { dbPath } = await temporaryDatabase();
    const db = openDatabase({ path: dbPath, intent: 'create_new' });
    try {
      ensureMigration(db, await loadMigration(), NOW);
      expect(() =>
        bootstrapWorkspace(
          db,
          {
            workspaceId: WORKSPACE_ID,
            inboxProjectId: INBOX_ID,
            displayName: 'Workspace',
            timezone: 'Europe/Istanbul',
            now: NOW,
          },
          'after_workspace',
        ),
      ).toThrow('TEST_FAILPOINT');
      expect(
        db
          .prepare<
            [],
            { count: number }
          >('SELECT count(*) AS count FROM workspaces')
          .get()?.count,
      ).toBe(0);
      expect(
        db
          .prepare<
            [],
            { count: number }
          >('SELECT count(*) AS count FROM projects')
          .get()?.count,
      ).toBe(0);
    } finally {
      db.close();
    }
  });

  it('rejects migration checksum drift and future schemas', async () => {
    const { dbPath } = await temporaryDatabase();
    const db = openDatabase({ path: dbPath, intent: 'create_new' });
    try {
      const migration = await loadMigration();
      ensureMigration(db, migration, NOW);
      expect(() =>
        ensureMigration(db, { ...migration, sha256: '0'.repeat(64) }, NOW),
      ).toThrowError(StorageError);
      db.pragma('user_version = 2');
      expect(() => ensureMigration(db, migration, NOW)).toThrowError(
        expect.objectContaining({ code: 'SCHEMA_INCOMPATIBLE' }),
      );
    } finally {
      db.close();
    }
  });

  it('rolls back a migration interrupted by a failing statement', async () => {
    const { dbPath } = await temporaryDatabase();
    const db = openDatabase({ path: dbPath, intent: 'create_new' });
    try {
      const migration = await loadMigration();
      const interruptedSql = `${migration.sql}\nSELECT missing_column FROM missing_table;`;
      expect(() =>
        ensureMigration(
          db,
          {
            ...migration,
            sql: interruptedSql,
            sha256: migrationSha256(interruptedSql),
          },
          NOW,
        ),
      ).toThrow();
      expect(db.pragma('user_version', { simple: true })).toBe(0);
      expect(
        db
          .prepare<
            [],
            { count: number }
          >(`SELECT count(*) AS count FROM sqlite_schema WHERE name='tasks'`)
          .get()?.count,
      ).toBe(0);
      expect(ensureMigration(db, migration, NOW)).toBe('applied');
      expect(db.pragma('user_version', { simple: true })).toBe(1);
    } finally {
      db.close();
    }
  });
});
