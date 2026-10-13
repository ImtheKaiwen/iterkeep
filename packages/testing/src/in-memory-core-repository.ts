import {
  ApplicationError,
  type CoreRepositoryPort,
  type ActivitySnapshot,
  type DecisionSnapshot,
  type DocumentSnapshot,
  type PersistenceContext,
  type ProjectSnapshot,
  type RevisionReceipt,
  type TagSnapshot,
  type TaskSnapshot,
  type WorkspaceSnapshot,
} from '@iterkeep/application';

interface ReceiptRecord {
  readonly payloadHash: string;
  readonly result: unknown;
}

interface DocumentRecord {
  readonly id: string;
  readonly projectId: string;
  title: string;
  bodyMarkdown: string;
  pinned: boolean;
  revision: number;
  deletedAt: string | null;
}

export class InMemoryCoreRepository implements CoreRepositoryPort {
  readonly projects = new Map<string, ProjectSnapshot>();
  readonly decisions = new Map<string, DecisionSnapshot>();
  readonly documents = new Map<string, DocumentRecord>();
  readonly tasks = new Map<string, TaskSnapshot>();
  readonly activities = new Map<string, ActivitySnapshot>();
  readonly tags = new Map<string, TagSnapshot>();
  readonly links = new Map<string, { id: string }>();
  readonly events: string[] = [];
  readonly receipts = new Map<string, ReceiptRecord>();

  constructor(readonly workspace: WorkspaceSnapshot) {
    this.projects.set(workspace.inboxProjectId, {
      id: workspace.inboxProjectId,
      workspaceId: workspace.id,
      kind: 'inbox',
      name: 'Inbox',
      description: '',
      status: 'active',
      priority: 'none',
      revision: 1,
      deletedAt: null,
    });
  }

  async getWorkspace(): Promise<WorkspaceSnapshot> {
    return this.workspace;
  }

  async getProject(projectId: string): Promise<ProjectSnapshot | null> {
    return this.projects.get(projectId) ?? null;
  }

  async getTask(taskId: string): Promise<TaskSnapshot | null> {
    return this.tasks.get(taskId) ?? null;
  }

  async getDocument(documentId: string): Promise<DocumentSnapshot | null> {
    return this.documents.get(documentId) ?? null;
  }

  async getDecision(decisionId: string): Promise<DecisionSnapshot | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async getActivity(activityId: string): Promise<ActivitySnapshot | null> {
    return this.activities.get(activityId) ?? null;
  }

  async listTags(): Promise<readonly TagSnapshot[]> {
    return [...this.tags.values()].sort((left, right) =>
      left.nameKey.localeCompare(right.nameKey),
    );
  }

  async createProject(
    input: Parameters<CoreRepositoryPort['createProject']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('projects.create', input.context, () => {
      this.projects.set(input.id, {
        id: input.id,
        workspaceId: input.workspaceId,
        kind: 'user',
        name: input.name,
        description: input.description,
        status: 'active',
        priority: input.priority,
        revision: 1,
        deletedAt: null,
      });
      this.events.push(input.eventId);
      return { id: input.id, revision: 1, changed: true };
    });
  }

  async updateProject(
    input: Parameters<CoreRepositoryPort['updateProject']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('projects.update', input.context, () => {
      const current = this.projects.get(input.projectId);
      if (!current || current.deletedAt !== null)
        throw new ApplicationError('NOT_FOUND');
      if (current.kind === 'inbox')
        throw new ApplicationError('INBOX_PROTECTED');
      if (current.status === 'archived')
        throw new ApplicationError('INVALID_STATUS_TRANSITION');
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const next = { ...current, ...input.patch };
      const changed =
        next.name !== current.name ||
        next.description !== current.description ||
        next.priority !== current.priority;
      const updated = {
        ...next,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.projects.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async changeProjectStatus(
    input: Parameters<CoreRepositoryPort['changeProjectStatus']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('projects.status', input.context, () => {
      const current = this.projects.get(input.projectId);
      if (!current || current.deletedAt !== null)
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
      const updated = {
        ...current,
        status: input.status,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.projects.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async createTask(
    input: Parameters<CoreRepositoryPort['createTask']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('tasks.create', input.context, () => {
      this.assertWritable(input.projectId);
      this.tasks.set(input.id, {
        id: input.id,
        projectId: input.projectId,
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        status: 'todo',
        priority: input.priority,
        dueDate: input.dueDate,
        completedAt: null,
        sortOrder: 0,
        blockedReason: null,
        revision: 1,
        deletedAt: null,
      });
      this.events.push(input.eventId);
      return { id: input.id, revision: 1, changed: true };
    });
  }

  async updateTask(
    input: Parameters<CoreRepositoryPort['updateTask']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('tasks.update', input.context, () => {
      const current = this.requireTask(input.taskId);
      if (current.deletedAt !== null) throw new ApplicationError('NOT_FOUND');
      this.assertWritable(current.projectId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const next = { ...current, ...input.patch };
      const changed = Object.keys(input.patch).some(
        (key) =>
          next[key as keyof TaskSnapshot] !==
          current[key as keyof TaskSnapshot],
      );
      const updated = {
        ...next,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.tasks.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async changeTaskStatus(
    input: Parameters<CoreRepositoryPort['changeTaskStatus']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('tasks.status', input.context, () => {
      const current = this.requireTask(input.taskId);
      if (current.deletedAt !== null) throw new ApplicationError('NOT_FOUND');
      this.assertWritable(current.projectId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed = current.status !== input.status;
      const updated = {
        ...current,
        status: input.status,
        completedAt: changed
          ? input.status === 'done'
            ? input.context.now
            : null
          : current.completedAt,
        blockedReason:
          input.status === 'blocked' ? current.blockedReason : null,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.tasks.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async moveTask(
    input: Parameters<CoreRepositoryPort['moveTask']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('tasks.move', input.context, () => {
      const current = this.requireTask(input.taskId);
      if (current.deletedAt !== null) throw new ApplicationError('NOT_FOUND');
      this.assertWritable(current.projectId);
      this.assertWritable(input.projectId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const status = input.status ?? current.status;
      const sortOrder = input.sortOrder ?? current.sortOrder;
      const changed =
        current.projectId !== input.projectId ||
        current.status !== status ||
        current.sortOrder !== sortOrder;
      const updated = {
        ...current,
        projectId: input.projectId,
        status,
        sortOrder,
        completedAt:
          status === current.status
            ? current.completedAt
            : status === 'done'
              ? input.context.now
              : null,
        blockedReason: status === 'blocked' ? current.blockedReason : null,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.tasks.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async setTaskDeleted(
    input: Parameters<CoreRepositoryPort['setTaskDeleted']>[0],
  ): Promise<RevisionReceipt> {
    const command = input.deleted ? 'tasks.trash' : 'tasks.restore';
    return this.once(command, input.context, () => {
      const current = this.requireTask(input.taskId);
      if (current.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const parent = this.projects.get(current.projectId);
      if (!parent || parent.deletedAt !== null)
        throw new ApplicationError('REFERENTIAL_INTEGRITY');
      if (input.deleted && parent.status === 'archived')
        throw new ApplicationError('INVALID_STATUS_TRANSITION');
      const changed = input.deleted
        ? current.deletedAt === null
        : current.deletedAt !== null;
      const updated = {
        ...current,
        deletedAt: input.deleted ? input.context.now : null,
        revision: changed ? current.revision + 1 : current.revision,
      };
      this.tasks.set(current.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: current.id, revision: updated.revision, changed };
    });
  }

  async createDocument(
    input: Parameters<CoreRepositoryPort['createDocument']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('documents.create', input.context, () => {
      this.assertWritable(input.projectId);
      this.documents.set(input.id, {
        id: input.id,
        projectId: input.projectId,
        title: input.title,
        bodyMarkdown: input.bodyMarkdown,
        pinned: input.pinned,
        revision: 1,
        deletedAt: null,
      });
      this.events.push(input.eventId);
      return { id: input.id, revision: 1, changed: true };
    });
  }

  async saveDocument(
    input: Parameters<CoreRepositoryPort['saveDocument']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('documents.save', input.context, () => {
      const document = this.documents.get(input.documentId);
      if (!document) throw new ApplicationError('NOT_FOUND');
      this.assertWritable(document.projectId);
      if (document.revision !== input.expectedRevision) {
        throw new ApplicationError('CONFLICT_REVISION');
      }
      const changed =
        document.title !== input.title ||
        document.bodyMarkdown !== input.bodyMarkdown ||
        document.pinned !== input.pinned;
      if (changed) {
        document.title = input.title;
        document.bodyMarkdown = input.bodyMarkdown;
        document.pinned = input.pinned;
        document.revision += 1;
        this.events.push(input.eventId);
      }
      return { id: document.id, revision: document.revision, changed };
    });
  }

  async setDocumentDeleted(
    input: Parameters<CoreRepositoryPort['setDocumentDeleted']>[0],
  ): Promise<RevisionReceipt> {
    const command = input.deleted ? 'documents.trash' : 'documents.restore';
    return this.once(command, input.context, () => {
      const document = this.documents.get(input.documentId);
      if (!document) throw new ApplicationError('NOT_FOUND');
      this.assertWritable(document.projectId);
      if (document.revision !== input.expectedRevision)
        throw new ApplicationError('CONFLICT_REVISION');
      const changed = input.deleted
        ? document.deletedAt === null
        : document.deletedAt !== null;
      if (changed) {
        document.deletedAt = input.deleted ? input.context.now : null;
        document.revision += 1;
        this.events.push(input.eventId);
      }
      return {
        id: document.id,
        revision: document.revision,
        changed,
      };
    });
  }

  async createDecision(
    input: Parameters<CoreRepositoryPort['createDecision']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('decisions.create', input.context, () => {
      this.assertWritable(input.projectId);
      this.decisions.set(input.id, {
        id: input.id,
        projectId: input.projectId,
        status: 'proposed',
        revision: 1,
        decisionMarkdown: input.decisionMarkdown,
        rationaleMarkdown: input.rationaleMarkdown,
        supersedesDecisionId: null,
        supersededByDecisionId: null,
      });
      this.events.push(input.eventId);
      return { id: input.id, revision: 1, changed: true };
    });
  }

  async acceptDecision(
    input: Parameters<CoreRepositoryPort['acceptDecision']>[0],
  ): Promise<RevisionReceipt> {
    return this.once('decisions.revise', input.context, () => {
      const decision = this.requireDecision(input.decisionId);
      this.assertWritable(decision.projectId);
      if (decision.revision !== input.expectedRevision) {
        throw new ApplicationError('CONFLICT_REVISION');
      }
      if (decision.status !== 'proposed' && decision.status !== 'rejected') {
        throw new ApplicationError('DECISION_HISTORY_PROTECTED');
      }
      const updated = {
        ...decision,
        status: 'accepted' as const,
        revision: decision.revision + 1,
      };
      this.decisions.set(decision.id, updated);
      this.events.push(input.eventId);
      return { id: decision.id, revision: updated.revision, changed: true };
    });
  }

  async supersedeDecision(
    input: Parameters<CoreRepositoryPort['supersedeDecision']>[0],
  ): Promise<{ oldRevision: number; newRevision: number }> {
    return this.once('decisions.supersede', input.context, () => {
      const oldDecision = this.requireDecision(input.oldDecisionId);
      const newDecision = this.requireDecision(input.newDecisionId);
      this.assertWritable(oldDecision.projectId);
      if (
        oldDecision.projectId !== newDecision.projectId ||
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
      this.decisions.set(oldDecision.id, {
        ...oldDecision,
        status: 'superseded',
        revision: oldRevision,
        supersededByDecisionId: newDecision.id,
      });
      this.decisions.set(newDecision.id, {
        ...newDecision,
        revision: newRevision,
        supersedesDecisionId: oldDecision.id,
      });
      this.events.push(input.oldEventId, input.newEventId);
      return { oldRevision, newRevision };
    });
  }

  async appendActivity(
    input: Parameters<CoreRepositoryPort['appendActivity']>[0],
  ): Promise<{ id: string }> {
    return this.once('activity.append', input.context, () => {
      this.assertWritable(input.projectId);
      this.activities.set(input.id, {
        id: input.id,
        projectId: input.projectId,
        textMarkdown: input.textMarkdown,
        occurredAt: input.occurredAt,
        correctionOfId: input.correctionOfId,
      });
      this.events.push(input.eventId);
      return { id: input.id };
    });
  }

  async setProjectDeleted(
    input: Parameters<CoreRepositoryPort['setProjectDeleted']>[0],
  ): Promise<RevisionReceipt> {
    const command = input.deleted ? 'projects.trash' : 'projects.restore';
    return this.once(command, input.context, () => {
      const project = this.projects.get(input.projectId);
      if (!project) throw new ApplicationError('NOT_FOUND');
      if (project.kind === 'inbox')
        throw new ApplicationError('INBOX_PROTECTED');
      if (project.revision !== input.expectedRevision) {
        throw new ApplicationError('CONFLICT_REVISION');
      }
      const changed = input.deleted
        ? project.deletedAt === null
        : project.deletedAt !== null;
      const updated = {
        ...project,
        deletedAt: input.deleted ? input.context.now : null,
        revision: changed ? project.revision + 1 : project.revision,
      };
      this.projects.set(project.id, updated);
      if (changed) this.events.push(input.eventId);
      return { id: project.id, revision: updated.revision, changed };
    });
  }

  async linkRecords(
    input: Parameters<CoreRepositoryPort['linkRecords']>[0],
  ): Promise<{ id: string }> {
    return this.once('records.link', input.context, () => {
      this.links.set(input.id, { id: input.id });
      this.events.push(input.eventId);
      return { id: input.id };
    });
  }

  async unlinkRecord(
    input: Parameters<CoreRepositoryPort['unlinkRecord']>[0],
  ): Promise<{ removed: boolean }> {
    return this.once('records.unlink', input.context, () => ({
      removed: this.links.delete(input.linkId),
    }));
  }

  async createTag(
    input: Parameters<CoreRepositoryPort['createTag']>[0],
  ): Promise<TagSnapshot> {
    return this.once('tags.create', input.context, () => {
      this.assertUniqueTagName(input.nameKey);
      const tag = { id: input.id, name: input.name, nameKey: input.nameKey };
      this.tags.set(tag.id, tag);
      return tag;
    });
  }

  async renameTag(
    input: Parameters<CoreRepositoryPort['renameTag']>[0],
  ): Promise<TagSnapshot> {
    return this.once('tags.rename', input.context, () => {
      if (!this.tags.has(input.tagId)) throw new ApplicationError('NOT_FOUND');
      this.assertUniqueTagName(input.nameKey, input.tagId);
      const tag = {
        id: input.tagId,
        name: input.name,
        nameKey: input.nameKey,
      };
      this.tags.set(tag.id, tag);
      return tag;
    });
  }

  async deleteTag(
    input: Parameters<CoreRepositoryPort['deleteTag']>[0],
  ): Promise<{ removed: boolean }> {
    return this.once('tags.delete', input.context, () => ({
      removed: this.tags.delete(input.tagId),
    }));
  }

  private once<T>(
    command: string,
    context: PersistenceContext,
    operation: () => T,
  ): T {
    const key = `${context.actorKind}:${context.actorRef}:${command}:${context.idempotencyKey}`;
    const prior = this.receipts.get(key);
    if (prior) {
      if (prior.payloadHash !== context.payloadHash) {
        throw new ApplicationError('IDEMPOTENCY_CONFLICT');
      }
      return prior.result as T;
    }
    const result = operation();
    this.receipts.set(key, { payloadHash: context.payloadHash, result });
    return result;
  }

  private assertWritable(projectId: string): void {
    const project = this.projects.get(projectId);
    if (!project || project.deletedAt !== null) {
      throw new ApplicationError('REFERENTIAL_INTEGRITY');
    }
    if (project.status === 'archived') {
      throw new ApplicationError('INVALID_STATUS_TRANSITION');
    }
  }

  private requireDecision(decisionId: string): DecisionSnapshot {
    const decision = this.decisions.get(decisionId);
    if (!decision) throw new ApplicationError('NOT_FOUND');
    return decision;
  }

  private requireTask(taskId: string): TaskSnapshot {
    const task = this.tasks.get(taskId);
    if (!task) throw new ApplicationError('NOT_FOUND');
    return task;
  }

  private assertUniqueTagName(nameKey: string, exceptId?: string): void {
    if (
      [...this.tags.values()].some(
        (tag) => tag.id !== exceptId && tag.nameKey === nameKey,
      )
    ) {
      throw new ApplicationError('VALIDATION_FAILED', { field: 'name' });
    }
  }
}
