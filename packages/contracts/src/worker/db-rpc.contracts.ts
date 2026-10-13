import { z } from 'zod';
import { FailureCodeSchema } from '../shared/result.js';
import { UuidV4Schema } from '../shared/value-schemas.js';

export const DB_OPERATIONS = [
  'workspace.bootstrap',
  'workspace.read',
  'setup.read',
  'setup.save_step',
  'setup.complete',
  'projects.create',
  'projects.read',
  'projects.list',
  'projects.update',
  'tasks.create',
  'tasks.read',
  'tasks.list',
  'tasks.update',
  'documents.save',
  'documents.read',
  'decisions.create',
  'decisions.read',
  'activity.append',
  'activity.list',
  'search.query',
  'events.since',
  'receipts.lookup',
  'maintenance.backup',
  'maintenance.checkpoint',
  'maintenance.quick_check',
  'maintenance.fts_rebuild',
] as const;

export const DbOperationSchema = z.enum(DB_OPERATIONS);
export const DbWorkerRequestBase = z.strictObject({
  protocolVersion: z.literal(1),
  requestId: UuidV4Schema,
  op: DbOperationSchema,
  timeoutMs: z.number().int().min(1).max(60_000),
  payload: z.unknown(),
});
export const DbWorkerReplyBase = z.discriminatedUnion('ok', [
  z.strictObject({
    protocolVersion: z.literal(1),
    requestId: UuidV4Schema,
    ok: z.literal(true),
    result: z.unknown(),
  }),
  z.strictObject({
    protocolVersion: z.literal(1),
    requestId: UuidV4Schema,
    ok: z.literal(false),
    error: z.strictObject({
      code: FailureCodeSchema,
      retryable: z.boolean(),
      safeMessageKey: z.string().regex(/^[a-z0-9_.-]{1,120}$/),
    }),
  }),
]);
