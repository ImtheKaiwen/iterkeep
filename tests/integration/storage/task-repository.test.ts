import {
  createTask,
  eventsSince,
  hashCommandPayload,
  readTask,
  renameTask,
  StorageError,
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

const taskIntent = {
  projectId: INBOX_ID,
  title: 'İlk görev',
  bodyMarkdown: 'SQLite temeli',
  priority: 'high' as const,
  dueDate: null,
  tagIds: [] as const,
};

function context(commandName: string, payload = taskIntent) {
  return {
    actorKind: 'user' as const,
    actorRef: 'local-user',
    correlationId: '00000000-0000-4000-8000-000000000010',
    idempotencyKey: '00000000-0000-4000-8000-000000000011',
    payloadHash: hashCommandPayload(commandName, payload),
    now: NOW,
    expiresAt: EXPIRES_AT,
  };
}

describe('IP-04 task repository', () => {
  it('commits task, history, outbox and receipt exactly once', () => {
    const ids = sequentialIds(
      '00000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000022',
      '00000000-0000-4000-8000-000000000023',
    );
    const command = { ...taskIntent, ...context('tasks.create') };
    const first = createTask(workspace.db, command, ids);
    const second = createTask(workspace.db, command, ids);

    expect(second).toEqual(first);
    expect(readTask(workspace.db, first.id)).toMatchObject({
      title: taskIntent.title,
      revision: 1,
    });
    for (const table of [
      'tasks',
      'task_history',
      'domain_events',
      'idempotency_receipts',
    ]) {
      const count = workspace.db
        .prepare<
          [],
          { count: number }
        >(`SELECT count(*) AS count FROM ${table}`)
        .get()?.count;
      expect(count).toBe(1);
    }
    expect(eventsSince(workspace.db, 0)).toHaveLength(1);
    expect(
      workspace.db
        .prepare<
          [],
          { count: number }
        >("SELECT count(*) AS count FROM search_fts WHERE search_fts MATCH 'SQLite'")
        .get()?.count,
    ).toBe(1);
  });

  it('rejects the same idempotency key with a different payload', () => {
    const ids = sequentialIds(
      '00000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000022',
      '00000000-0000-4000-8000-000000000023',
    );
    createTask(
      workspace.db,
      { ...taskIntent, ...context('tasks.create') },
      ids,
    );
    const changed = { ...taskIntent, title: 'Başka görev' };
    expect(() =>
      createTask(
        workspace.db,
        { ...changed, ...context('tasks.create', changed) },
        ids,
      ),
    ).toThrowError(expect.objectContaining({ code: 'IDEMPOTENCY_CONFLICT' }));
  });

  it('uses revision CAS, preserves no-op revision and emits only real updates', () => {
    const createIds = sequentialIds(
      '00000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000022',
      '00000000-0000-4000-8000-000000000023',
    );
    const created = createTask(
      workspace.db,
      { ...taskIntent, ...context('tasks.create') },
      createIds,
    );
    const renamePayload = {
      taskId: created.id,
      title: 'Updated task',
      expectedRevision: 1,
    };
    const renamed = renameTask(
      workspace.db,
      {
        ...renamePayload,
        ...context('tasks.update', renamePayload),
        idempotencyKey: '00000000-0000-4000-8000-000000000030',
      },
      sequentialIds(
        '00000000-0000-4000-8000-000000000031',
        '00000000-0000-4000-8000-000000000032',
      ),
    );
    expect(renamed).toMatchObject({ revision: 2, changed: true });
    expect(
      workspace.db
        .prepare<
          [],
          { count: number }
        >("SELECT count(*) AS count FROM search_fts WHERE search_fts MATCH 'Updated'")
        .get()?.count,
    ).toBe(1);

    const noopPayload = { ...renamePayload, expectedRevision: 2 };
    const noop = renameTask(
      workspace.db,
      {
        ...noopPayload,
        ...context('tasks.update', noopPayload),
        idempotencyKey: '00000000-0000-4000-8000-000000000033',
      },
      sequentialIds('00000000-0000-4000-8000-000000000034'),
    );
    expect(noop).toMatchObject({ revision: 2, changed: false });
    expect(eventsSince(workspace.db, 0)).toHaveLength(2);

    expect(() =>
      renameTask(workspace.db, {
        ...renamePayload,
        ...context('tasks.update', renamePayload),
        idempotencyKey: '00000000-0000-4000-8000-000000000035',
      }),
    ).toThrowError(StorageError);
    expect(readTask(workspace.db, created.id).title).toBe('Updated task');
  });
});
