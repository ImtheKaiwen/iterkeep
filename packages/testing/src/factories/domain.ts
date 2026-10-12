import {
  type Project,
  type ProjectId,
  type Task,
  type TaskId,
  type UtcTimestamp,
} from '@iterkeep/domain';

const PROJECT_ID = '793c4898-9298-4057-9e1d-95d22e457d21' as ProjectId;
const TASK_ID = 'bcb9f38b-cf43-456d-950d-f294780fabdd' as TaskId;
const NOW = '2026-10-10T14:15:00.000Z' as UtcTimestamp;

export function projectFactory(overrides: Partial<Project> = {}): Project {
  return {
    id: PROJECT_ID,
    kind: 'user',
    name: 'Iterkeep',
    description: '',
    slug: 'iterkeep',
    status: 'active',
    priority: 'none',
    tagIds: [],
    sortOrder: 0,
    lastActivityAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    revision: 1,
    deletedAt: null,
    ...overrides,
  };
}

export function taskFactory(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: 'Contract tests',
    bodyMarkdown: '',
    status: 'todo',
    priority: 'none',
    dueDate: null,
    completedAt: null,
    sortOrder: 0,
    tagIds: [],
    blockedReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    revision: 1,
    deletedAt: null,
    ...overrides,
  };
}
