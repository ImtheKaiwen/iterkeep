import type { ActorRef, CommandContext } from '@iterkeep/domain';
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
  TagSnapshot,
  TaskSnapshot,
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
    },
    commandContext: CommandContext,
  ): Promise<RevisionReceipt> {
    const payload = {
      name: normalizedRequired(input.name, 120),
      description: normalizedMarkdown(input.description ?? '', 2_000),
      priority: input.priority ?? 'none',
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

  async createTask(
    input: {
      projectId?: string;
      title: string;
      bodyMarkdown?: string;
      priority?: Priority;
      dueDate?: string | null;
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
      dueDate: input.dueDate ?? null,
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
