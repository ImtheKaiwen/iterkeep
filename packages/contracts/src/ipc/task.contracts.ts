import { z } from 'zod';
import { BaseRequestSchema, MutationMetaSchema } from '../shared/result.js';
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
export const RevisionReceipt = z.strictObject({
  id: TaskIdSchema,
  revision: PositiveRevisionSchema,
});
export const TaskStatusPayload = z.strictObject({
  taskId: TaskIdSchema,
  status: TaskStatusSchema,
  expectedRevision: PositiveRevisionSchema,
});
export const TaskStatusRequest = MutationMetaSchema.extend({
  payload: TaskStatusPayload,
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
