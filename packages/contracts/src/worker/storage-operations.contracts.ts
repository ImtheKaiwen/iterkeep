import { z } from 'zod';
import {
  ActorKindSchema,
  CorrelationIdSchema,
  IdempotencyKeySchema,
  LocalDateSchema,
  MarkdownSchema,
  PageLimitSchema,
  PositiveRevisionSchema,
  PrioritySchema,
  ProjectIdSchema,
  RequestIdSchema,
  TagIdSchema,
  TaskIdSchema,
  TaskTitleSchema,
  UtcMsSchema,
  WorkspaceIdSchema,
} from '../shared/value-schemas.js';

const HashSchema = z.string().regex(/^[0-9a-f]{64}$/);
const ActorRefSchema = z.string().min(1).max(160);
const PathSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => !value.includes('\0'));

const MutationContextSchema = z.strictObject({
  actorKind: ActorKindSchema,
  actorRef: ActorRefSchema,
  correlationId: CorrelationIdSchema,
  idempotencyKey: IdempotencyKeySchema,
  payloadHash: HashSchema,
  now: UtcMsSchema,
  expiresAt: UtcMsSchema,
});

function request<Operation extends string, Payload extends z.ZodType>(
  op: Operation,
  payload: Payload,
) {
  return z.strictObject({
    protocolVersion: z.literal(1),
    requestId: RequestIdSchema,
    op: z.literal(op),
    timeoutMs: z.number().int().min(1).max(60_000),
    payload,
  });
}

export const WorkspaceBootstrapDbRequestSchema = request(
  'workspace.bootstrap',
  z.strictObject({
    workspaceId: WorkspaceIdSchema,
    inboxProjectId: ProjectIdSchema,
    displayName: z.string().trim().min(1).max(120),
    locale: z.enum(['tr-TR', 'en-US']).default('tr-TR'),
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    timezone: z.string().min(1).max(100),
    now: UtcMsSchema,
  }),
);
export const WorkspaceReadDbRequestSchema = request(
  'workspace.read',
  z.strictObject({}),
);
export const SetupReadDbRequestSchema = request(
  'setup.read',
  z.strictObject({}),
);
export const SetupSaveStepDbRequestSchema = request(
  'setup.save_step',
  z.strictObject({
    step: z.enum(['welcome', 'workspace', 'system_check', 'ai', 'voice']),
    aiSetupChoice: z.enum(['enabled', 'skipped']).optional(),
    voiceSetupChoice: z.enum(['enabled', 'skipped']).optional(),
    expectedRevision: PositiveRevisionSchema,
    now: UtcMsSchema,
  }),
);
export const SetupCompleteDbRequestSchema = request(
  'setup.complete',
  z.strictObject({
    expectedRevision: PositiveRevisionSchema,
    now: UtcMsSchema,
  }),
);
export const TaskCreateDbRequestSchema = request(
  'tasks.create',
  z
    .strictObject({
      projectId: ProjectIdSchema,
      title: TaskTitleSchema,
      bodyMarkdown: MarkdownSchema,
      priority: PrioritySchema,
      dueDate: LocalDateSchema.nullable(),
      tagIds: z.array(TagIdSchema).max(100),
    })
    .extend(MutationContextSchema.shape),
);
export const TaskReadDbRequestSchema = request(
  'tasks.read',
  z.strictObject({ taskId: TaskIdSchema }),
);
export const TaskUpdateDbRequestSchema = request(
  'tasks.update',
  z
    .strictObject({
      taskId: TaskIdSchema,
      title: TaskTitleSchema,
      expectedRevision: PositiveRevisionSchema,
    })
    .extend(MutationContextSchema.shape),
);
export const EventsSinceDbRequestSchema = request(
  'events.since',
  z.strictObject({
    sequence: z.number().int().min(0),
    limit: PageLimitSchema,
  }),
);
export const ReceiptLookupDbRequestSchema = request(
  'receipts.lookup',
  z.strictObject({
    actorKind: ActorKindSchema,
    actorRef: ActorRefSchema,
    commandName: z.enum(['tasks.create', 'tasks.update']),
    idempotencyKey: IdempotencyKeySchema,
  }),
);
export const MaintenanceBackupDbRequestSchema = request(
  'maintenance.backup',
  z.strictObject({ destinationPath: PathSchema }),
);
export const MaintenanceCheckpointDbRequestSchema = request(
  'maintenance.checkpoint',
  z.strictObject({}),
);
export const MaintenanceQuickCheckDbRequestSchema = request(
  'maintenance.quick_check',
  z.strictObject({}),
);

export const StorageDbWorkerRequestSchema = z.discriminatedUnion('op', [
  WorkspaceBootstrapDbRequestSchema,
  WorkspaceReadDbRequestSchema,
  SetupReadDbRequestSchema,
  SetupSaveStepDbRequestSchema,
  SetupCompleteDbRequestSchema,
  TaskCreateDbRequestSchema,
  TaskReadDbRequestSchema,
  TaskUpdateDbRequestSchema,
  EventsSinceDbRequestSchema,
  ReceiptLookupDbRequestSchema,
  MaintenanceBackupDbRequestSchema,
  MaintenanceCheckpointDbRequestSchema,
  MaintenanceQuickCheckDbRequestSchema,
]);

export type StorageDbWorkerRequest = z.infer<
  typeof StorageDbWorkerRequestSchema
>;
