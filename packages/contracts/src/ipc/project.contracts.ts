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
export const ProjectRevisionReceiptSchema = z.strictObject({
  id: ProjectIdSchema,
  revision: PositiveRevisionSchema,
  changed: z.boolean(),
});

const projectSnapshotResult = resultSchema(ProjectSnapshotSchema);
const projectRevisionResult = resultSchema(ProjectRevisionReceiptSchema);
const routeDefaults = { limitBytes: 128 * 1024, rateLimit: 60 } as const;

export const PROJECT_ROUTES = {
  get: {
    channel: 'iterkeep:v1:projects.get',
    request: ProjectGetRequest,
    response: projectSnapshotResult,
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
