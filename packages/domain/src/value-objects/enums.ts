export const PROJECT_STATUSES = [
  'active',
  'paused',
  'completed',
  'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const DECISION_STATUSES = [
  'proposed',
  'accepted',
  'rejected',
  'superseded',
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const RECORD_KINDS = [
  'project',
  'task',
  'document',
  'decision',
  'activity_log',
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const RECORD_RELATIONS = [
  'references',
  'depends_on',
  'related_to',
] as const;
export type RecordRelation = (typeof RECORD_RELATIONS)[number];

export const TASK_HISTORY_KINDS = [
  'created',
  'status_changed',
  'completed',
  'reopened',
  'moved_project',
  'priority_changed',
  'deleted',
  'restored',
] as const;
export type TaskHistoryKind = (typeof TASK_HISTORY_KINDS)[number];

export const ACTOR_KINDS = ['user', 'agent', 'import', 'system'] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const AGENT_RUN_STATUSES = [
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export const TOOL_CALL_STATUSES = [
  'proposed',
  'awaiting_approval',
  'running',
  'succeeded',
  'failed',
  'denied',
  'cancelled',
] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUSES)[number];

export const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'denied',
  'expired',
  'cancelled',
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const RISK_LEVELS = ['low', 'medium', 'high'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'tool'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const MESSAGE_STATUSES = [
  'streaming',
  'complete',
  'failed',
  'cancelled',
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const FEATURE_KEYS = ['ai', 'stt', 'tts', 'git'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export const PREFERENCE_MODES = ['enabled', 'disabled'] as const;
export type PreferenceMode = (typeof PREFERENCE_MODES)[number];

export const CAPABILITY_STATES = [
  'unknown',
  'checking',
  'available',
  'unavailable',
  'incompatible',
  'error',
] as const;
export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export const VOICE_CAPTURE_STATUSES = [
  'idle',
  'recording',
  'processing',
  'review',
  'failed',
  'cancelled',
] as const;
export type VoiceCaptureStatus = (typeof VOICE_CAPTURE_STATUSES)[number];

export const JOB_STATUSES = [
  'queued',
  'running',
  'paused',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_KINDS = [
  'model_download',
  'model_benchmark',
  'voice_component_install',
  'stt_transcribe',
  'tts_synthesize',
  'import',
  'export',
  'backup',
  'restore',
  'search_rebuild',
  'git_commit',
  'git_push',
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const DOMAIN_EVENT_TYPES = [
  'project.created',
  'project.updated',
  'project.archived',
  'task.created',
  'task.updated',
  'task.completed',
  'task.reopened',
  'task.moved',
  'task.deleted',
  'task.restored',
  'document.created',
  'document.updated',
  'decision.created',
  'decision.accepted',
  'decision.superseded',
  'activity_log.appended',
  'record_link.created',
] as const;
export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];
