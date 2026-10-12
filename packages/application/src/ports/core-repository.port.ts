export type ActorKind = 'user' | 'agent' | 'import' | 'system';
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type DecisionStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'superseded';

export interface PersistenceContext {
  readonly actorKind: ActorKind;
  readonly actorRef: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly now: string;
  readonly expiresAt: string;
}

export interface RevisionReceipt {
  readonly id: string;
  readonly revision: number;
  readonly changed: boolean;
}

export interface WorkspaceSnapshot {
  readonly id: string;
  readonly inboxProjectId: string;
}

export interface ProjectSnapshot {
  readonly id: string;
  readonly workspaceId: string;
  readonly kind: 'user' | 'inbox';
  readonly name: string;
  readonly status: ProjectStatus;
  readonly revision: number;
  readonly deletedAt: string | null;
}

export interface DecisionSnapshot {
  readonly id: string;
  readonly projectId: string;
  readonly status: DecisionStatus;
  readonly revision: number;
  readonly decisionMarkdown: string;
  readonly rationaleMarkdown: string;
  readonly supersedesDecisionId: string | null;
  readonly supersededByDecisionId: string | null;
}

export interface TaskSnapshot {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly status: string;
  readonly revision: number;
  readonly deletedAt: string | null;
}

export interface DocumentSnapshot {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly pinned: boolean;
  readonly revision: number;
  readonly deletedAt: string | null;
}

export interface ActivitySnapshot {
  readonly id: string;
  readonly projectId: string;
  readonly textMarkdown: string;
  readonly occurredAt: string;
  readonly correctionOfId: string | null;
}

export interface TagSnapshot {
  readonly id: string;
  readonly name: string;
  readonly nameKey: string;
}

export interface CoreRepositoryPort {
  getWorkspace(): Promise<WorkspaceSnapshot>;
  getProject(projectId: string): Promise<ProjectSnapshot | null>;
  getTask(taskId: string): Promise<TaskSnapshot | null>;
  getDocument(documentId: string): Promise<DocumentSnapshot | null>;
  getDecision(decisionId: string): Promise<DecisionSnapshot | null>;
  getActivity(activityId: string): Promise<ActivitySnapshot | null>;
  listTags(): Promise<readonly TagSnapshot[]>;

  createProject(input: {
    id: string;
    eventId: string;
    receiptId: string;
    workspaceId: string;
    name: string;
    description: string;
    slug: string;
    priority: Priority;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  createTask(input: {
    id: string;
    historyId: string;
    eventId: string;
    receiptId: string;
    projectId: string;
    title: string;
    bodyMarkdown: string;
    priority: Priority;
    dueDate: string | null;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  createDocument(input: {
    id: string;
    versionId: string;
    eventId: string;
    receiptId: string;
    projectId: string;
    title: string;
    bodyMarkdown: string;
    pinned: boolean;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  saveDocument(input: {
    documentId: string;
    versionId: string;
    eventId: string;
    receiptId: string;
    expectedRevision: number;
    title: string;
    bodyMarkdown: string;
    pinned: boolean;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  createDecision(input: {
    id: string;
    revisionId: string;
    eventId: string;
    receiptId: string;
    projectId: string;
    title: string;
    contextMarkdown: string;
    decisionMarkdown: string;
    rationaleMarkdown: string;
    consequencesMarkdown: string;
    alternativesMarkdown: string;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  acceptDecision(input: {
    decisionId: string;
    revisionId: string;
    eventId: string;
    receiptId: string;
    expectedRevision: number;
    reason: string;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  supersedeDecision(input: {
    oldDecisionId: string;
    newDecisionId: string;
    oldRevisionId: string;
    newRevisionId: string;
    oldEventId: string;
    newEventId: string;
    receiptId: string;
    expectedOldRevision: number;
    expectedNewRevision: number;
    context: PersistenceContext;
  }): Promise<{ oldRevision: number; newRevision: number }>;

  appendActivity(input: {
    id: string;
    eventId: string;
    receiptId: string;
    projectId: string;
    textMarkdown: string;
    occurredAt: string;
    correctionOfId: string | null;
    relatedTaskId: string | null;
    relatedDecisionId: string | null;
    context: PersistenceContext;
  }): Promise<{ id: string }>;

  setProjectDeleted(input: {
    projectId: string;
    eventId: string;
    receiptId: string;
    expectedRevision: number;
    deleted: boolean;
    context: PersistenceContext;
  }): Promise<RevisionReceipt>;

  linkRecords(input: {
    id: string;
    eventId: string;
    receiptId: string;
    source: { kind: string; id: string };
    target: { kind: string; id: string };
    relation: 'references' | 'depends_on' | 'related_to';
    context: PersistenceContext;
  }): Promise<{ id: string }>;

  unlinkRecord(input: {
    linkId: string;
    eventId: string;
    receiptId: string;
    context: PersistenceContext;
  }): Promise<{ removed: boolean }>;

  createTag(input: {
    id: string;
    receiptId: string;
    workspaceId: string;
    name: string;
    nameKey: string;
    context: PersistenceContext;
  }): Promise<TagSnapshot>;

  renameTag(input: {
    tagId: string;
    receiptId: string;
    name: string;
    nameKey: string;
    context: PersistenceContext;
  }): Promise<TagSnapshot>;

  deleteTag(input: {
    tagId: string;
    receiptId: string;
    context: PersistenceContext;
  }): Promise<{ removed: boolean }>;
}
