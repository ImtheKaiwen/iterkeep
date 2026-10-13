import { z } from 'zod';
import {
  BaseRequestSchema,
  MutationMetaSchema,
  resultSchema,
} from '../shared/result.js';
import {
  CursorSchema,
  PageLimitSchema,
  PositiveRevisionSchema,
  PrioritySchema,
  ProjectIdSchema,
  ProjectNameSchema,
  ProjectStatusSchema,
  ShortTextSchema,
  TagIdSchema,
  UtcMsSchema,
  UuidV4Schema,
} from '../shared/value-schemas.js';

const uniqueTagIds = z
  .array(TagIdSchema)
  .max(30)
  .refine((ids) => new Set(ids).size === ids.length);

export const ProjectCreatePayload = z.strictObject({
  name: ProjectNameSchema,
  description: ShortTextSchema.optional(),
  priority: PrioritySchema.optional(),
  tagIds: uniqueTagIds.optional(),
});
export const ProjectCreateRequest = MutationMetaSchema.extend({
  payload: ProjectCreatePayload,
});
export const ProjectUpdatePayload = z.strictObject({
  projectId: ProjectIdSchema,
  expectedRevision: PositiveRevisionSchema,
  patch: z
    .strictObject({
      name: ProjectNameSchema.optional(),
      description: ShortTextSchema.optional(),
      priority: PrioritySchema.optional(),
      tagIds: uniqueTagIds.optional(),
    })
    .refine((patch) => Object.keys(patch).length > 0),
});
export const ProjectUpdateRequest = MutationMetaSchema.extend({
  payload: ProjectUpdatePayload,
});
export const ProjectGetRequest = BaseRequestSchema.extend({
  payload: z.strictObject({ projectId: ProjectIdSchema }),
});
export const ProjectStatusRequest = MutationMetaSchema.extend({
  payload: z.strictObject({
    projectId: ProjectIdSchema,
    status: ProjectStatusSchema,
    expectedRevision: PositiveRevisionSchema,
  }),
});
export const ProjectRevisionRequest = MutationMetaSchema.extend({
  payload: z.strictObject({
    projectId: ProjectIdSchema,
    expectedRevision: PositiveRevisionSchema,
  }),
});
export const ProjectListRequest = BaseRequestSchema.extend({
  payload: z.strictObject({
    cursor: CursorSchema,
    limit: PageLimitSchema,
    status: z.array(ProjectStatusSchema).max(4).optional(),
    search: z.string().max(1024).optional(),
    tagIds: uniqueTagIds.optional(),
    sortBy: z.enum(['recent', 'name', 'status']).default('recent'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const ProjectSnapshotSchema = z.strictObject({
  id: ProjectIdSchema,
  workspaceId: UuidV4Schema,
  kind: z.enum(['user', 'inbox']),
  name: z.string().max(120),
  description: z.string().max(2_000),
  status: ProjectStatusSchema,
  priority: PrioritySchema,
  tagIds: uniqueTagIds,
  revision: PositiveRevisionSchema,
  deletedAt: UtcMsSchema.nullable(),
});
export const ProjectSummarySchema = z.strictObject({
  id: ProjectIdSchema,
  kind: z.enum(['user', 'inbox']),
  name: z.string().max(120),
  status: ProjectStatusSchema,
  priority: PrioritySchema,
  lastActivityAt: UtcMsSchema.nullable(),
  openTaskCount: z.number().int().min(0),
  revision: PositiveRevisionSchema,
});
export const ProjectPageSchema = z.strictObject({
  items: z.array(ProjectSummarySchema).max(100),
  nextCursor: z.string().min(1).max(2048).nullable(),
});
const ResumeTaskSchema = z.strictObject({
  id: UuidV4Schema,
  projectId: ProjectIdSchema,
  title: z.string().max(300),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']),
  priority: PrioritySchema,
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .nullable(),
  sortOrder: z.number().int().min(0),
  revision: PositiveRevisionSchema,
});
export const ProjectResumeSnapshotSchema = z.strictObject({
  project: z.strictObject({
    id: ProjectIdSchema,
    name: z.string().max(120),
    status: ProjectStatusSchema,
    revision: PositiveRevisionSchema,
  }),
  openTasks: z.array(ResumeTaskSchema).max(20),
  latestLogs: z
    .array(
      z.strictObject({
        id: UuidV4Schema,
        textMarkdown: z.string().max(2_000),
        occurredAt: UtcMsSchema,
      }),
    )
    .max(20),
  recentDecisions: z
    .array(
      z.strictObject({
        id: UuidV4Schema,
        displayCode: z.string().min(1).max(40),
        title: z.string().max(200),
        status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']),
        updatedAt: UtcMsSchema,
      }),
    )
    .max(10),
  computedAt: UtcMsSchema,
});
export const ProjectRevisionReceiptSchema = z.strictObject({
  id: ProjectIdSchema,
  revision: PositiveRevisionSchema,
  changed: z.boolean(),
});

const projectSnapshotResult = resultSchema(ProjectSnapshotSchema);
const projectPageResult = resultSchema(ProjectPageSchema);
const projectResumeResult = resultSchema(ProjectResumeSnapshotSchema);
const projectRevisionResult = resultSchema(ProjectRevisionReceiptSchema);
const routeDefaults = { limitBytes: 128 * 1024, rateLimit: 60 } as const;

export const PROJECT_ROUTES = {
  list: {
    channel: 'iterkeep:v1:projects.list',
    request: ProjectListRequest,
    response: projectPageResult,
    ...routeDefaults,
  },
  get: {
    channel: 'iterkeep:v1:projects.get',
    request: ProjectGetRequest,
    response: projectSnapshotResult,
    ...routeDefaults,
  },
  getResume: {
    channel: 'iterkeep:v1:projects.resume',
    request: ProjectGetRequest,
    response: projectResumeResult,
    ...routeDefaults,
  },
  create: {
    channel: 'iterkeep:v1:projects.create',
    request: ProjectCreateRequest,
    response: projectRevisionResult,
    ...routeDefaults,
  },
  update: {
    channel: 'iterkeep:v1:projects.update',
    request: ProjectUpdateRequest,
    response: projectRevisionResult,
    ...routeDefaults,
  },
  changeStatus: {
    channel: 'iterkeep:v1:projects.status',
    request: ProjectStatusRequest,
    response: projectRevisionResult,
    ...routeDefaults,
  },
  trash: {
    channel: 'iterkeep:v1:projects.trash',
    request: ProjectRevisionRequest,
    response: projectRevisionResult,
    ...routeDefaults,
  },
  restore: {
    channel: 'iterkeep:v1:projects.restore',
    request: ProjectRevisionRequest,
    response: projectRevisionResult,
    ...routeDefaults,
  },
} as const;
