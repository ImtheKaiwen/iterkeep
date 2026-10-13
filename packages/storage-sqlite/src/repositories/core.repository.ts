import type {
  CoreRepositoryPort,
  DecisionSnapshot,
  PersistenceContext,
  ProjectSnapshot,
  RevisionReceipt,
  WorkspaceSnapshot,
} from '@iterkeep/application';
import type Database from 'better-sqlite3';
import { ApplicationError } from '@iterkeep/application';
import { StorageError } from '../errors.js';
import { inImmediateTransaction } from '../operations/transaction.js';
import { appendEvent } from './event.repository.js';
import {
  lookupReceipt,
  recordReceipt,
  type ReceiptIdentity,
} from './idempotency.repository.js';

function identity(
  commandName: string,
  context: PersistenceContext,
): ReceiptIdentity {
  return {
    actorKind: context.actorKind,
    actorRef: context.actorRef,
    commandName,
    idempotencyKey: context.idempotencyKey,
    payloadHash: context.payloadHash,
  };
}

function receiptValue<T>(value: unknown): T {
  if (!value || typeof value !== 'object') throw new Error('INVALID_RECEIPT');
  return value as T;
}

function saveReceipt(
  db: Database.Database,
  commandName: string,
  receiptId: string,
  context: PersistenceContext,
  result: unknown,
): void {
  recordReceipt(db, {
    ...identity(commandName, context),
    receiptId,
    result,
    now: context.now,
    expiresAt: context.expiresAt,
  });
}

function actorEvent(
  context: PersistenceContext,
): Pick<
  Parameters<typeof appendEvent>[1],
  'actorKind' | 'actorRef' | 'correlationId' | 'occurredAt'
> {
  return {
    actorKind: context.actorKind,
    actorRef: context.actorRef,
    correlationId: context.correlationId,
    occurredAt: context.now,
  };
}

function assertProjectWritable(db: Database.Database, projectId: string): void {
  const project = db
    .prepare<
      [string],
      { status: string; deleted_at: string | null }
    >('SELECT status,deleted_at FROM projects WHERE id=?')
    .get(projectId);
  if (!project || project.deleted_at !== null) {
    throw new ApplicationError('REFERENTIAL_INTEGRITY');
  }
  if (project.status === 'archived') {
    throw new ApplicationError('INVALID_STATUS_TRANSITION');
  }
}

interface DocumentRow {
  readonly id: string;
  readonly project_id: string;
  readonly title: string;
  readonly body_markdown: string;
  readonly pinned: number;
  readonly revision: number;
  readonly deleted_at: string | null;
}

interface TaskRow {
  readonly id: string;
  readonly project_id: string;
  readonly title: string;
  readonly body_markdown: string;
  readonly status: NonNullable<
    Awaited<ReturnType<CoreRepositoryPort['getTask']>>
  >['status'];
  readonly priority: NonNullable<
    Awaited<ReturnType<CoreRepositoryPort['getTask']>>
  >['priority'];
  readonly due_date: string | null;
  readonly completed_at: string | null;
  readonly sort_order: number;
  readonly blocked_reason: string | null;
  readonly revision: number;
  readonly deleted_at: string | null;
}

interface DecisionRow {
  readonly id: string;
  readonly project_id: string;
  readonly status: DecisionSnapshot['status'];
  readonly revision: number;
  readonly decision_markdown: string;
  readonly rationale_markdown: string;
  readonly supersedes_decision_id: string | null;
  readonly superseded_by_decision_id: string | null;
  readonly title: string;
  readonly context_markdown: string;
  readonly consequences_markdown: string;
  readonly alternatives_markdown: string;
  readonly display_code: string;
  readonly decided_at: string | null;
}

function decisionSnapshot(row: DecisionRow): DecisionSnapshot {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    revision: row.revision,
    decisionMarkdown: row.decision_markdown,
    rationaleMarkdown: row.rationale_markdown,
    supersedesDecisionId: row.supersedes_decision_id,
    supersededByDecisionId: row.superseded_by_decision_id,
  };
}

function decisionRevisionJson(row: DecisionRow, overrides = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    displayCode: row.display_code,
    title: row.title,
    contextMarkdown: row.context_markdown,
    decisionMarkdown: row.decision_markdown,
    rationaleMarkdown: row.rationale_markdown,
    consequencesMarkdown: row.consequences_markdown,
    alternativesMarkdown: row.alternatives_markdown,
    status: row.status,
    decidedAt: row.decided_at,
    supersedesDecisionId: row.supersedes_decision_id,
    supersededByDecisionId: row.superseded_by_decision_id,
    ...overrides,
  });
}

export class SqliteCoreRepository implements CoreRepositoryPort {
  constructor(private readonly db: Database.Database) {}

  async getWorkspace(): Promise<WorkspaceSnapshot> {
    const row = this.db
      .prepare<
        [],
        { id: string; inbox_project_id: string }
      >('SELECT id,inbox_project_id FROM workspaces')
      .get();
    if (!row) throw new ApplicationError('NOT_FOUND');
    return { id: row.id, inboxProjectId: row.inbox_project_id };
  }

  async getProject(projectId: string): Promise<ProjectSnapshot | null> {
    const row = this.db
      .prepare<
        [string],
        {
          id: string;
          workspace_id: string;
          kind: 'user' | 'inbox';
          name: string;
          description: string;
          status: ProjectSnapshot['status'];
          priority: ProjectSnapshot['priority'];
          revision: number;
          deleted_at: string | null;
        }
      >(
        `SELECT id,workspace_id,kind,name,description,status,priority,revision,deleted_at
         FROM projects WHERE id=?`,
      )
      .get(projectId);
    return row
      ? {
          id: row.id,
          workspaceId: row.workspace_id,
          kind: row.kind,
          name: row.name,
          description: row.description,
          status: row.status,
          priority: row.priority,
          revision: row.revision,
          deletedAt: row.deleted_at,
        }
      : null;
  }

  async getTask(taskId: string): ReturnType<CoreRepositoryPort['getTask']> {
    const row = this.db
      .prepare<
        [string],
        {
          id: string;
          project_id: string;
          title: string;
          body_markdown: string;
          status: NonNullable<
            Awaited<ReturnType<CoreRepositoryPort['getTask']>>
          >['status'];
          priority: NonNullable<
            Awaited<ReturnType<CoreRepositoryPort['getTask']>>
          >['priority'];
          due_date: string | null;
          completed_at: string | null;
          sort_order: number;
          blocked_reason: string | null;
          revision: number;
          deleted_at: string | null;
        }
      >(
        `SELECT id,project_id,title,body_markdown,status,priority,due_date,
                completed_at,sort_order,blocked_reason,revision,deleted_at
         FROM tasks WHERE id=?`,
      )
      .get(taskId);
    return Promise.resolve(
      row
        ? {
            id: row.id,
            projectId: row.project_id,
            title: row.title,
            bodyMarkdown: row.body_markdown,
            status: row.status,
            priority: row.priority,
            dueDate: row.due_date,
            completedAt: row.completed_at,
            sortOrder: row.sort_order,
            blockedReason: row.blocked_reason,
            revision: row.revision,
            deletedAt: row.deleted_at,
          }
        : null,
    );
  }

  async getDocument(
    documentId: string,
  ): ReturnType<CoreRepositoryPort['getDocument']> {
    const row = this.db
      .prepare<[string], DocumentRow & { project_id: string }>(
        `SELECT id,project_id,title,body_markdown,pinned,revision,deleted_at
         FROM documents WHERE id=?`,
      )
      .get(documentId);
    return Promise.resolve(
      row
        ? {
            id: row.id,
            projectId: row.project_id,
            title: row.title,
            bodyMarkdown: row.body_markdown,
            pinned: row.pinned === 1,
            revision: row.revision,
            deletedAt: row.deleted_at,
          }
        : null,
    );
  }

  async getDecision(decisionId: string): Promise<DecisionSnapshot | null> {
    const row = this.decisionRow(decisionId);
    return row ? decisionSnapshot(row) : null;
  }

  async getActivity(
    activityId: string,
  ): ReturnType<CoreRepositoryPort['getActivity']> {
    const row = this.db
      .prepare<
        [string],
        {
          id: string;
          project_id: string;
          text_markdown: string;
          occurred_at: string;
          correction_of_id: string | null;
        }
      >(
        `SELECT id,project_id,text_markdown,occurred_at,correction_of_id
         FROM activity_logs WHERE id=?`,
      )
      .get(activityId);
    return Promise.resolve(
      row
        ? {
            id: row.id,
            projectId: row.project_id,
            textMarkdown: row.text_markdown,
            occurredAt: row.occurred_at,
            correctionOfId: row.correction_of_id,
          }
        : null,
    );
  }

  async listTags(): ReturnType<CoreRepositoryPort['listTags']> {
    const rows = this.db
      .prepare<
        [],
        { id: string; name: string; name_key: string }
      >('SELECT id,name,name_key FROM tags ORDER BY name_key,id')
      .all();
    return Promise.resolve(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        nameKey: row.name_key,
      })),
    );
  }

  async createProject(
    input: Parameters<CoreRepositoryPort['createProject']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'projects.create';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      this.db
        .prepare(
          `INSERT INTO projects
           (id,workspace_id,kind,name,description,slug,status,priority,
            created_at,updated_at,revision)
           VALUES (?,?,'user',?,?,?,'active',?,?,?,1)`,
        )
        .run(
          input.id,
          input.workspaceId,
          input.name,
          input.description,
          input.slug,
          input.priority,
          input.context.now,
          input.context.now,
        );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'project.created',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { projectId: input.id },
      });
      const result = { id: input.id, revision: 1, changed: true };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async updateProject(
    input: Parameters<CoreRepositoryPort['updateProject']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'projects.update';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.db
        .prepare<
          [string],
          {
            kind: string;
            name: string;
            description: string;
            priority: ProjectSnapshot['priority'];
            status: ProjectSnapshot['status'];
            revision: number;
            deleted_at: string | null;
          }
        >(
          'SELECT kind,name,description,priority,status,revision,deleted_at FROM projects WHERE id=?',
        )
        .get(input.projectId);
      if (!current || current.deleted_at !== null)
        throw new ApplicationError('NOT_FOUND');
      if (current.kind === 'inbox')
        throw new ApplicationError('INBOX_PROTECTED');
      if (current.status === 'archived')
        throw new ApplicationError('INVALID_STATUS_TRANSITION');
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const name = input.patch.name ?? current.name;
      const description = input.patch.description ?? current.description;
      const priority = input.patch.priority ?? current.priority;
      const changed =
        name !== current.name ||
        description !== current.description ||
        priority !== current.priority;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            `UPDATE projects SET name=?,description=?,priority=?,updated_at=?,revision=revision+1
             WHERE id=? AND revision=? AND deleted_at IS NULL`,
          )
          .run(
            name,
            description,
            priority,
            input.context.now,
            input.projectId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        appendEvent(this.db, {
          id: input.eventId,
          type: 'project.updated',
          aggregateId: input.projectId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { projectId: input.projectId },
        });
      }
      const result = { id: input.projectId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async changeProjectStatus(
    input: Parameters<CoreRepositoryPort['changeProjectStatus']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'projects.status';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.db
        .prepare<
          [string],
          {
            kind: 'user' | 'inbox';
            status: ProjectSnapshot['status'];
            revision: number;
            deleted_at: string | null;
          }
        >('SELECT kind,status,revision,deleted_at FROM projects WHERE id=?')
        .get(input.projectId);
      if (!current || current.deleted_at !== null)
        throw new ApplicationError('NOT_FOUND');
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const allowed: Record<
        ProjectSnapshot['status'],
        readonly ProjectSnapshot['status'][]
      > = {
        active: ['paused', 'completed', 'archived'],
        paused: ['active', 'completed', 'archived'],
        completed: ['active', 'archived'],
        archived: ['active'],
      };
      const changed = current.status !== input.status;
      if (
        changed &&
        (current.kind === 'inbox' ||
          !allowed[current.status].includes(input.status))
      ) {
        throw new ApplicationError(
          current.kind === 'inbox'
            ? 'INBOX_PROTECTED'
            : 'INVALID_STATUS_TRANSITION',
        );
      }
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            'UPDATE projects SET status=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL',
          )
          .run(
            input.status,
            input.context.now,
            input.projectId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        appendEvent(this.db, {
          id: input.eventId,
          type:
            input.status === 'archived'
              ? 'project.archived'
              : 'project.updated',
          aggregateId: input.projectId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { projectId: input.projectId, status: input.status },
        });
      }
      const result = { id: input.projectId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async createTask(
    input: Parameters<CoreRepositoryPort['createTask']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'tasks.create';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      assertProjectWritable(this.db, input.projectId);
      this.db
        .prepare(
          `INSERT INTO tasks
           (id,project_id,title,body_markdown,status,priority,due_date,
            created_at,updated_at,revision)
           VALUES (?,?,?,?,'todo',?,?,?, ?,1)`,
        )
        .run(
          input.id,
          input.projectId,
          input.title,
          input.bodyMarkdown,
          input.priority,
          input.dueDate,
          input.context.now,
          input.context.now,
        );
      this.db
        .prepare(
          `INSERT INTO task_history
           (id,task_id,kind,occurred_at,actor_kind,actor_ref,correlation_id)
           VALUES (?,?,'created',?,?,?,?)`,
        )
        .run(
          input.historyId,
          input.id,
          input.context.now,
          input.context.actorKind,
          input.context.actorRef,
          input.context.correlationId,
        );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'task.created',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { projectId: input.projectId, taskId: input.id },
      });
      const result = { id: input.id, revision: 1, changed: true };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async updateTask(
    input: Parameters<CoreRepositoryPort['updateTask']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'tasks.update';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.requireTaskRow(input.taskId);
      if (current.deleted_at !== null) throw new ApplicationError('NOT_FOUND');
      assertProjectWritable(this.db, current.project_id);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const next = {
        title: input.patch.title ?? current.title,
        body: input.patch.bodyMarkdown ?? current.body_markdown,
        priority: input.patch.priority ?? current.priority,
        dueDate:
          input.patch.dueDate === undefined
            ? current.due_date
            : input.patch.dueDate,
        blockedReason:
          input.patch.blockedReason === undefined
            ? current.blocked_reason
            : input.patch.blockedReason,
      };
      const changed =
        next.title !== current.title ||
        next.body !== current.body_markdown ||
        next.priority !== current.priority ||
        next.dueDate !== current.due_date ||
        next.blockedReason !== current.blocked_reason;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            `UPDATE tasks SET title=?,body_markdown=?,priority=?,due_date=?,blocked_reason=?,updated_at=?,revision=revision+1
           WHERE id=? AND revision=? AND deleted_at IS NULL`,
          )
          .run(
            next.title,
            next.body,
            next.priority,
            next.dueDate,
            next.blockedReason,
            input.context.now,
            input.taskId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        if (next.priority !== current.priority) {
          this.insertTaskHistory(
            input.historyId,
            input.taskId,
            'priority_changed',
            current.priority,
            next.priority,
            input.context,
          );
        }
        appendEvent(this.db, {
          id: input.eventId,
          type: 'task.updated',
          aggregateId: input.taskId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { taskId: input.taskId },
        });
      }
      const result = { id: input.taskId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async changeTaskStatus(
    input: Parameters<CoreRepositoryPort['changeTaskStatus']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'tasks.status';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.requireTaskRow(input.taskId);
      if (current.deleted_at !== null) throw new ApplicationError('NOT_FOUND');
      assertProjectWritable(this.db, current.project_id);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed = current.status !== input.status;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const completedAt = input.status === 'done' ? input.context.now : null;
        const update = this.db
          .prepare(
            `UPDATE tasks SET status=?,completed_at=?,blocked_reason=CASE WHEN ?='blocked' THEN blocked_reason ELSE NULL END,
             updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL`,
          )
          .run(
            input.status,
            completedAt,
            input.status,
            input.context.now,
            input.taskId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        const historyKind =
          input.status === 'done'
            ? 'completed'
            : current.status === 'done'
              ? 'reopened'
              : 'status_changed';
        this.insertTaskHistory(
          input.historyId,
          input.taskId,
          historyKind,
          current.status,
          input.status,
          input.context,
        );
        appendEvent(this.db, {
          id: input.eventId,
          type:
            input.status === 'done'
              ? 'task.completed'
              : current.status === 'done'
                ? 'task.reopened'
                : 'task.updated',
          aggregateId: input.taskId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { taskId: input.taskId, status: input.status },
        });
      }
      const result = { id: input.taskId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async moveTask(
    input: Parameters<CoreRepositoryPort['moveTask']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'tasks.move';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.requireTaskRow(input.taskId);
      if (current.deleted_at !== null) throw new ApplicationError('NOT_FOUND');
      assertProjectWritable(this.db, current.project_id);
      assertProjectWritable(this.db, input.projectId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const status = input.status ?? current.status;
      const sortOrder = input.sortOrder ?? current.sort_order;
      const changed =
        current.project_id !== input.projectId ||
        current.status !== status ||
        current.sort_order !== sortOrder;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const completedAt =
          status === current.status
            ? current.completed_at
            : status === 'done'
              ? input.context.now
              : null;
        const update = this.db
          .prepare(
            `UPDATE tasks SET project_id=?,status=?,sort_order=?,completed_at=?,blocked_reason=CASE WHEN ?='blocked' THEN blocked_reason ELSE NULL END,
             updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND deleted_at IS NULL`,
          )
          .run(
            input.projectId,
            status,
            sortOrder,
            completedAt,
            status,
            input.context.now,
            input.taskId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        if (current.project_id !== input.projectId) {
          this.insertTaskHistory(
            input.moveHistoryId,
            input.taskId,
            'moved_project',
            current.project_id,
            input.projectId,
            input.context,
          );
        }
        if (current.status !== status) {
          this.insertTaskHistory(
            input.statusHistoryId,
            input.taskId,
            status === 'done'
              ? 'completed'
              : current.status === 'done'
                ? 'reopened'
                : 'status_changed',
            current.status,
            status,
            input.context,
          );
        }
        appendEvent(this.db, {
          id: input.eventId,
          type:
            current.project_id !== input.projectId
              ? 'task.moved'
              : status === 'done'
                ? 'task.completed'
                : current.status === 'done'
                  ? 'task.reopened'
                  : 'task.updated',
          aggregateId: input.taskId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { taskId: input.taskId, projectId: input.projectId, status },
        });
      }
      const result = { id: input.taskId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async setTaskDeleted(
    input: Parameters<CoreRepositoryPort['setTaskDeleted']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = input.deleted ? 'tasks.trash' : 'tasks.restore';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.requireTaskRow(input.taskId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      if (input.deleted) assertProjectWritable(this.db, current.project_id);
      else {
        const parent = this.db
          .prepare<
            [string],
            { deleted_at: string | null }
          >('SELECT deleted_at FROM projects WHERE id=?')
          .get(current.project_id);
        if (!parent || parent.deleted_at !== null)
          throw new ApplicationError('REFERENTIAL_INTEGRITY');
      }
      const changed = input.deleted
        ? current.deleted_at === null
        : current.deleted_at !== null;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            'UPDATE tasks SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?',
          )
          .run(
            input.deleted ? input.context.now : null,
            input.context.now,
            input.taskId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        this.insertTaskHistory(
          input.historyId,
          input.taskId,
          input.deleted ? 'deleted' : 'restored',
          null,
          null,
          input.context,
        );
        appendEvent(this.db, {
          id: input.eventId,
          type: input.deleted ? 'task.deleted' : 'task.restored',
          aggregateId: input.taskId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { taskId: input.taskId },
        });
      }
      const result = { id: input.taskId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async createDocument(
    input: Parameters<CoreRepositoryPort['createDocument']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'documents.create';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      assertProjectWritable(this.db, input.projectId);
      this.db
        .prepare(
          `INSERT INTO documents
           (id,project_id,title,body_markdown,pinned,created_at,updated_at,revision)
           VALUES (?,?,?,?,?,?,?,1)`,
        )
        .run(
          input.id,
          input.projectId,
          input.title,
          input.bodyMarkdown,
          input.pinned ? 1 : 0,
          input.context.now,
          input.context.now,
        );
      this.insertDocumentVersion(
        input.id,
        input.versionId,
        1,
        input.title,
        input.bodyMarkdown,
        input.context,
      );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'document.created',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { documentId: input.id, projectId: input.projectId },
      });
      const result = { id: input.id, revision: 1, changed: true };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async saveDocument(
    input: Parameters<CoreRepositoryPort['saveDocument']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'documents.save';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.db
        .prepare<[string], DocumentRow>(
          `SELECT id,project_id,title,body_markdown,pinned,revision,deleted_at
           FROM documents WHERE id=?`,
        )
        .get(input.documentId);
      if (!current || current.deleted_at !== null)
        throw new ApplicationError('NOT_FOUND');
      assertProjectWritable(this.db, current.project_id);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed =
        current.title !== input.title ||
        current.body_markdown !== input.bodyMarkdown ||
        current.pinned !== (input.pinned ? 1 : 0);
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            `UPDATE documents SET title=?,body_markdown=?,pinned=?,updated_at=?,revision=revision+1
             WHERE id=? AND revision=? AND deleted_at IS NULL`,
          )
          .run(
            input.title,
            input.bodyMarkdown,
            input.pinned ? 1 : 0,
            input.context.now,
            input.documentId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        this.insertDocumentVersion(
          input.documentId,
          input.versionId,
          revision,
          input.title,
          input.bodyMarkdown,
          input.context,
        );
        appendEvent(this.db, {
          id: input.eventId,
          type: 'document.updated',
          aggregateId: input.documentId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { documentId: input.documentId },
        });
      }
      const result = { id: input.documentId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async setDocumentDeleted(
    input: Parameters<CoreRepositoryPort['setDocumentDeleted']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = input.deleted ? 'documents.trash' : 'documents.restore';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.db
        .prepare<[string], DocumentRow>(
          `SELECT id,project_id,title,body_markdown,pinned,revision,deleted_at
           FROM documents WHERE id=?`,
        )
        .get(input.documentId);
      if (!current) throw new ApplicationError('NOT_FOUND');
      assertProjectWritable(this.db, current.project_id);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed = input.deleted
        ? current.deleted_at === null
        : current.deleted_at !== null;
      const revision = changed ? current.revision + 1 : current.revision;
      if (changed) {
        const update = this.db
          .prepare(
            'UPDATE documents SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?',
          )
          .run(
            input.deleted ? input.context.now : null,
            input.context.now,
            input.documentId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        this.insertDocumentVersion(
          input.documentId,
          input.versionId,
          revision,
          current.title,
          current.body_markdown,
          input.context,
        );
        appendEvent(this.db, {
          id: input.eventId,
          type: 'document.updated',
          aggregateId: input.documentId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { documentId: input.documentId, deleted: input.deleted },
        });
      }
      const result = { id: input.documentId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async createDecision(
    input: Parameters<CoreRepositoryPort['createDecision']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'decisions.create';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      assertProjectWritable(this.db, input.projectId);
      const next =
        this.db
          .prepare<[string], { next_number: number }>(
            `SELECT COALESCE(MAX(CAST(substr(display_code,5) AS INTEGER)),0)+1 AS next_number
           FROM decisions WHERE project_id=? AND display_code GLOB 'DEC-[0-9]*'`,
          )
          .get(input.projectId)?.next_number ?? 1;
      const displayCode = `DEC-${String(next).padStart(4, '0')}`;
      this.db
        .prepare(
          `INSERT INTO decisions
           (id,project_id,display_code,title,context_markdown,decision_markdown,
            rationale_markdown,consequences_markdown,alternatives_markdown,
            status,created_at,updated_at,revision)
           VALUES (?,?,?,?,?,?,?,?,?,'proposed',?,?,1)`,
        )
        .run(
          input.id,
          input.projectId,
          displayCode,
          input.title,
          input.contextMarkdown,
          input.decisionMarkdown,
          input.rationaleMarkdown,
          input.consequencesMarkdown,
          input.alternativesMarkdown,
          input.context.now,
          input.context.now,
        );
      const row = this.requireDecisionRow(input.id);
      this.insertDecisionRevision(
        row,
        input.revisionId,
        1,
        'created',
        input.context,
      );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'decision.created',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { decisionId: input.id, projectId: input.projectId },
      });
      const result = { id: input.id, revision: 1, changed: true };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async acceptDecision(
    input: Parameters<CoreRepositoryPort['acceptDecision']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = 'decisions.revise';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const current = this.requireDecisionRow(input.decisionId);
      assertProjectWritable(this.db, current.project_id);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      if (current.status !== 'proposed' && current.status !== 'rejected')
        throw new ApplicationError('DECISION_HISTORY_PROTECTED');
      if (
        !current.decision_markdown.trim() ||
        !current.rationale_markdown.trim()
      )
        throw new ApplicationError('VALIDATION_FAILED');
      const revision = current.revision + 1;
      const update = this.db
        .prepare(
          `UPDATE decisions SET status='accepted',decided_at=?,updated_at=?,revision=revision+1
           WHERE id=? AND revision=? AND status IN ('proposed','rejected') AND deleted_at IS NULL`,
        )
        .run(
          input.context.now,
          input.context.now,
          input.decisionId,
          input.expectedRevision,
        );
      if (update.changes !== 1) throw new ApplicationError('CONFLICT_REVISION');
      const updated = this.requireDecisionRow(input.decisionId);
      this.insertDecisionRevision(
        updated,
        input.revisionId,
        revision,
        input.reason,
        input.context,
      );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'decision.accepted',
        aggregateId: input.decisionId,
        aggregateRevision: revision,
        ...actorEvent(input.context),
        payload: { decisionId: input.decisionId },
      });
      const result = { id: input.decisionId, revision, changed: true };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async supersedeDecision(
    input: Parameters<CoreRepositoryPort['supersedeDecision']>[0],
  ): Promise<{ oldRevision: number; newRevision: number }> {
    return inImmediateTransaction(this.db, () => {
      const command = 'decisions.supersede';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<{ oldRevision: number; newRevision: number }>,
      );
      if (prior) return prior;
      const oldDecision = this.requireDecisionRow(input.oldDecisionId);
      const newDecision = this.requireDecisionRow(input.newDecisionId);
      assertProjectWritable(this.db, oldDecision.project_id);
      if (
        oldDecision.project_id !== newDecision.project_id ||
        oldDecision.status !== 'accepted' ||
        newDecision.status !== 'accepted'
      ) {
        throw new ApplicationError('DECISION_HISTORY_PROTECTED');
      }
      if (
        oldDecision.revision !== input.expectedOldRevision ||
        newDecision.revision !== input.expectedNewRevision
      ) {
        throw new ApplicationError('CONFLICT_REVISION');
      }
      const oldRevision = oldDecision.revision + 1;
      const newRevision = newDecision.revision + 1;
      const oldUpdate = this.db
        .prepare(
          `UPDATE decisions SET status='superseded',superseded_by_decision_id=?,updated_at=?,revision=revision+1
         WHERE id=? AND revision=? AND status='accepted' AND superseded_by_decision_id IS NULL AND deleted_at IS NULL`,
        )
        .run(
          input.newDecisionId,
          input.context.now,
          input.oldDecisionId,
          input.expectedOldRevision,
        );
      const newUpdate = this.db
        .prepare(
          `UPDATE decisions SET supersedes_decision_id=?,updated_at=?,revision=revision+1
         WHERE id=? AND revision=? AND status='accepted' AND supersedes_decision_id IS NULL AND deleted_at IS NULL`,
        )
        .run(
          input.oldDecisionId,
          input.context.now,
          input.newDecisionId,
          input.expectedNewRevision,
        );
      if (oldUpdate.changes !== 1 || newUpdate.changes !== 1)
        throw new ApplicationError('CONFLICT_REVISION');
      this.insertDecisionRevision(
        this.requireDecisionRow(input.oldDecisionId),
        input.oldRevisionId,
        oldRevision,
        'superseded',
        input.context,
      );
      this.insertDecisionRevision(
        this.requireDecisionRow(input.newDecisionId),
        input.newRevisionId,
        newRevision,
        'supersedes',
        input.context,
      );
      appendEvent(this.db, {
        id: input.oldEventId,
        type: 'decision.superseded',
        aggregateId: input.oldDecisionId,
        aggregateRevision: oldRevision,
        ...actorEvent(input.context),
        payload: {
          decisionId: input.oldDecisionId,
          supersededByDecisionId: input.newDecisionId,
        },
      });
      appendEvent(this.db, {
        id: input.newEventId,
        type: 'decision.superseded',
        aggregateId: input.newDecisionId,
        aggregateRevision: newRevision,
        ...actorEvent(input.context),
        payload: {
          decisionId: input.newDecisionId,
          supersedesDecisionId: input.oldDecisionId,
        },
      });
      const result = { oldRevision, newRevision };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async appendActivity(
    input: Parameters<CoreRepositoryPort['appendActivity']>[0],
  ): Promise<{ id: string }> {
    return inImmediateTransaction(this.db, () => {
      const command = 'activity.append';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<{ id: string }>,
      );
      if (prior) return prior;
      assertProjectWritable(this.db, input.projectId);
      this.db
        .prepare(
          `INSERT INTO activity_logs
         (id,project_id,text_markdown,occurred_at,recorded_at,actor_kind,actor_ref,
          correction_of_id,correlation_id,related_task_id,related_decision_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          input.id,
          input.projectId,
          input.textMarkdown,
          input.occurredAt,
          input.context.now,
          input.context.actorKind,
          input.context.actorRef,
          input.correctionOfId,
          input.context.correlationId,
          input.relatedTaskId,
          input.relatedDecisionId,
        );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'activity_log.appended',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { activityLogId: input.id, projectId: input.projectId },
      });
      const result = { id: input.id };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async setProjectDeleted(
    input: Parameters<CoreRepositoryPort['setProjectDeleted']>[0],
  ): Promise<RevisionReceipt> {
    return inImmediateTransaction(this.db, () => {
      const command = input.deleted ? 'projects.trash' : 'projects.restore';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<RevisionReceipt>,
      );
      if (prior) return prior;
      const project = this.db
        .prepare<
          [string],
          { kind: string; revision: number; deleted_at: string | null }
        >('SELECT kind,revision,deleted_at FROM projects WHERE id=?')
        .get(input.projectId);
      if (!project) throw new ApplicationError('NOT_FOUND');
      if (project.kind === 'inbox')
        throw new ApplicationError('INBOX_PROTECTED');
      if (project.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed = input.deleted
        ? project.deleted_at === null
        : project.deleted_at !== null;
      const revision = changed ? project.revision + 1 : project.revision;
      if (changed) {
        const update = this.db
          .prepare(
            `UPDATE projects SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?`,
          )
          .run(
            input.deleted ? input.context.now : null,
            input.context.now,
            input.projectId,
            input.expectedRevision,
          );
        if (update.changes !== 1)
          throw new ApplicationError('CONFLICT_REVISION');
        appendEvent(this.db, {
          id: input.eventId,
          type: 'project.updated',
          aggregateId: input.projectId,
          aggregateRevision: revision,
          ...actorEvent(input.context),
          payload: { projectId: input.projectId, deleted: input.deleted },
        });
      }
      const result = { id: input.projectId, revision, changed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async linkRecords(
    input: Parameters<CoreRepositoryPort['linkRecords']>[0],
  ): Promise<{ id: string }> {
    return inImmediateTransaction(this.db, () => {
      const command = 'records.link';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<{ id: string }>,
      );
      if (prior) return prior;
      let source = input.source;
      let target = input.target;
      if (
        input.relation === 'related_to' &&
        `${source.kind}:${source.id}` > `${target.kind}:${target.id}`
      ) {
        [source, target] = [target, source];
      }
      if (input.relation === 'depends_on') {
        if (source.kind !== 'task' || target.kind !== 'task')
          throw new ApplicationError('REFERENTIAL_INTEGRITY');
        const cycle = this.db
          .prepare<[string, string], { would_cycle: number }>(
            `WITH RECURSIVE reach(id) AS (
             SELECT ? UNION
             SELECT rl.target_id FROM record_links rl JOIN reach r ON rl.source_id=r.id
             WHERE rl.source_kind='task' AND rl.target_kind='task' AND rl.relation='depends_on'
           ) SELECT EXISTS(SELECT 1 FROM reach WHERE id=?) AS would_cycle`,
          )
          .get(target.id, source.id)?.would_cycle;
        if (cycle === 1) throw new ApplicationError('REFERENTIAL_INTEGRITY');
      }
      this.db
        .prepare(
          `INSERT INTO record_links
         (id,source_kind,source_id,target_kind,target_id,relation,created_at,actor_kind,actor_ref)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          input.id,
          source.kind,
          source.id,
          target.kind,
          target.id,
          input.relation,
          input.context.now,
          input.context.actorKind,
          input.context.actorRef,
        );
      appendEvent(this.db, {
        id: input.eventId,
        type: 'record_link.created',
        aggregateId: input.id,
        aggregateRevision: 1,
        ...actorEvent(input.context),
        payload: { linkId: input.id },
      });
      const result = { id: input.id };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async unlinkRecord(
    input: Parameters<CoreRepositoryPort['unlinkRecord']>[0],
  ): Promise<{ removed: boolean }> {
    return inImmediateTransaction(this.db, () => {
      const command = 'records.unlink';
      const prior = lookupReceipt(
        this.db,
        identity(command, input.context),
        receiptValue<{ removed: boolean }>,
      );
      if (prior) return prior;
      const removed =
        this.db.prepare('DELETE FROM record_links WHERE id=?').run(input.linkId)
          .changes === 1;
      const result = { removed };
      saveReceipt(this.db, command, input.receiptId, input.context, result);
      return result;
    });
  }

  async createTag(
    input: Parameters<CoreRepositoryPort['createTag']>[0],
  ): ReturnType<CoreRepositoryPort['createTag']> {
    return Promise.resolve(
      inImmediateTransaction(this.db, () => {
        const command = 'tags.create';
        const prior = lookupReceipt(
          this.db,
          identity(command, input.context),
          receiptValue<{ id: string; name: string; nameKey: string }>,
        );
        if (prior) return prior;
        this.db
          .prepare(
            `INSERT INTO tags(id,workspace_id,name,name_key,created_at)
             VALUES (?,?,?,?,?)`,
          )
          .run(
            input.id,
            input.workspaceId,
            input.name,
            input.nameKey,
            input.context.now,
          );
        const result = {
          id: input.id,
          name: input.name,
          nameKey: input.nameKey,
        };
        saveReceipt(this.db, command, input.receiptId, input.context, result);
        return result;
      }),
    );
  }

  async renameTag(
    input: Parameters<CoreRepositoryPort['renameTag']>[0],
  ): ReturnType<CoreRepositoryPort['renameTag']> {
    return Promise.resolve(
      inImmediateTransaction(this.db, () => {
        const command = 'tags.rename';
        const prior = lookupReceipt(
          this.db,
          identity(command, input.context),
          receiptValue<{ id: string; name: string; nameKey: string }>,
        );
        if (prior) return prior;
        const update = this.db
          .prepare('UPDATE tags SET name=?,name_key=? WHERE id=?')
          .run(input.name, input.nameKey, input.tagId);
        if (update.changes !== 1) throw new ApplicationError('NOT_FOUND');
        const result = {
          id: input.tagId,
          name: input.name,
          nameKey: input.nameKey,
        };
        saveReceipt(this.db, command, input.receiptId, input.context, result);
        return result;
      }),
    );
  }

  async deleteTag(
    input: Parameters<CoreRepositoryPort['deleteTag']>[0],
  ): ReturnType<CoreRepositoryPort['deleteTag']> {
    return Promise.resolve(
      inImmediateTransaction(this.db, () => {
        const command = 'tags.delete';
        const prior = lookupReceipt(
          this.db,
          identity(command, input.context),
          receiptValue<{ removed: boolean }>,
        );
        if (prior) return prior;
        const result = {
          removed:
            this.db.prepare('DELETE FROM tags WHERE id=?').run(input.tagId)
              .changes === 1,
        };
        saveReceipt(this.db, command, input.receiptId, input.context, result);
        return result;
      }),
    );
  }

  private requireTaskRow(taskId: string): TaskRow {
    const row = this.db
      .prepare<[string], TaskRow>(
        `SELECT id,project_id,title,body_markdown,status,priority,due_date,
                completed_at,sort_order,blocked_reason,revision,deleted_at
         FROM tasks WHERE id=?`,
      )
      .get(taskId);
    if (!row) throw new ApplicationError('NOT_FOUND');
    return row;
  }

  private insertTaskHistory(
    id: string,
    taskId: string,
    kind:
      | 'status_changed'
      | 'completed'
      | 'reopened'
      | 'moved_project'
      | 'priority_changed'
      | 'deleted'
      | 'restored',
    fromValue: string | null,
    toValue: string | null,
    context: PersistenceContext,
  ): void {
    this.db
      .prepare(
        `INSERT INTO task_history
         (id,task_id,kind,from_value,to_value,occurred_at,actor_kind,actor_ref,correlation_id)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        id,
        taskId,
        kind,
        fromValue,
        toValue,
        context.now,
        context.actorKind,
        context.actorRef,
        context.correlationId,
      );
  }

  private insertDocumentVersion(
    documentId: string,
    versionId: string,
    revision: number,
    title: string,
    body: string,
    context: PersistenceContext,
  ): void {
    this.db
      .prepare(
        `INSERT INTO document_versions
       (id,document_id,revision_number,title,body_markdown,saved_at,actor_kind,actor_ref)
       VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        versionId,
        documentId,
        revision,
        title,
        body,
        context.now,
        context.actorKind,
        context.actorRef,
      );
  }

  private decisionRow(decisionId: string): DecisionRow | undefined {
    return this.db
      .prepare<[string], DecisionRow>(
        `SELECT id,project_id,status,revision,decision_markdown,rationale_markdown,
              supersedes_decision_id,superseded_by_decision_id,title,context_markdown,
              consequences_markdown,alternatives_markdown,display_code,decided_at
       FROM decisions WHERE id=? AND deleted_at IS NULL`,
      )
      .get(decisionId);
  }

  private requireDecisionRow(decisionId: string): DecisionRow {
    const row = this.decisionRow(decisionId);
    if (!row) throw new ApplicationError('NOT_FOUND');
    return row;
  }

  private insertDecisionRevision(
    row: DecisionRow,
    revisionId: string,
    revision: number,
    reason: string,
    context: PersistenceContext,
  ): void {
    this.db
      .prepare(
        `INSERT INTO decision_revisions
       (id,decision_id,revision_number,snapshot_json,changed_at,actor_kind,actor_ref,change_reason)
       VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        revisionId,
        row.id,
        revision,
        decisionRevisionJson(row),
        context.now,
        context.actorKind,
        context.actorRef,
        reason,
      );
  }
}

export function mapStorageApplicationError(error: unknown): never {
  if (error instanceof ApplicationError) throw error;
  if (error instanceof StorageError) {
    if (
      error.code === 'CONFLICT_REVISION' ||
      error.code === 'IDEMPOTENCY_CONFLICT' ||
      error.code === 'NOT_FOUND'
    ) {
      throw new ApplicationError(error.code);
    }
  }
  throw error;
}
