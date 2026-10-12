import {
  ACTOR_KINDS,
  AGENT_RUN_STATUSES,
  APPROVAL_STATUSES,
  CAPABILITY_STATES,
  DECISION_STATUSES,
  DOMAIN_EVENT_TYPES,
  FEATURE_KEYS,
  JOB_KINDS,
  JOB_STATUSES,
  MESSAGE_ROLES,
  MESSAGE_STATUSES,
  PREFERENCE_MODES,
  PRIORITIES,
  PROJECT_STATUSES,
  RECORD_KINDS,
  RECORD_RELATIONS,
  RISK_LEVELS,
  TASK_HISTORY_KINDS,
  TASK_STATUSES,
  TOOL_CALL_STATUSES,
  VOICE_CAPTURE_STATUSES,
  type Brand,
  type LocalDate,
  type UtcTimestamp,
} from '@iterkeep/domain';
import { z } from 'zod';

const UUID_V4_LOWERCASE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
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
  return bytes;
}

export const UuidV4Schema = z.string().regex(UUID_V4_LOWERCASE);
export const RequestIdSchema = UuidV4Schema;
export const IdempotencyKeySchema = UuidV4Schema;
export const CorrelationIdSchema = UuidV4Schema;

export function brandedUuidSchema<Name extends string>() {
  return UuidV4Schema.transform((value) => value as Brand<string, Name>);
}

export const WorkspaceIdSchema = brandedUuidSchema<'WorkspaceId'>();
export const ProjectIdSchema = brandedUuidSchema<'ProjectId'>();
export const TaskIdSchema = brandedUuidSchema<'TaskId'>();
export const DocumentIdSchema = brandedUuidSchema<'DocumentId'>();
export const DecisionIdSchema = brandedUuidSchema<'DecisionId'>();
export const ActivityLogIdSchema = brandedUuidSchema<'ActivityLogId'>();
export const TagIdSchema = brandedUuidSchema<'TagId'>();
export const JobIdSchema = brandedUuidSchema<'JobId'>();

export const UtcMsSchema = z
  .string()
  .regex(UTC_MILLISECONDS)
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
  })
  .transform((value) => value as UtcTimestamp);

export const LocalDateSchema = z
  .string()
  .regex(LOCAL_DATE)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  })
  .transform((value) => value as LocalDate);

function normalizedCodePointString(min: number, max: number) {
  return z
    .string()
    .transform((value) => value.trim().normalize('NFC'))
    .refine((value) => {
      const length = Array.from(value).length;
      return length >= min && length <= max;
    });
}

export const ProjectNameSchema = normalizedCodePointString(1, 120);
export const TaskTitleSchema = normalizedCodePointString(1, 300).refine(
  (value) => !/[\r\n]/u.test(value),
);
export const DocumentTitleSchema = normalizedCodePointString(1, 200);
export const ShortTextSchema = z
  .string()
  .transform((value) => value.replace(/\r\n?/gu, '\n').normalize('NFC'))
  .refine((value) => utf8ByteLength(value) <= 2_000);
export const MarkdownSchema = z
  .string()
  .transform((value) => value.replace(/\r\n?/gu, '\n').normalize('NFC'))
  .refine((value) => utf8ByteLength(value) <= 2 * 1024 * 1024);

export const PositiveRevisionSchema = z.number().int().min(1);
export const CursorSchema = z.string().min(1).max(2048).optional();
export const PageLimitSchema = z.number().int().min(1).max(100).default(50);

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES);
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const PrioritySchema = z.enum(PRIORITIES);
export const DecisionStatusSchema = z.enum(DECISION_STATUSES);
export const RecordKindSchema = z.enum(RECORD_KINDS);
export const RecordRelationSchema = z.enum(RECORD_RELATIONS);
export const TaskHistoryKindSchema = z.enum(TASK_HISTORY_KINDS);
export const ActorKindSchema = z.enum(ACTOR_KINDS);
export const AgentRunStatusSchema = z.enum(AGENT_RUN_STATUSES);
export const ToolCallStatusSchema = z.enum(TOOL_CALL_STATUSES);
export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES);
export const RiskLevelSchema = z.enum(RISK_LEVELS);
export const MessageRoleSchema = z.enum(MESSAGE_ROLES);
export const MessageStatusSchema = z.enum(MESSAGE_STATUSES);
export const FeatureKeySchema = z.enum(FEATURE_KEYS);
export const PreferenceModeSchema = z.enum(PREFERENCE_MODES);
export const CapabilityStateSchema = z.enum(CAPABILITY_STATES);
export const VoiceCaptureStatusSchema = z.enum(VOICE_CAPTURE_STATUSES);
export const JobStatusSchema = z.enum(JOB_STATUSES);
export const JobKindSchema = z.enum(JOB_KINDS);
export const DomainEventTypeSchema = z.enum(DOMAIN_EVENT_TYPES);

export const RecordRefSchema = z.strictObject({
  kind: RecordKindSchema,
  id: UuidV4Schema,
});
