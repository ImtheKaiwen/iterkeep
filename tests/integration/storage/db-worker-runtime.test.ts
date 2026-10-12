import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StorageDbWorkerRequestSchema } from '@iterkeep/contracts';
import { hashCommandPayload } from '@iterkeep/storage-sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { DatabaseWorkerRuntime } from '../../../apps/desktop/src/workers/db-worker-runtime.js';
import {
  EXPIRES_AT,
  INBOX_ID,
  loadMigration,
  NOW,
  WORKSPACE_ID,
} from './storage-fixture.js';

const roots: string[] = [];
const REQUEST_ID = '00000000-0000-4000-8000-000000000050';

async function createRuntime(): Promise<{
  root: string;
  runtime: DatabaseWorkerRuntime;
}> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'iterkeep-worker-'));
  roots.push(root);
  return {
    root,
    runtime: new DatabaseWorkerRuntime({
      databasePath: path.join(root, 'workspace.db'),
      intent: 'create_new',
      migration: await loadMigration(),
      appliedAt: NOW,
    }),
  };
}

afterEach(async () => {
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('IP-04 DB worker runtime', () => {
  it('validates named operations and executes them on its owned connection', async () => {
    const { runtime } = await createRuntime();
    try {
      const bootstrap = await runtime.handle({
        protocolVersion: 1,
        requestId: REQUEST_ID,
        op: 'workspace.bootstrap',
        timeoutMs: 5_000,
        payload: {
          workspaceId: WORKSPACE_ID,
          inboxProjectId: INBOX_ID,
          displayName: 'Worker workspace',
          timezone: 'Europe/Istanbul',
          now: NOW,
        },
      });
      expect(bootstrap.ok).toBe(true);

      const payload = {
        projectId: INBOX_ID,
        title: 'Worker-owned task',
        bodyMarkdown: '',
        priority: 'none',
        dueDate: null,
        tagIds: [],
      } as const;
      const created = await runtime.handle({
        protocolVersion: 1,
        requestId: '00000000-0000-4000-8000-000000000051',
        op: 'tasks.create',
        timeoutMs: 5_000,
        payload: {
          ...payload,
          actorKind: 'user',
          actorRef: 'local-user',
          correlationId: '00000000-0000-4000-8000-000000000052',
          idempotencyKey: '00000000-0000-4000-8000-000000000053',
          payloadHash: hashCommandPayload('tasks.create', payload),
          now: NOW,
          expiresAt: EXPIRES_AT,
        },
      });
      expect(created).toMatchObject({ ok: true });
      const receipt = await runtime.handle({
        protocolVersion: 1,
        requestId: '00000000-0000-4000-8000-000000000056',
        op: 'receipts.lookup',
        timeoutMs: 5_000,
        payload: {
          actorKind: 'user',
          actorRef: 'local-user',
          commandName: 'tasks.create',
          idempotencyKey: '00000000-0000-4000-8000-000000000053',
        },
      });
      expect(receipt).toMatchObject({
        ok: true,
        result: { state: 'committed' },
      });
    } finally {
      runtime.close();
    }
  });

  it('rejects raw SQL, unknown fields, and forged payload hashes safely', async () => {
    expect(
      StorageDbWorkerRequestSchema.safeParse({
        protocolVersion: 1,
        requestId: REQUEST_ID,
        op: 'workspace.read',
        timeoutMs: 1_000,
        payload: { sql: 'DROP TABLE tasks' },
      }).success,
    ).toBe(false);

    const { runtime } = await createRuntime();
    try {
      const reply = await runtime.handle({
        protocolVersion: 1,
        requestId: REQUEST_ID,
        op: 'tasks.create',
        timeoutMs: 1_000,
        payload: {
          projectId: INBOX_ID,
          title: 'Forged',
          bodyMarkdown: '',
          priority: 'none',
          dueDate: null,
          tagIds: [],
          actorKind: 'user',
          actorRef: 'local-user',
          correlationId: '00000000-0000-4000-8000-000000000054',
          idempotencyKey: '00000000-0000-4000-8000-000000000055',
          payloadHash: '0'.repeat(64),
          now: NOW,
          expiresAt: EXPIRES_AT,
        },
      });
      expect(reply).toMatchObject({
        ok: false,
        error: { code: 'IDEMPOTENCY_CONFLICT' },
      });
      expect(JSON.stringify(reply)).not.toContain('DROP TABLE');
    } finally {
      runtime.close();
    }
  });

  it('enforces one in-process owner per workspace database', async () => {
    const { root, runtime } = await createRuntime();
    try {
      expect(
        () =>
          new DatabaseWorkerRuntime({
            databasePath: path.join(root, 'workspace.db'),
            intent: 'open_existing',
            migration: {
              version: 1,
              name: '0001_initial',
              sql: '',
              sha256: '',
            },
            appliedAt: NOW,
          }),
      ).toThrow('WORKSPACE_ALREADY_OPEN');
    } finally {
      runtime.close();
    }
  });
});
