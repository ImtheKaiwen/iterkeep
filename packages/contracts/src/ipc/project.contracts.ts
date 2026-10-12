import { z } from 'zod';
import { BaseRequestSchema, MutationMetaSchema } from '../shared/result.js';
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
