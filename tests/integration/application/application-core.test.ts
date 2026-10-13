import {
  ApplicationCore,
  type CoreRepositoryPort,
  type IdFactoryPort,
} from '@iterkeep/application';
import type {
  CommandContext,
  CorrelationId,
  UtcTimestamp,
} from '@iterkeep/domain';
import {
  hashCommandPayload,
  SqliteCoreRepository,
} from '@iterkeep/storage-sqlite';
import { InMemoryCoreRepository } from '@iterkeep/testing';
import { describe, expect, it } from 'vitest';
import {
  createTestWorkspace,
  EXPIRES_AT,
  INBOX_ID,
  NOW,
  WORKSPACE_ID,
  type TestWorkspace,
} from '../storage/storage-fixture.js';

interface Harness {
  readonly core: ApplicationCore;
  readonly repository: CoreRepositoryPort;
  readonly sqlite?: TestWorkspace;
  close(): Promise<void>;
}

function sequenceIds(): IdFactoryPort {
  let value = 100;
  return {
    next(): string {
      const suffix = String(value).padStart(12, '0');
      value += 1;
      return `00000000-0000-4000-8000-${suffix}`;
    },
  };
}

function core(repository: CoreRepositoryPort): ApplicationCore {
  return new ApplicationCore({
    repository,
    ids: sequenceIds(),
    clock: {
      now: () => NOW,
      receiptExpiresAt: () => EXPIRES_AT,
    },
    hasher: { hash: hashCommandPayload },
  });
}

function context(idempotencyKey: string): CommandContext {
  return {
    actor: { kind: 'user', id: 'local-user' },
    correlationId: '00000000-0000-4000-8000-000000000090' as CorrelationId,
    idempotencyKey,
    timestamp: NOW as UtcTimestamp,
  };
}

async function memoryHarness(): Promise<Harness> {
  const repository = new InMemoryCoreRepository({
    id: WORKSPACE_ID,
    inboxProjectId: INBOX_ID,
  });
  return { repository, core: core(repository), close: async () => undefined };
}

async function sqliteHarness(): Promise<Harness> {
  const sqlite = await createTestWorkspace();
  const repository = new SqliteCoreRepository(sqlite.db);
  return {
    repository,
    core: core(repository),
    sqlite,
    close: () => sqlite.close(),
  };
}

for (const [name, createHarness] of [
  ['in-memory', memoryHarness],
  ['sqlite', sqliteHarness],
] as const) {
  describe(`IP-05 Application Core (${name})`, () => {
    it('uses one command path for project creation and Inbox quick capture', async () => {
      const harness = await createHarness();
      try {
        const project = await harness.core.createProject(
          { name: '  Çekirdek Proje  ' },
          context('00000000-0000-4000-8000-000000000091'),
        );
        expect(project).toMatchObject({ revision: 1, changed: true });

        const commandContext = context('00000000-0000-4000-8000-000000000092');
        const first = await harness.core.createTask(
          { title: 'Inbox görevi' },
          commandContext,
        );
        const replay = await harness.core.createTask(
          { title: 'Inbox görevi' },
          commandContext,
        );
        expect(replay).toEqual(first);
        expect(await harness.core.getTask(first.id)).toMatchObject({
          projectId: INBOX_ID,
          status: 'todo',
          revision: 1,
        });

        if (harness.sqlite) {
          expect(
            harness.sqlite.db
              .prepare<
                [],
                { count: number }
              >('SELECT count(*) AS count FROM tasks WHERE project_id=(SELECT inbox_project_id FROM workspaces)')
              .get()?.count,
          ).toBe(1);
        } else {
          expect(
            [
              ...(harness.repository as InMemoryCoreRepository).tasks.values(),
            ].filter((task) => task.projectId === INBOX_ID),
          ).toHaveLength(1);
        }
      } finally {
        await harness.close();
      }
    });

    it('keeps document versions, no-op saves and CAS behavior consistent', async () => {
      const harness = await createHarness();
      try {
        const document = await harness.core.createDocument(
          {
            projectId: INBOX_ID,
            title: 'Mimari notu',
            bodyMarkdown: 'İlk sürüm',
          },
          context('00000000-0000-4000-8000-000000000093'),
        );
        const noOp = await harness.core.saveDocument(
          {
            documentId: document.id,
            expectedRevision: 1,
            title: 'Mimari notu',
            bodyMarkdown: 'İlk sürüm',
            pinned: false,
          },
          context('00000000-0000-4000-8000-000000000094'),
        );
        expect(noOp).toMatchObject({ revision: 1, changed: false });
        const saved = await harness.core.saveDocument(
          {
            documentId: document.id,
            expectedRevision: 1,
            title: 'Mimari notu',
            bodyMarkdown: 'İkinci sürüm',
            pinned: true,
          },
          context('00000000-0000-4000-8000-000000000095'),
        );
        expect(saved).toMatchObject({ revision: 2, changed: true });
        expect(await harness.core.getDocument(document.id)).toMatchObject({
          bodyMarkdown: 'İkinci sürüm',
          pinned: true,
          revision: 2,
        });
        await expect(
          harness.core.saveDocument(
            {
              documentId: document.id,
              expectedRevision: 1,
              title: 'Eski istemci',
              bodyMarkdown: 'Kaybolmamalı',
              pinned: false,
            },
            context('00000000-0000-4000-8000-000000000096'),
          ),
        ).rejects.toMatchObject({ code: 'CONFLICT_REVISION' });
        expect(
          await harness.core.setDocumentDeleted(
            { documentId: document.id, expectedRevision: 2, deleted: true },
            context('00000000-0000-4000-8000-000000000133'),
          ),
        ).toMatchObject({ revision: 3, changed: true });
        expect(
          await harness.core.setDocumentDeleted(
            { documentId: document.id, expectedRevision: 3, deleted: false },
            context('00000000-0000-4000-8000-000000000134'),
          ),
        ).toMatchObject({ revision: 4, changed: true });
        expect(await harness.core.getDocument(document.id)).toMatchObject({
          revision: 4,
          deletedAt: null,
        });
        if (harness.sqlite) {
          expect(
            harness.sqlite.db
              .prepare<
                [],
                { count: number }
              >('SELECT count(*) AS count FROM document_versions')
              .get()?.count,
          ).toBe(4);
        }
      } finally {
        await harness.close();
      }
    });

    it('supersedes accepted decisions atomically', async () => {
      const harness = await createHarness();
      try {
        const oldDecision = await harness.core.createDecision(
          {
            projectId: INBOX_ID,
            title: 'Eski karar',
            decisionMarkdown: 'A yaklaşımı',
            rationaleMarkdown: 'İlk gerekçe',
          },
          context('00000000-0000-4000-8000-000000000097'),
        );
        const newDecision = await harness.core.createDecision(
          {
            projectId: INBOX_ID,
            title: 'Yeni karar',
            decisionMarkdown: 'B yaklaşımı',
            rationaleMarkdown: 'Yeni gerekçe',
          },
          context('00000000-0000-4000-8000-000000000098'),
        );
        await harness.core.acceptDecision(
          {
            decisionId: oldDecision.id,
            expectedRevision: 1,
            reason: 'Kabul edildi',
          },
          context('00000000-0000-4000-8000-000000000099'),
        );
        await harness.core.acceptDecision(
          {
            decisionId: newDecision.id,
            expectedRevision: 1,
            reason: 'Kabul edildi',
          },
          context('00000000-0000-4000-8000-000000000100'),
        );
        expect(
          await harness.core.supersedeDecision(
            {
              oldDecisionId: oldDecision.id,
              newDecisionId: newDecision.id,
              expectedOldRevision: 2,
              expectedNewRevision: 2,
            },
            context('00000000-0000-4000-8000-000000000101'),
          ),
        ).toEqual({ oldRevision: 3, newRevision: 3 });
        expect(
          await harness.repository.getDecision(oldDecision.id),
        ).toMatchObject({
          status: 'superseded',
          supersededByDecisionId: newDecision.id,
        });
        expect(
          await harness.repository.getDecision(newDecision.id),
        ).toMatchObject({
          status: 'accepted',
          supersedesDecisionId: oldDecision.id,
        });
      } finally {
        await harness.close();
      }
    });

    it('preserves child records across project trash and restore', async () => {
      const harness = await createHarness();
      try {
        const project = await harness.core.createProject(
          { name: 'Kurtarılabilir' },
          context('00000000-0000-4000-8000-000000000102'),
        );
        await harness.core.createTask(
          { projectId: project.id, title: 'Korunan görev' },
          context('00000000-0000-4000-8000-000000000103'),
        );
        const trashed = await harness.core.setProjectDeleted(
          { projectId: project.id, expectedRevision: 1, deleted: true },
          context('00000000-0000-4000-8000-000000000104'),
        );
        expect(trashed.revision).toBe(2);
        await expect(
          harness.core.createTask(
            { projectId: project.id, title: 'Yasak görev' },
            context('00000000-0000-4000-8000-000000000105'),
          ),
        ).rejects.toMatchObject({ code: 'REFERENTIAL_INTEGRITY' });
        expect(
          await harness.core.setProjectDeleted(
            { projectId: project.id, expectedRevision: 2, deleted: false },
            context('00000000-0000-4000-8000-000000000106'),
          ),
        ).toMatchObject({ revision: 3, changed: true });
        if (harness.sqlite) {
          expect(
            harness.sqlite.db
              .prepare<
                [string],
                { count: number }
              >('SELECT count(*) AS count FROM tasks WHERE project_id=?')
              .get(project.id)?.count,
          ).toBe(1);
        }
      } finally {
        await harness.close();
      }
    });

    it('appends immutable work logs and links committed records', async () => {
      const harness = await createHarness();
      try {
        const task = await harness.core.createTask(
          { title: 'Bağlanacak görev' },
          context('00000000-0000-4000-8000-000000000107'),
        );
        const log = await harness.core.appendActivity(
          { projectId: INBOX_ID, textMarkdown: 'Bugün çekirdek tamamlandı.' },
          context('00000000-0000-4000-8000-000000000108'),
        );
        const link = await harness.core.linkRecords(
          {
            source: { kind: 'activity_log', id: log.id },
            target: { kind: 'task', id: task.id },
            relation: 'references',
          },
          context('00000000-0000-4000-8000-000000000109'),
        );
        expect(link.id).toMatch(/^[0-9a-f-]{36}$/u);
        expect(await harness.core.getActivity(log.id)).toMatchObject({
          projectId: INBOX_ID,
          correctionOfId: null,
        });
        const unlinkContext = context('00000000-0000-4000-8000-000000000110');
        expect(await harness.core.unlinkRecord(link.id, unlinkContext)).toEqual(
          {
            removed: true,
          },
        );
        expect(await harness.core.unlinkRecord(link.id, unlinkContext)).toEqual(
          {
            removed: true,
          },
        );
        if (harness.sqlite) {
          expect(() =>
            harness.sqlite?.db
              .prepare('UPDATE activity_logs SET text_markdown=? WHERE id=?')
              .run('Değiştirildi', log.id),
          ).toThrow('APPEND_ONLY');
        }
      } finally {
        await harness.close();
      }
    });

    it('creates, renames, lists and removes normalized tags', async () => {
      const harness = await createHarness();
      try {
        const tag = await harness.core.createTag(
          '  Important  ',
          context('00000000-0000-4000-8000-000000000111'),
        );
        expect(tag).toMatchObject({ name: 'Important', nameKey: 'ımportant' });
        expect(await harness.core.listTags()).toEqual([tag]);

        const renamed = await harness.core.renameTag(
          tag.id,
          'Urgent',
          context('00000000-0000-4000-8000-000000000112'),
        );
        expect(await harness.core.listTags()).toEqual([renamed]);
        expect(
          await harness.core.deleteTag(
            tag.id,
            context('00000000-0000-4000-8000-000000000113'),
          ),
        ).toEqual({ removed: true });
        expect(await harness.core.listTags()).toEqual([]);
      } finally {
        await harness.close();
      }
    });

    it('rechecks archived parent policy inside repository mutations', async () => {
      const harness = await createHarness();
      try {
        const project = await harness.core.createProject(
          { name: 'Read only project' },
          context('00000000-0000-4000-8000-000000000114'),
        );
        const document = await harness.core.createDocument(
          {
            projectId: project.id,
            title: 'Existing document',
            bodyMarkdown: 'Original',
          },
          context('00000000-0000-4000-8000-000000000115'),
        );
        const decision = await harness.core.createDecision(
          {
            projectId: project.id,
            title: 'Existing decision',
            decisionMarkdown: 'Choice',
            rationaleMarkdown: 'Reason',
          },
          context('00000000-0000-4000-8000-000000000116'),
        );

        if (harness.sqlite) {
          harness.sqlite.db
            .prepare("UPDATE projects SET status='archived' WHERE id=?")
            .run(project.id);
        } else {
          const repository = harness.repository as InMemoryCoreRepository;
          const current = repository.projects.get(project.id);
          if (!current) throw new Error('missing project fixture');
          repository.projects.set(project.id, {
            ...current,
            status: 'archived',
          });
        }

        await expect(
          harness.core.saveDocument(
            {
              documentId: document.id,
              expectedRevision: 1,
              title: 'Forbidden update',
              bodyMarkdown: 'Changed',
              pinned: false,
            },
            context('00000000-0000-4000-8000-000000000117'),
          ),
        ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
        await expect(
          harness.core.acceptDecision(
            {
              decisionId: decision.id,
              expectedRevision: 1,
              reason: 'Forbidden acceptance',
            },
            context('00000000-0000-4000-8000-000000000118'),
          ),
        ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
      } finally {
        await harness.close();
      }
    });

    it('updates projects with CAS and enforces the canonical status matrix', async () => {
      const harness = await createHarness();
      try {
        const project = await harness.core.createProject(
          { name: 'Mutable project' },
          context('00000000-0000-4000-8000-000000000119'),
        );
        expect(
          await harness.core.updateProject(
            {
              projectId: project.id,
              expectedRevision: 1,
              patch: { name: 'Renamed project', priority: 'high' },
            },
            context('00000000-0000-4000-8000-000000000120'),
          ),
        ).toMatchObject({ revision: 2, changed: true });
        expect(
          await harness.core.updateProject(
            {
              projectId: project.id,
              expectedRevision: 2,
              patch: { name: 'Renamed project', priority: 'high' },
            },
            context('00000000-0000-4000-8000-000000000121'),
          ),
        ).toMatchObject({ revision: 2, changed: false });
        expect(
          await harness.core.changeProjectStatus(
            {
              projectId: project.id,
              expectedRevision: 2,
              status: 'archived',
            },
            context('00000000-0000-4000-8000-000000000122'),
          ),
        ).toMatchObject({ revision: 3, changed: true });
        await expect(
          harness.core.changeProjectStatus(
            {
              projectId: project.id,
              expectedRevision: 3,
              status: 'completed',
            },
            context('00000000-0000-4000-8000-000000000123'),
          ),
        ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
        expect(
          await harness.core.changeProjectStatus(
            {
              projectId: project.id,
              expectedRevision: 3,
              status: 'active',
            },
            context('00000000-0000-4000-8000-000000000124'),
          ),
        ).toMatchObject({ revision: 4, changed: true });
        expect(await harness.core.getProject(project.id)).toMatchObject({
          name: 'Renamed project',
          priority: 'high',
          status: 'active',
          revision: 4,
        });
      } finally {
        await harness.close();
      }
    });

    it('updates, completes, reopens, moves, trashes and restores tasks', async () => {
      const harness = await createHarness();
      try {
        const destination = await harness.core.createProject(
          { name: 'Destination' },
          context('00000000-0000-4000-8000-000000000125'),
        );
        const task = await harness.core.createTask(
          { title: 'Lifecycle task' },
          context('00000000-0000-4000-8000-000000000126'),
        );
        expect(
          await harness.core.updateTask(
            {
              taskId: task.id,
              expectedRevision: 1,
              patch: { bodyMarkdown: 'Details', priority: 'urgent' },
            },
            context('00000000-0000-4000-8000-000000000127'),
          ),
        ).toMatchObject({ revision: 2, changed: true });
        expect(
          await harness.core.changeTaskStatus(
            { taskId: task.id, expectedRevision: 2, status: 'done' },
            context('00000000-0000-4000-8000-000000000128'),
          ),
        ).toMatchObject({ revision: 3, changed: true });
        expect(await harness.core.getTask(task.id)).toMatchObject({
          status: 'done',
          completedAt: NOW,
        });
        await harness.core.changeTaskStatus(
          { taskId: task.id, expectedRevision: 3, status: 'in_progress' },
          context('00000000-0000-4000-8000-000000000129'),
        );
        expect(
          await harness.core.moveTask(
            {
              taskId: task.id,
              projectId: destination.id,
              expectedRevision: 4,
              status: 'blocked',
              sortOrder: 5,
            },
            context('00000000-0000-4000-8000-000000000130'),
          ),
        ).toMatchObject({ revision: 5, changed: true });
        expect(
          await harness.core.setTaskDeleted(
            { taskId: task.id, expectedRevision: 5, deleted: true },
            context('00000000-0000-4000-8000-000000000131'),
          ),
        ).toMatchObject({ revision: 6, changed: true });
        expect(
          await harness.core.setTaskDeleted(
            { taskId: task.id, expectedRevision: 6, deleted: false },
            context('00000000-0000-4000-8000-000000000132'),
          ),
        ).toMatchObject({ revision: 7, changed: true });
        expect(await harness.core.getTask(task.id)).toMatchObject({
          projectId: destination.id,
          bodyMarkdown: 'Details',
          priority: 'urgent',
          status: 'blocked',
          completedAt: null,
          sortOrder: 5,
          revision: 7,
          deletedAt: null,
        });
        if (harness.sqlite) {
          expect(
            harness.sqlite.db
              .prepare<
                [string],
                { count: number }
              >('SELECT count(*) AS count FROM task_history WHERE task_id=?')
              .get(task.id)?.count,
          ).toBe(8);
        }
      } finally {
        await harness.close();
      }
    });
  });
}
