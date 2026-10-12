import type {
  AgentRunStatus,
  ApprovalStatus,
  CapabilityState,
  DecisionStatus,
  DomainEventType,
  FeatureKey,
  JobKind,
  JobStatus,
  MessageRole,
  MessageStatus,
  PreferenceMode,
  Priority,
  ProjectStatus,
  RecordKind,
  RecordRelation,
  RiskLevel,
  TaskHistoryKind,
  TaskStatus,
  ToolCallStatus,
} from './value-objects/enums.js';
import type {
  ActivityLogId,
  AgentRunId,
  ApprovalId,
  AttachmentId,
  ConversationId,
  CorrelationId,
  DecisionId,
  DecisionRevisionId,
  DocumentId,
  DocumentVersionId,
  DomainEventId,
  JobId,
  MessageId,
  ProjectId,
  RecordLinkId,
  TagId,
  TaskHistoryId,
  TaskId,
  ToolCallId,
  WorkspaceId,
} from './value-objects/ids.js';
import type { LocalDate, UtcTimestamp } from './value-objects/time.js';

export interface EntityMetadata<Id extends string> {
  readonly id: Id;
  readonly createdAt: UtcTimestamp;
  readonly updatedAt: UtcTimestamp;
  readonly revision: number;
  readonly deletedAt: UtcTimestamp | null;
}

export interface RevisionPrecondition {
  readonly expectedRevision: number;
}

export type ActorRef =
  | { readonly kind: 'user'; readonly id: 'local-user' }
  | { readonly kind: 'agent'; readonly runId: AgentRunId }
  | { readonly kind: 'import'; readonly importJobId: JobId }
  | {
      readonly kind: 'system';
      readonly reason: 'setup' | 'migration' | 'recovery' | 'maintenance';
    };

export interface CommandContext {
  readonly actor: ActorRef;
  readonly correlationId: CorrelationId;
  readonly idempotencyKey: string | null;
  readonly timestamp: UtcTimestamp;
}

export interface Workspace {
  readonly id: WorkspaceId;
  readonly displayName: string;
  readonly inboxProjectId: ProjectId;
  readonly schemaCompatibilityVersion: number;
  readonly createdAt: UtcTimestamp;
  readonly updatedAt: UtcTimestamp;
  readonly revision: number;
}

export interface WorkspacePreferences {
  readonly workspaceId: WorkspaceId;
  readonly locale: 'tr-TR' | 'en-US';
  readonly theme: 'light' | 'dark' | 'system';
  readonly timezone: string;
  readonly lastSelectedProjectId: ProjectId | null;
  readonly lastView: 'dashboard' | 'projects' | 'tasks' | 'search' | 'chat';
  readonly revision: number;
}

export interface Project extends EntityMetadata<ProjectId> {
  readonly kind: 'user' | 'inbox';
  readonly name: string;
  readonly description: string;
  readonly slug: string;
  readonly status: ProjectStatus;
  readonly priority: Priority;
  readonly tagIds: readonly TagId[];
  readonly sortOrder: number;
  readonly lastActivityAt: UtcTimestamp | null;
}

export interface ProjectCreateDraft {
  readonly name: string;
  readonly description?: string;
  readonly priority?: Priority;
  readonly tagIds?: readonly TagId[];
}

export interface Task extends EntityMetadata<TaskId> {
  readonly projectId: ProjectId;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly dueDate: LocalDate | null;
  readonly completedAt: UtcTimestamp | null;
  readonly sortOrder: number;
  readonly tagIds: readonly TagId[];
  readonly blockedReason: string | null;
}

export type TaskChange = Readonly<{
  title?: string;
  bodyMarkdown?: string;
  priority?: Priority;
  dueDate?: LocalDate | null;
  status?: TaskStatus;
  projectId?: ProjectId;
  tagIds?: readonly TagId[];
  blockedReason?: string | null;
}>;

export interface TaskHistoryEntry {
  readonly id: TaskHistoryId;
  readonly taskId: TaskId;
  readonly kind: TaskHistoryKind;
  readonly fromValue: string | null;
  readonly toValue: string | null;
  readonly occurredAt: UtcTimestamp;
  readonly actor: ActorRef;
  readonly correlationId: CorrelationId;
}

export interface Document extends EntityMetadata<DocumentId> {
  readonly projectId: ProjectId;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly pinned: boolean;
  readonly tagIds: readonly TagId[];
}

export interface DocumentVersion {
  readonly id: DocumentVersionId;
  readonly documentId: DocumentId;
  readonly bodyMarkdown: string;
  readonly title: string;
  readonly revisionNumber: number;
  readonly savedAt: UtcTimestamp;
  readonly actor: ActorRef;
}

export interface Decision extends EntityMetadata<DecisionId> {
  readonly projectId: ProjectId;
  readonly displayCode: string;
  readonly title: string;
  readonly contextMarkdown: string;
  readonly decisionMarkdown: string;
  readonly rationaleMarkdown: string;
  readonly consequencesMarkdown: string;
  readonly alternativesMarkdown: string;
  readonly status: DecisionStatus;
  readonly decidedAt: UtcTimestamp | null;
  readonly supersedesDecisionId: DecisionId | null;
  readonly supersededByDecisionId: DecisionId | null;
}

export interface DecisionRevision {
  readonly id: DecisionRevisionId;
  readonly decisionId: DecisionId;
  readonly revisionNumber: number;
  readonly changedAt: UtcTimestamp;
  readonly actor: ActorRef;
  readonly changeReason: string;
}

export interface ActivityLog {
  readonly id: ActivityLogId;
  readonly projectId: ProjectId;
  readonly textMarkdown: string;
  readonly occurredAt: UtcTimestamp;
  readonly recordedAt: UtcTimestamp;
  readonly actor: ActorRef;
  readonly correctionOfId: ActivityLogId | null;
  readonly correlationId: CorrelationId;
  readonly relatedTaskId: TaskId | null;
  readonly relatedDecisionId: DecisionId | null;
}

export interface RecordRef {
  readonly kind: RecordKind;
  readonly id: string;
}
export interface RecordLink {
  readonly id: RecordLinkId;
  readonly source: RecordRef;
  readonly target: RecordRef;
  readonly relation: RecordRelation;
  readonly createdAt: UtcTimestamp;
  readonly actor: ActorRef;
}
export interface Attachment {
  readonly id: AttachmentId;
  readonly owner: RecordRef;
  readonly displayName: string;
  readonly relativeAssetPath: string;
  readonly mediaType: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly createdAt: UtcTimestamp;
  readonly deletedAt: UtcTimestamp | null;
}

export interface Tag {
  readonly id: TagId;
  readonly name: string;
  readonly nameKey: string;
  readonly createdAt: UtcTimestamp;
}

export interface Conversation extends EntityMetadata<ConversationId> {
  readonly projectId: ProjectId | null;
  readonly title: string;
  readonly archived: boolean;
}

export interface AgentRun {
  readonly id: AgentRunId;
  readonly conversationId: ConversationId;
  readonly projectContextId: ProjectId | null;
  readonly status: AgentRunStatus;
  readonly modelProvider: 'ollama';
  readonly selectedModelId: string;
  readonly startedAt: UtcTimestamp | null;
  readonly finishedAt: UtcTimestamp | null;
  readonly createdAt: UtcTimestamp;
  readonly correlationId: CorrelationId;
  readonly errorCode: string | null;
}
export interface ToolCall {
  readonly id: ToolCallId;
  readonly runId: AgentRunId;
  readonly name: string;
  readonly argsRedactedJson: string;
  readonly status: ToolCallStatus;
  readonly resultSummary: string | null;
  readonly startedAt: UtcTimestamp | null;
  readonly completedAt: UtcTimestamp | null;
  readonly errorCode: string | null;
  readonly idempotencyKey: string;
}
export interface ApprovalRequest {
  readonly id: ApprovalId;
  readonly runId: AgentRunId;
  readonly toolCallId: ToolCallId;
  readonly actionFingerprint: string;
  readonly riskLevel: RiskLevel;
  readonly status: ApprovalStatus;
  readonly requestedAt: UtcTimestamp;
  readonly resolvedAt: UtcTimestamp | null;
  readonly expiresAt: UtcTimestamp;
}

export interface ConversationMessage {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly role: MessageRole;
  readonly bodyText: string;
  readonly status: MessageStatus;
  readonly createdAt: UtcTimestamp;
  readonly finalizedAt: UtcTimestamp | null;
  readonly agentRunId: AgentRunId | null;
  readonly toolCallId: ToolCallId | null;
  readonly sequence: number;
}

export interface FeaturePreference {
  readonly feature: FeatureKey;
  readonly preference: PreferenceMode;
  readonly updatedAt: UtcTimestamp;
  readonly revision: number;
}

export interface CapabilitySnapshot {
  readonly feature: FeatureKey;
  readonly state: CapabilityState;
  readonly checkedAt: UtcTimestamp | null;
  readonly diagnosticCode: string | null;
  readonly activeProviderId: string | null;
  readonly details: Readonly<Record<string, string | number | boolean | null>>;
}

export interface SetupState {
  readonly workspaceId: WorkspaceId;
  readonly coreSetupCompleted: boolean;
  readonly lastCompletedStep: string | null;
  readonly aiSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly voiceSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly updatedAt: UtcTimestamp;
  readonly revision: number;
}

export interface ModelProfile {
  readonly id: string;
  readonly provider: 'ollama';
  readonly providerModelName: string;
  readonly modelDigest: string | null;
  readonly contextWindow: number;
  readonly selectedForAgent: boolean;
  readonly createdAt: UtcTimestamp;
  readonly updatedAt: UtcTimestamp;
  readonly revision: number;
}

export interface ModelBenchmarkReceipt {
  readonly id: string;
  readonly profileId: string;
  readonly deviceFingerprint: string;
  readonly benchmarkVersion: string;
  readonly measuredAt: UtcTimestamp;
  readonly firstTokenMs: number | null;
  readonly tokensPerSecond: number | null;
  readonly toolSuccessCount: number;
  readonly toolTestCount: number;
  readonly outcome: 'passed' | 'failed' | 'inconclusive';
}

export interface TranscriptionDraft {
  readonly sourceJobId: JobId;
  readonly text: string;
  readonly detectedLanguage: string | null;
  readonly durationMs: number;
  readonly createdAt: UtcTimestamp;
  readonly editedByUser: boolean;
}

export interface SpeechPlayback {
  readonly sourceMessageId: MessageId | null;
  readonly status: 'queued' | 'playing' | 'finished' | 'failed' | 'cancelled';
  readonly localAudioHandle: string | null;
}

export interface BackgroundJob {
  readonly id: JobId;
  readonly kind: JobKind;
  readonly status: JobStatus;
  readonly progressDone: number | null;
  readonly progressTotal: number | null;
  readonly attempt: number;
  readonly createdAt: UtcTimestamp;
  readonly startedAt: UtcTimestamp | null;
  readonly finishedAt: UtcTimestamp | null;
  readonly errorCode: string | null;
  readonly correlationId: CorrelationId;
}

export interface DomainEvent<
  TPayload extends object = Record<string, unknown>,
> {
  readonly id: DomainEventId;
  readonly type: DomainEventType;
  readonly schemaVersion: 1;
  readonly aggregateId: string;
  readonly aggregateRevision: number;
  readonly occurredAt: UtcTimestamp;
  readonly actor: ActorRef;
  readonly correlationId: CorrelationId;
  readonly causationId: string | null;
  readonly payload: Readonly<TPayload>;
}

export interface TaskSummary {
  readonly id: TaskId;
  readonly projectId: ProjectId;
  readonly title: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly dueDate: LocalDate | null;
  readonly sortOrder: number;
  readonly revision: number;
}

export interface ProjectResumeSnapshot {
  readonly project: Pick<Project, 'id' | 'name' | 'status' | 'revision'>;
  readonly openTasks: readonly TaskSummary[];
  readonly latestLogs: readonly Pick<
    ActivityLog,
    'id' | 'textMarkdown' | 'occurredAt'
  >[];
  readonly recentDecisions: readonly Pick<
    Decision,
    'id' | 'displayCode' | 'title' | 'status' | 'updatedAt'
  >[];
  readonly computedAt: UtcTimestamp;
}
