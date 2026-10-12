export type Brand<Value, Name extends string> = Value & {
  readonly __brand: Name;
};

export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type TaskId = Brand<string, 'TaskId'>;
export type TaskHistoryId = Brand<string, 'TaskHistoryId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type DocumentVersionId = Brand<string, 'DocumentVersionId'>;
export type DecisionId = Brand<string, 'DecisionId'>;
export type DecisionRevisionId = Brand<string, 'DecisionRevisionId'>;
export type ActivityLogId = Brand<string, 'ActivityLogId'>;
export type RecordLinkId = Brand<string, 'RecordLinkId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;
export type TagId = Brand<string, 'TagId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type AgentRunId = Brand<string, 'AgentRunId'>;
export type ToolCallId = Brand<string, 'ToolCallId'>;
export type ApprovalId = Brand<string, 'ApprovalId'>;
export type JobId = Brand<string, 'JobId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type DomainEventId = Brand<string, 'DomainEventId'>;
