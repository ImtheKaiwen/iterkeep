import {
  canTransitionProject,
  planTaskTransition,
  type ActorRef,
  type CommandContext,
} from '@iterkeep/domain';
import { ApplicationError } from './errors.js';
import type {
  CoreRepositoryPort,
  PersistenceContext,
  Priority,
  RevisionReceipt,
  ActivitySnapshot,
  DecisionSnapshot,
  DocumentSnapshot,
  ProjectSnapshot,
  ProjectStatus,
  TagSnapshot,
  TaskSnapshot,
  TaskStatus,
} from './ports/core-repository.port.js';
import type {
  ClockPort,
  IdFactoryPort,
  PayloadHasherPort,
} from './ports/runtime.ports.js';

export interface ApplicationCorePorts {
  readonly repository: CoreRepositoryPort;
  readonly clock: ClockPort;
  readonly ids: IdFactoryPort;
  readonly hasher: PayloadHasherPort;
}

function actorStorageRef(actor: ActorRef): {
  actorKind: PersistenceContext['actorKind'];
  actorRef: string;
} {
  switch (actor.kind) {
    case 'user':
      return { actorKind: 'user', actorRef: actor.id };
    case 'agent':
      return { actorKind: 'agent', actorRef: actor.runId };
    case 'import':
      return { actorKind: 'import', actorRef: actor.importJobId };
    case 'system':
      return { actorKind: 'system', actorRef: actor.reason };
  }
}

function normalizedRequired(value: string, maxCodePoints: number): string {
  const normalized = value.trim().normalize('NFC');
  if (
    normalized.length === 0 ||
    Array.from(normalized).length > maxCodePoints ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  ) {
    throw new ApplicationError('VALIDATION_FAILED');
  }
  return normalized;
}

function normalizedMarkdown(value: string, maximumBytes: number): string {
  const normalized = value.replace(/\r\n?/gu, '\n').normalize('NFC');
  let bytes = 0;
  for (const character of normalized) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;
  }
  if (bytes > maximumBytes) {
    throw new ApplicationError('VALIDATION_FAILED');
  }
  return normalized;
}

function slugFrom(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .slice(0, 160);
  return slug || 'project';
}

function normalizedDate(value: string | null): string | null {
  if (value === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new ApplicationError('VALIDATION_FAILED');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ApplicationError('VALIDATION_FAILED');
  }
  return value;
}

function normalizedTagIds(
  value: readonly string[] | undefined,
): readonly string[] {
  if (!value) return [];
  if (value.length > 30 || new Set(value).size !== value.length) {
    throw new ApplicationError('VALIDATION_FAILED');
  }
  return [...value];
}

function optionalMarkdown<Key extends string>(
  key: Key,
  value: string | undefined,
): Partial<Record<Key, string>> {
  return value === undefined
    ? {}
    : ({ [key]: normalizedMarkdown(value, 2 * 1024 * 1024) } as Record<
        Key,
        string
      >);
}

function assertWritableProject(
  project: Awaited<ReturnType<CoreRepositoryPort['getProject']>>,
): asserts project is NonNullable<typeof project> {
  if (!project || project.deletedAt !== null) {
    throw new ApplicationError('REFERENTIAL_INTEGRITY');
  }
  if (project.status === 'archived') {
    throw new ApplicationError('INVALID_STATUS_TRANSITION');
  }
}

export class ApplicationCore {
  constructor(private readonly ports: ApplicationCorePorts) {}

  getProject(projectId: string): Promise<ProjectSnapshot | null> {
    return this.ports.repository.getProject(projectId);
  }

  getTask(taskId: string): Promise<TaskSnapshot | null> {
    return this.ports.repository.getTask(taskId);
  }

  getDocument(documentId: string): Promise<DocumentSnapshot | null> {
    return this.ports.repository.getDocument(documentId);
  }

  getDecision(decisionId: string): Promise<DecisionSnapshot | null> {
    return this.ports.repository.getDecision(decisionId);
  }

  getActivity(activityId: string): Promise<ActivitySnapshot | null> {
    return this.ports.repository.getActivity(activityId);
  }

  listTags(): Promise<readonly TagSnapshot[]> {
    return this.ports.repository.listTags();
  }

  async createProject(
    input: {
      name: string;
      description?: string;
      priority?: Priority;
      tagIds?: readonly string[];
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const payload = {
      name: normalizedRequired(input.name, 120),
      description: normalizedMarkdown(input.description ?? '', 2_000),
      priority: input.priority ?? 'none',
      tagIds: normalizedTagIds(input.tagIds),
    };
    const workspace = await this.ports.repository.getWorkspace();
    return this.ports.repository.createProject({
      id: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      workspaceId: workspace.id,
      slug: slugFrom(payload.name),
      ...payload,
      context: this.context('projects.create', payload, commandContext),
    });
  }

  async updateProject(
    input: {
      projectId: string;
      expectedRevision: number;
      patch: {
        name?: string;
        description?: string;
        priority?: Priority;
        tagIds?: readonly string[];
      };
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const project = await this.ports.repository.getProject(input.projectId);
    if (!project) throw new ApplicationError('NOT_FOUND');
    if (project.kind === 'inbox') throw new ApplicationError('INBOX_PROTECTED');
    assertWritableProject(project);
    const patch = {
      ...(input.patch.name === undefined
        ? {}
        : { name: normalizedRequired(input.patch.name, 120) }),
      ...(input.patch.description === undefined
        ? {}
        : { description: normalizedMarkdown(input.patch.description, 2_000) }),
      ...(input.patch.priority === undefined
        ? {}
        : { priority: input.patch.priority }),
      ...(input.patch.tagIds === undefined
        ? {}
        : { tagIds: normalizedTagIds(input.patch.tagIds) }),
    };
    if (Object.keys(patch).length === 0)
      throw new ApplicationError('VALIDATION_FAILED');
    const payload = { ...input, patch };
    return this.ports.repository.updateProject({
      projectId: input.projectId,
      expectedRevision: input.expectedRevision,
      patch,
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('projects.update', payload, commandContext),
    });
  }

  async changeProjectStatus(
    input: {
      projectId: string;
      expectedRevision: number;
      status: ProjectStatus;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const project = await this.ports.repository.getProject(input.projectId);
    if (!project) throw new ApplicationError('NOT_FOUND');
    if (project.deletedAt !== null) throw new ApplicationError('NOT_FOUND');
    if (!canTransitionProject(project.status, input.status, project.kind)) {
      throw new ApplicationError(
        project.kind === 'inbox'
          ? 'INBOX_PROTECTED'
          : 'INVALID_STATUS_TRANSITION',
      );
    }
    return this.ports.repository.changeProjectStatus({
      ...input,
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('projects.status', input, commandContext),
    });
  }

  async createTask(
    input: {
      projectId?: string;
      title: string;
      bodyMarkdown?: string;
      priority?: Priority;
      dueDate?: string | null;
      tagIds?: readonly string[];
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const workspace = await this.ports.repository.getWorkspace();
    const projectId = input.projectId ?? workspace.inboxProjectId;
    assertWritableProject(await this.ports.repository.getProject(projectId));
    const payload = {
      projectId,
      title: normalizedRequired(input.title, 300),
      bodyMarkdown: normalizedMarkdown(
        input.bodyMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      priority: input.priority ?? 'none',
      dueDate: normalizedDate(input.dueDate ?? null),
      tagIds: normalizedTagIds(input.tagIds),
    };
    return this.ports.repository.createTask({
      id: this.ports.ids.next(),
      historyId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('tasks.create', payload, commandContext),
    });
  }

  async updateTask(
    input: {
      taskId: string;
      expectedRevision: number;
      patch: {
        title?: string;
        bodyMarkdown?: string;
        priority?: Priority;
        dueDate?: string | null;
        blockedReason?: string | null;
        tagIds?: readonly string[];
      };
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const patch = {
      ...(input.patch.title === undefined
        ? {}
        : { title: normalizedRequired(input.patch.title, 300) }),
      ...(input.patch.bodyMarkdown === undefined
        ? {}
        : {
            bodyMarkdown: normalizedMarkdown(
              input.patch.bodyMarkdown,
              2 * 1024 * 1024,
            ),
          }),
      ...(input.patch.priority === undefined
        ? {}
        : { priority: input.patch.priority }),
      ...(input.patch.dueDate === undefined
        ? {}
        : { dueDate: normalizedDate(input.patch.dueDate) }),
      ...(input.patch.blockedReason === undefined
        ? {}
        : {
            blockedReason:
              input.patch.blockedReason === null
                ? null
                : normalizedMarkdown(input.patch.blockedReason, 2_000),
          }),
      ...(input.patch.tagIds === undefined
        ? {}
        : { tagIds: normalizedTagIds(input.patch.tagIds) }),
    };
    if (Object.keys(patch).length === 0)
      throw new ApplicationError('VALIDATION_FAILED');
    const payload = { ...input, patch };
    return this.ports.repository.updateTask({
      taskId: input.taskId,
      expectedRevision: input.expectedRevision,
      patch,
      historyId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('tasks.update', payload, commandContext),
    });
  }

  async changeTaskStatus(
    input: {
      taskId: string;
      expectedRevision: number;
      status: TaskStatus;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const task = await this.ports.repository.getTask(input.taskId);
    if (!task || task.deletedAt !== null)
      throw new ApplicationError('NOT_FOUND');
    planTaskTransition(task.status, input.status);
    return this.ports.repository.changeTaskStatus({
      ...input,
      historyId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('tasks.status', input, commandContext),
    });
  }

  async moveTask(
    input: {
      taskId: string;
      projectId: string;
      expectedRevision: number;
      status?: TaskStatus;
      sortOrder?: number;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    if (
      input.sortOrder !== undefined &&
      (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0)
    ) {
      throw new ApplicationError('VALIDATION_FAILED');
    }
    assertWritableProject(
      await this.ports.repository.getProject(input.projectId),
    );
    return this.ports.repository.moveTask({
      ...input,
      moveHistoryId: this.ports.ids.next(),
      statusHistoryId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('tasks.move', input, commandContext),
    });
  }

  async setTaskDeleted(
    input: { taskId: string; expectedRevision: number; deleted: boolean },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    return this.ports.repository.setTaskDeleted({
      ...input,
      historyId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context(
        input.deleted ? 'tasks.trash' : 'tasks.restore',
        input,
        commandContext,
      ),
    });
  }

  async createDocument(
    input: {
      projectId: string;
      title: string;
      bodyMarkdown?: string;
      pinned?: boolean;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    assertWritableProject(
      await this.ports.repository.getProject(input.projectId),
    );
    const payload = {
      projectId: input.projectId,
      title: normalizedRequired(input.title, 200),
      bodyMarkdown: normalizedMarkdown(
        input.bodyMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      pinned: input.pinned ?? false,
    };
    return this.ports.repository.createDocument({
      id: this.ports.ids.next(),
      versionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('documents.create', payload, commandContext),
    });
  }

  async saveDocument(
    input: {
      documentId: string;
      expectedRevision: number;
      title: string;
      bodyMarkdown: string;
      pinned: boolean;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const payload = {
      ...input,
      title: normalizedRequired(input.title, 200),
      bodyMarkdown: normalizedMarkdown(input.bodyMarkdown, 2 * 1024 * 1024),
    };
    return this.ports.repository.saveDocument({
      versionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('documents.save', payload, commandContext),
    });
  }

  async setDocumentDeleted(
    input: {
      documentId: string;
      expectedRevision: number;
      deleted: boolean;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    return this.ports.repository.setDocumentDeleted({
      ...input,
      versionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context(
        input.deleted ? 'documents.trash' : 'documents.restore',
        input,
        commandContext,
      ),
    });
  }

  async createDecision(
    input: {
      projectId: string;
      title: string;
      contextMarkdown?: string;
      decisionMarkdown?: string;
      rationaleMarkdown?: string;
      consequencesMarkdown?: string;
      alternativesMarkdown?: string;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    assertWritableProject(
      await this.ports.repository.getProject(input.projectId),
    );
    const payload = {
      projectId: input.projectId,
      title: normalizedRequired(input.title, 200),
      contextMarkdown: normalizedMarkdown(
        input.contextMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      decisionMarkdown: normalizedMarkdown(
        input.decisionMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      rationaleMarkdown: normalizedMarkdown(
        input.rationaleMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      consequencesMarkdown: normalizedMarkdown(
        input.consequencesMarkdown ?? '',
        2 * 1024 * 1024,
      ),
      alternativesMarkdown: normalizedMarkdown(
        input.alternativesMarkdown ?? '',
        2 * 1024 * 1024,
      ),
    };
    return this.ports.repository.createDecision({
      id: this.ports.ids.next(),
      revisionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('decisions.create', payload, commandContext),
    });
  }

  async reviseDecision(
    input: {
      decisionId: string;
      expectedRevision: number;
      patch: {
        title?: string;
        contextMarkdown?: string;
        decisionMarkdown?: string;
        rationaleMarkdown?: string;
        consequencesMarkdown?: string;
        alternativesMarkdown?: string;
        status?: 'proposed' | 'accepted' | 'rejected';
      };
      reason: string;
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const current = await this.ports.repository.getDecision(input.decisionId);
    if (!current) throw new ApplicationError('NOT_FOUND');
    if (current.status === 'superseded') {
      throw new ApplicationError('DECISION_HISTORY_PROTECTED');
    }
    const patch = {
      ...(input.patch.title === undefined
        ? {}
        : { title: normalizedRequired(input.patch.title, 200) }),
      ...optionalMarkdown('contextMarkdown', input.patch.contextMarkdown),
      ...optionalMarkdown('decisionMarkdown', input.patch.decisionMarkdown),
      ...optionalMarkdown('rationaleMarkdown', input.patch.rationaleMarkdown),
      ...optionalMarkdown(
        'consequencesMarkdown',
        input.patch.consequencesMarkdown,
      ),
      ...optionalMarkdown(
        'alternativesMarkdown',
        input.patch.alternativesMarkdown,
      ),
      ...(input.patch.status === undefined
        ? {}
        : { status: input.patch.status }),
    };
    if (Object.keys(patch).length === 0)
      throw new ApplicationError('VALIDATION_FAILED');
    const targetStatus = patch.status ?? current.status;
    if (
      current.status === 'accepted' &&
      (targetStatus !== 'accepted' ||
        patch.contextMarkdown !== undefined ||
        patch.decisionMarkdown !== undefined ||
        patch.rationaleMarkdown !== undefined ||
        patch.consequencesMarkdown !== undefined ||
        patch.alternativesMarkdown !== undefined)
    ) {
      throw new ApplicationError('DECISION_HISTORY_PROTECTED');
    }
    const decisionMarkdown = patch.decisionMarkdown ?? current.decisionMarkdown;
    const rationaleMarkdown =
      patch.rationaleMarkdown ?? current.rationaleMarkdown;
    if (
      targetStatus === 'accepted' &&
      (!decisionMarkdown.trim() || !rationaleMarkdown.trim())
    ) {
      throw new ApplicationError('VALIDATION_FAILED');
    }
    const reason = normalizedRequired(input.reason, 500);
    const payload = {
      decisionId: input.decisionId,
      expectedRevision: input.expectedRevision,
      patch,
      reason,
    };
    return this.ports.repository.reviseDecision({
      ...payload,
      revisionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('decisions.revise', payload, commandContext),
    });
  }

  async acceptDecision(
    input: { decisionId: string; expectedRevision: number; reason: string },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const decision = await this.ports.repository.getDecision(input.decisionId);
    if (!decision) throw new ApplicationError('NOT_FOUND');
    if (
      !decision.decisionMarkdown.trim() ||
      !decision.rationaleMarkdown.trim()
    ) {
      throw new ApplicationError('VALIDATION_FAILED');
    }
    if (decision.status !== 'proposed' && decision.status !== 'rejected') {
      throw new ApplicationError('DECISION_HISTORY_PROTECTED');
    }
    const payload = {
      decisionId: input.decisionId,
      expectedRevision: input.expectedRevision,
      reason: normalizedRequired(input.reason, 500),
    };
    return this.ports.repository.acceptDecision({
      revisionId: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('decisions.revise', payload, commandContext),
    });
  }

  async supersedeDecision(
    input: {
      oldDecisionId: string;
      newDecisionId: string;
      expectedOldRevision: number;
      expectedNewRevision: number;
    },
    commandContext: CommandContext,
  ): Promise<{ oldRevision: number; newRevision: number }> {
    if (input.oldDecisionId === input.newDecisionId) {
      throw new ApplicationError('DECISION_HISTORY_PROTECTED');
    }
    const [oldDecision, newDecision] = await Promise.all([
      this.ports.repository.getDecision(input.oldDecisionId),
      this.ports.repository.getDecision(input.newDecisionId),
    ]);
    if (!oldDecision || !newDecision) throw new ApplicationError('NOT_FOUND');
    if (
      oldDecision.projectId !== newDecision.projectId ||
      oldDecision.status !== 'accepted' ||
      newDecision.status !== 'accepted' ||
      oldDecision.supersededByDecisionId ||
      newDecision.supersedesDecisionId
    ) {
      throw new ApplicationError('DECISION_HISTORY_PROTECTED');
    }
    return this.ports.repository.supersedeDecision({
      ...input,
      oldRevisionId: this.ports.ids.next(),
      newRevisionId: this.ports.ids.next(),
      oldEventId: this.ports.ids.next(),
      newEventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('decisions.supersede', input, commandContext),
    });
  }

  async appendActivity(
    input: {
      projectId: string;
      textMarkdown: string;
      occurredAt?: string;
      correctionOfId?: string;
      relatedTaskId?: string;
      relatedDecisionId?: string;
    },
    commandContext: CommandContext,
  ): Promise<{ id: string }> {
    assertWritableProject(
      await this.ports.repository.getProject(input.projectId),
    );
    const textMarkdown = normalizedMarkdown(input.textMarkdown, 64 * 1024);
    if (!textMarkdown.trim()) throw new ApplicationError('VALIDATION_FAILED');
    const payload = {
      projectId: input.projectId,
      textMarkdown,
      occurredAt: input.occurredAt ?? this.ports.clock.now(),
      correctionOfId: input.correctionOfId ?? null,
      relatedTaskId: input.relatedTaskId ?? null,
      relatedDecisionId: input.relatedDecisionId ?? null,
    };
    return this.ports.repository.appendActivity({
      id: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      ...payload,
      context: this.context('activity.append', payload, commandContext),
    });
  }

  async setProjectDeleted(
    input: { projectId: string; expectedRevision: number; deleted: boolean },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const project = await this.ports.repository.getProject(input.projectId);
    if (!project) throw new ApplicationError('NOT_FOUND');
    if (project.kind === 'inbox') throw new ApplicationError('INBOX_PROTECTED');
    return this.ports.repository.setProjectDeleted({
      ...input,
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context(
        input.deleted ? 'projects.trash' : 'projects.restore',
        input,
        commandContext,
      ),
    });
  }

  async linkRecords(
    input: {
      source: { kind: string; id: string };
      target: { kind: string; id: string };
      relation: 'references' | 'depends_on' | 'related_to';
    },
    commandContext: CommandContext,
  ): Promise<{ id: string }> {
    if (
      input.source.kind === input.target.kind &&
      input.source.id === input.target.id
    ) {
      throw new ApplicationError('REFERENTIAL_INTEGRITY');
    }
    return this.ports.repository.linkRecords({
      ...input,
      id: this.ports.ids.next(),
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('records.link', input, commandContext),
    });
  }

  async unlinkRecord(
    linkId: string,
    commandContext: CommandContext,
  ): Promise<{ removed: boolean }> {
    const payload = { linkId };
    return this.ports.repository.unlinkRecord({
      linkId,
      eventId: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      context: this.context('records.unlink', payload, commandContext),
    });
  }

  async createTag(
    name: string,
    commandContext: CommandContext,
  ): Promise<TagSnapshot> {
    const normalized = normalizedRequired(name, 40);
    const payload = {
      name: normalized,
      nameKey: normalized.toLocaleLowerCase('tr-TR'),
    };
    const workspace = await this.ports.repository.getWorkspace();
    return this.ports.repository.createTag({
      id: this.ports.ids.next(),
      receiptId: this.ports.ids.next(),
      workspaceId: workspace.id,
      ...payload,
      context: this.context('tags.create', payload, commandContext),
    });
  }

  async renameTag(
    tagId: string,
    name: string,
    commandContext: CommandContext,
  ): Promise<TagSnapshot> {
    const normalized = normalizedRequired(name, 40);
    const payload = {
      tagId,
      name: normalized,
      nameKey: normalized.toLocaleLowerCase('tr-TR'),
    };
    return this.ports.repository.renameTag({
      ...payload,
      receiptId: this.ports.ids.next(),
      context: this.context('tags.rename', payload, commandContext),
    });
  }

  async deleteTag(
    tagId: string,
    commandContext: CommandContext,
  ): Promise<{ removed: boolean }> {
    const payload = { tagId };
    return this.ports.repository.deleteTag({
      tagId,
      receiptId: this.ports.ids.next(),
      context: this.context('tags.delete', payload, commandContext),
    });
  }

  private context(
    commandName: string,
    payload: unknown,
    context: CommandContext,
  ): PersistenceContext {
    if (!context.idempotencyKey) {
      throw new ApplicationError('INVALID_IDEMPOTENCY_KEY');
    }
    return {
      ...actorStorageRef(context.actor),
      correlationId: context.correlationId,
      idempotencyKey: context.idempotencyKey,
      payloadHash: this.ports.hasher.hash(commandName, payload),
      now: this.ports.clock.now(),
      expiresAt: this.ports.clock.receiptExpiresAt(),
    };
  }
}
