import { z } from 'zod';
import {
  BaseRequestSchema,
  MutationMetaSchema,
  resultSchema,
} from '../shared/result.js';
import {
  CursorSchema,
  LocalDateSchema,
  MarkdownSchema,
  PageLimitSchema,
  PositiveRevisionSchema,
  PrioritySchema,
  ProjectIdSchema,
  TagIdSchema,
  TaskIdSchema,
  TaskStatusSchema,
  TaskTitleSchema,
  UtcMsSchema,
} from '../shared/value-schemas.js';

const uniqueTagIds = z
  .array(TagIdSchema)
  .max(30)
  .refine((ids) => new Set(ids).size === ids.length);

export const TaskCreatePayload = z.strictObject({
  projectId: ProjectIdSchema.optional(),
  title: TaskTitleSchema,
  bodyMarkdown: MarkdownSchema.optional(),
  priority: PrioritySchema.optional(),
  dueDate: LocalDateSchema.nullable().optional(),
  tagIds: uniqueTagIds.optional(),
});
export const TaskCreateRequest = MutationMetaSchema.extend({
  payload: TaskCreatePayload,
});
export const TaskRevisionReceiptSchema = z.strictObject({
  id: TaskIdSchema,
  revision: PositiveRevisionSchema,
  changed: z.boolean(),
});
export const TaskGetRequest = BaseRequestSchema.extend({
  payload: z.strictObject({ taskId: TaskIdSchema }),
});
export const TaskUpdateRequest = MutationMetaSchema.extend({
  payload: z.strictObject({
    taskId: TaskIdSchema,
    expectedRevision: PositiveRevisionSchema,
    patch: z
      .strictObject({
        title: TaskTitleSchema.optional(),
        bodyMarkdown: MarkdownSchema.optional(),
        priority: PrioritySchema.optional(),
        dueDate: LocalDateSchema.nullable().optional(),
        blockedReason: z.string().max(2_000).nullable().optional(),
        tagIds: uniqueTagIds.optional(),
      })
      .refine((patch) => Object.keys(patch).length > 0),
  }),
});
export const TaskStatusPayload = z.strictObject({
  taskId: TaskIdSchema,
  status: TaskStatusSchema,
  expectedRevision: PositiveRevisionSchema,
});
export const TaskStatusRequest = MutationMetaSchema.extend({
  payload: TaskStatusPayload,
});
export const TaskMoveRequest = MutationMetaSchema.extend({
  payload: z.strictObject({
    taskId: TaskIdSchema,
    projectId: ProjectIdSchema,
    expectedRevision: PositiveRevisionSchema,
    status: TaskStatusSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
});
export const TaskRevisionRequest = MutationMetaSchema.extend({
  payload: z.strictObject({
    taskId: TaskIdSchema,
    expectedRevision: PositiveRevisionSchema,
  }),
});
export const TaskListRequest = BaseRequestSchema.extend({
  payload: z.strictObject({
    projectId: ProjectIdSchema.optional(),
    status: z.array(TaskStatusSchema).max(5).optional(),
    priority: z.array(PrioritySchema).max(5).optional(),
    tagIds: uniqueTagIds.optional(),
    due: z.enum(['overdue', 'today', 'upcoming', 'no_date']).optional(),
    sortBy: z
      .enum(['manual', 'due_date', 'priority', 'updated_at'])
      .default('manual'),
    direction: z.enum(['asc', 'desc']).default('asc'),
    cursor: CursorSchema,
    limit: PageLimitSchema,
  }),
});

export const TaskSnapshotSchema = z.strictObject({
  id: TaskIdSchema,
  projectId: ProjectIdSchema,
  title: z.string().max(300),
  bodyMarkdown: z.string().max(2 * 1024 * 1024),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  dueDate: LocalDateSchema.nullable(),
  completedAt: UtcMsSchema.nullable(),
  sortOrder: z.number().int().min(0),
  blockedReason: z.string().max(2_000).nullable(),
  tagIds: uniqueTagIds,
  revision: PositiveRevisionSchema,
  deletedAt: UtcMsSchema.nullable(),
});

const taskSnapshotResult = resultSchema(TaskSnapshotSchema);
const taskRevisionResult = resultSchema(TaskRevisionReceiptSchema);
const routeDefaults = {
  limitBytes: 2.25 * 1024 * 1024,
  rateLimit: 60,
} as const;

export const TASK_ROUTES = {
  get: {
    channel: 'iterkeep:v1:tasks.get',
    request: TaskGetRequest,
    response: taskSnapshotResult,
    ...routeDefaults,
  },
  create: {
    channel: 'iterkeep:v1:tasks.create',
    request: TaskCreateRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
  update: {
    channel: 'iterkeep:v1:tasks.update',
    request: TaskUpdateRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
  changeStatus: {
    channel: 'iterkeep:v1:tasks.status',
    request: TaskStatusRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
  move: {
    channel: 'iterkeep:v1:tasks.move',
    request: TaskMoveRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
  trash: {
    channel: 'iterkeep:v1:tasks.trash',
    request: TaskRevisionRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
  restore: {
    channel: 'iterkeep:v1:tasks.restore',
    request: TaskRevisionRequest,
    response: taskRevisionResult,
    ...routeDefaults,
  },
} as const;
