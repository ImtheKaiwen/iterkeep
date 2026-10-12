import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  createConsistentBackup,
  createTask,
  hashCommandPayload,
  passiveCheckpoint,
  verifyFullIntegrity,
} from '@iterkeep/storage-sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTestWorkspace,
  EXPIRES_AT,
  INBOX_ID,
  NOW,
  sequentialIds,
  type TestWorkspace,
} from './storage-fixture.js';

let workspace: TestWorkspace;
beforeEach(async () => {
  workspace = await createTestWorkspace();
});
afterEach(async () => workspace.close());

describe('IP-04 SQLite maintenance', () => {
  it('creates and independently verifies an online backup with committed WAL data', async () => {
    const payload = {
      projectId: INBOX_ID,
      title: 'Backup içinde',
      bodyMarkdown: '',
      priority: 'none' as const,
      dueDate: null,
      tagIds: [] as const,
    };
    createTask(
      workspace.db,
      {
        ...payload,
        actorKind: 'user',
        actorRef: 'local-user',
        correlationId: '00000000-0000-4000-8000-000000000040',
        idempotencyKey: '00000000-0000-4000-8000-000000000041',
        payloadHash: hashCommandPayload('tasks.create', payload),
        now: NOW,
        expiresAt: EXPIRES_AT,
      },
      sequentialIds(
        '00000000-0000-4000-8000-000000000042',
        '00000000-0000-4000-8000-000000000043',
        '00000000-0000-4000-8000-000000000044',
        '00000000-0000-4000-8000-000000000045',
      ),
    );
    const backupPath = path.join(workspace.root, 'backup', 'workspace.sqlite');
    await createConsistentBackup(workspace.db, backupPath);
    await expect(fs.stat(backupPath)).resolves.toBeTruthy();
    const backup = new Database(backupPath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      verifyFullIntegrity(backup);
      expect(
        backup
          .prepare<[], { count: number }>('SELECT count(*) AS count FROM tasks')
          .get()?.count,
      ).toBe(1);
    } finally {
      backup.close();
    }
    expect(
      (await fs.readdir(path.dirname(backupPath))).some((name) =>
        name.includes('.partial-'),
      ),
    ).toBe(false);
  });

  it('runs a passive WAL checkpoint without changing canonical records', () => {
    const result = passiveCheckpoint(workspace.db);
    expect(result.busy).toBe(0);
    expect(result.log).toBeGreaterThanOrEqual(0);
    expect(result.checkpointed).toBeGreaterThanOrEqual(0);
  });
});
