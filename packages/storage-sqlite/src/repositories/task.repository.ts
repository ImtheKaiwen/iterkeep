import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { StorageError } from '../errors.js';
import { inImmediateTransaction } from '../operations/transaction.js';
import { appendEvent } from './event.repository.js';
import {
  lookupReceipt,
  recordReceipt,
  type ReceiptIdentity,
  type StorageActorKind,
} from './idempotency.repository.js';

export interface TaskMutationContext {
  readonly actorKind: StorageActorKind;
  readonly actorRef: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly now: string;
  readonly expiresAt: string;
}

export interface CreateTaskCommand extends TaskMutationContext {
  readonly projectId: string;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent';
  readonly dueDate: string | null;
  readonly tagIds: readonly string[];
}

export interface RenameTaskCommand extends TaskMutationContext {
  readonly taskId: string;
  readonly title: string;
  readonly expectedRevision: number;
}

export interface TaskReceipt {
  readonly id: string;
  readonly projectId: string;
  readonly revision: number;
  readonly changed: boolean;
}

export interface TaskRecord {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: string;
  readonly priority: string;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly revision: number;
  readonly deletedAt: string | null;
}

interface TaskRow {
  readonly id: string;
  readonly project_id: string;
  readonly title: string;
  readonly status: string;
  readonly priority: string;
  readonly due_date: string | null;
  readonly completed_at: string | null;
  readonly revision: number;
  readonly deleted_at: string | null;
}

export type IdFactory = () => string;

function receiptIdentity(
  commandName: string,
  context: TaskMutationContext,
): ReceiptIdentity {
  return {
    actorKind: context.actorKind,
    actorRef: context.actorRef,
    commandName,
    idempotencyKey: context.idempotencyKey,
    payloadHash: context.payloadHash,
  };
}

function parseTaskReceipt(value: unknown): TaskReceipt {
  if (!value || typeof value !== 'object') throw new Error('INVALID_RECEIPT');
  const result = value as Record<string, unknown>;
  if (
    typeof result.id !== 'string' ||
    typeof result.projectId !== 'string' ||
    typeof result.revision !== 'number' ||
    typeof result.changed !== 'boolean'
  ) {
    throw new Error('INVALID_RECEIPT');
  }
  return {
    id: result.id,
    projectId: result.projectId,
    revision: result.revision,
    changed: result.changed,
  };
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    revision: row.revision,
    deletedAt: row.deleted_at,
  };
}

function assertTagsBelongToProjectWorkspace(
  db: Database.Database,
  projectId: string,
  tagIds: readonly string[],
): void {
  const check = db.prepare<[string, string], { found: number }>(
    `SELECT count(*) AS found FROM tags AS t
     JOIN projects AS p ON p.workspace_id=t.workspace_id
     WHERE p.id=? AND p.deleted_at IS NULL AND t.id=?`,
  );
  for (const tagId of tagIds) {
    if (check.get(projectId, tagId)?.found !== 1) {
      throw new StorageError('PARENT_PROJECT_UNAVAILABLE');
    }
  }
}

export function createTask(
  db: Database.Database,
  command: CreateTaskCommand,
  idFactory: IdFactory = randomUUID,
): TaskReceipt {
  const identity = receiptIdentity('tasks.create', command);
  return inImmediateTransaction(db, () => {
    const prior = lookupReceipt(db, identity, parseTaskReceipt);
    if (prior) return prior;
    const project = db
      .prepare<
        [string],
        { id: string }
      >('SELECT id FROM projects WHERE id=? AND deleted_at IS NULL')
      .get(command.projectId);
    if (!project) throw new StorageError('PARENT_PROJECT_UNAVAILABLE');
    assertTagsBelongToProjectWorkspace(db, command.projectId, command.tagIds);

    const id = idFactory();
    db.prepare(
      `INSERT INTO tasks
       (id,project_id,title,body_markdown,status,priority,due_date,
        created_at,updated_at,revision)
       VALUES (?,?,?,?,'todo',?,?,?, ?,1)`,
    ).run(
      id,
      command.projectId,
      command.title,
      command.bodyMarkdown,
      command.priority,
      command.dueDate,
      command.now,
      command.now,
    );
    const insertTag = db.prepare(
      'INSERT INTO task_tags(task_id,tag_id) VALUES (?,?)',
    );
    for (const tagId of command.tagIds) insertTag.run(id, tagId);

    db.prepare(
      `INSERT INTO task_history
       (id,task_id,kind,occurred_at,actor_kind,actor_ref,correlation_id)
       VALUES (?,?,'created',?,?,?,?)`,
    ).run(
      idFactory(),
      id,
      command.now,
      command.actorKind,
      command.actorRef,
      command.correlationId,
    );
    appendEvent(db, {
      id: idFactory(),
      type: 'task.created',
      aggregateId: id,
      aggregateRevision: 1,
      occurredAt: command.now,
      actorKind: command.actorKind,
      actorRef: command.actorRef,
      correlationId: command.correlationId,
      payload: { projectId: command.projectId, taskId: id },
    });
    const result: TaskReceipt = {
      id,
      projectId: command.projectId,
      revision: 1,
      changed: true,
    };
    recordReceipt(db, {
      ...identity,
      receiptId: idFactory(),
      result,
      now: command.now,
      expiresAt: command.expiresAt,
    });
    return result;
  });
}

export function renameTask(
  db: Database.Database,
  command: RenameTaskCommand,
  idFactory: IdFactory = randomUUID,
): TaskReceipt {
  const identity = receiptIdentity('tasks.update', command);
  return inImmediateTransaction(db, () => {
    const prior = lookupReceipt(db, identity, parseTaskReceipt);
    if (prior) return prior;
    const current = db
      .prepare<[string], TaskRow>(
        `SELECT id,project_id,title,status,priority,due_date,completed_at,
                revision,deleted_at FROM tasks WHERE id=?`,
      )
      .get(command.taskId);
    if (!current || current.deleted_at !== null) {
      throw new StorageError('NOT_FOUND');
    }
    if (current.revision !== command.expectedRevision) {
      throw new StorageError('CONFLICT_REVISION', {
        currentRevision: current.revision,
        expectedRevision: command.expectedRevision,
        recordId: command.taskId,
      });
    }
    const changed = current.title !== command.title;
    const revision = changed ? current.revision + 1 : current.revision;
    if (changed) {
      const update = db
        .prepare(
          `UPDATE tasks SET title=?,updated_at=?,revision=revision+1
           WHERE id=? AND revision=? AND deleted_at IS NULL`,
        )
        .run(
          command.title,
          command.now,
          command.taskId,
          command.expectedRevision,
        );
      if (update.changes !== 1) throw new StorageError('CONFLICT_REVISION');
      appendEvent(db, {
        id: idFactory(),
        type: 'task.updated',
        aggregateId: command.taskId,
        aggregateRevision: revision,
        occurredAt: command.now,
        actorKind: command.actorKind,
        actorRef: command.actorRef,
        correlationId: command.correlationId,
        payload: { taskId: command.taskId },
      });
    }
    const result: TaskReceipt = {
      id: command.taskId,
      projectId: current.project_id,
      revision,
      changed,
    };
    recordReceipt(db, {
      ...identity,
      receiptId: idFactory(),
      result,
      now: command.now,
      expiresAt: command.expiresAt,
    });
    return result;
  });
}

export function readTask(db: Database.Database, taskId: string): TaskRecord {
  const row = db
    .prepare<[string], TaskRow>(
      `SELECT id,project_id,title,status,priority,due_date,completed_at,
              revision,deleted_at FROM tasks WHERE id=?`,
    )
    .get(taskId);
  if (!row) throw new StorageError('NOT_FOUND');
  return mapTask(row);
}
