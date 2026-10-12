import { z } from 'zod';
import {
  IdempotencyKeySchema,
  RequestIdSchema,
  UtcMsSchema,
  UuidV4Schema,
} from './value-schemas.js';

export const FAILURE_CODES = [
  'VALIDATION_FAILED',
  'PAYLOAD_TOO_LARGE',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'CONFLICT_REVISION',
  'INVALID_STATUS_TRANSITION',
  'INBOX_PROTECTED',
  'INBOX_ALREADY_EXISTS',
  'REFERENTIAL_INTEGRITY',
  'LINK_CYCLE',
  'DECISION_HISTORY_PROTECTED',
  'APPROVAL_REQUIRED',
  'APPROVAL_EXPIRED',
  'PERMISSION_DENIED',
  'INVALID_IDEMPOTENCY_KEY',
  'IDEMPOTENCY_CONFLICT',
  'CORE_NOT_READY',
  'WORKSPACE_UNAVAILABLE',
  'SCHEMA_INCOMPATIBLE',
  'DATABASE_BUSY',
  'DATABASE_DISK_FULL',
  'DATABASE_CORRUPT',
  'DB_WORKER_UNAVAILABLE',
  'DB_BACKPRESSURE',
  'OPERATION_OUTCOME_UNKNOWN',
  'TIMEOUT',
  'CANCELLED',
  'CAPABILITY_DISABLED',
  'PROVIDER_UNAVAILABLE',
  'MODEL_UNAVAILABLE',
  'AUDIO_PERMISSION_DENIED',
  'IMPORT_INVALID',
  'EXPORT_FAILED',
  'BACKUP_FAILED',
  'RESTORE_FAILED',
  'INVALID_SELECTION_TOKEN',
  'SELECTION_EXPIRED',
  'UNSUPPORTED_PROTOCOL',
  'EVENT_GAP',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'PORTABLE_UNSUPPORTED_VERSION',
  'PORTABLE_MANIFEST_INVALID',
  'PORTABLE_HASH_MISMATCH',
  'PORTABLE_METADATA_CONFLICT',
  'IMPORT_ARCHIVE_BOMB',
  'IMPORT_ENTRY_LIMIT',
  'IMPORT_PATH_INVALID',
  'IMPORT_FILE_TOO_LARGE',
  'IMPORT_ASSET_TOO_LARGE',
  'IMPORT_TOTAL_LIMIT',
  'IMPORT_METADATA_INVALID',
  'IMPORT_PREVIEW_STALE',
  'IMPORT_TARGET_CHANGED',
  'IMPORT_ASSET_RECOVERY_REQUIRED',
  'EXPORT_TARGET_UNSAFE',
  'EXPORT_TARGET_CHANGED',
  'EXPORT_INCOMPLETE',
  'SOURCE_CHANGED',
  'GIT_UNAVAILABLE',
  'GIT_REPO_NOT_DEDICATED',
  'GIT_INDEX_CONFLICT',
  'GIT_PUSH_REQUIRES_APPROVAL',
  'GIT_REMOTE_OUTCOME_UNKNOWN',
] as const;

const forbiddenDetailKeys = new Set([
  'stack',
  'path',
  'sql',
  'prompt',
  'body',
  'token',
  'env',
]);

export const FailureCodeSchema = z.enum(FAILURE_CODES);
export const SafeDetailsSchema = z
  .record(
    z.string().min(1).max(64),
    z.union([z.string().max(180), z.number(), z.boolean(), z.null()]),
  )
  .refine((details) =>
    Object.keys(details).every(
      (key) => !forbiddenDetailKeys.has(key.toLowerCase()),
    ),
  );
export const ApiErrorSchema = z.strictObject({
  code: FailureCodeSchema,
  messageKey: z.string().regex(/^[a-z0-9_.-]{1,120}$/),
  retryable: z.boolean(),
  outcome: z.enum(['failed', 'unknown']),
  details: SafeDetailsSchema.default({}),
  retryAfterMs: z.number().int().min(0).max(60_000).nullable(),
});
export const ApiMetaSchema = z.strictObject({
  requestId: UuidV4Schema,
  serverTime: UtcMsSchema,
  protocolVersion: z.literal(1),
});

export function resultSchema<T extends z.ZodType>(data: T) {
  return z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), data, meta: ApiMetaSchema }),
    z.strictObject({
      ok: z.literal(false),
      error: ApiErrorSchema,
      meta: ApiMetaSchema,
    }),
  ]);
}

export type ApiResult<T> =
  | { ok: true; data: T; meta: z.infer<typeof ApiMetaSchema> }
  | {
      ok: false;
      error: z.infer<typeof ApiErrorSchema>;
      meta: z.infer<typeof ApiMetaSchema>;
    };

export const BaseRequestSchema = z.strictObject({
  protocolVersion: z.literal(1),
  requestId: RequestIdSchema,
});
export const MutationMetaSchema = BaseRequestSchema.extend({
  idempotencyKey: IdempotencyKeySchema,
});
