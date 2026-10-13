import { ipcMain, type BrowserWindow } from 'electron';
import { PROJECT_ROUTES, TASK_ROUTES } from '@iterkeep/contracts';
import {
  ApplicationError,
  type ApplicationCore,
  type Priority,
  type ProjectStatus,
  type TaskStatus,
} from '@iterkeep/application';
import type {
  CommandContext,
  CorrelationId,
  UtcTimestamp,
} from '@iterkeep/domain';
import { IpcRateLimiter } from './ipc/ipc-guards.js';
import {
  registerValidatedIpc,
  type GatewayRequestMeta,
} from './ipc/ipc-gateway.js';

type Input = Record<string, unknown>;

function commandContext(meta: GatewayRequestMeta): CommandContext {
  if (!meta.idempotencyKey)
    throw new ApplicationError('INVALID_IDEMPOTENCY_KEY');
  return {
    actor: { kind: 'user', id: 'local-user' },
    correlationId: meta.requestId as CorrelationId,
    idempotencyKey: meta.idempotencyKey,
    timestamp: new Date().toISOString() as UtcTimestamp,
  };
}

function required<T>(value: unknown): T {
  return value as T;
}

export function registerCoreIpc(
  getWindow: () => BrowserWindow | null,
  core: ApplicationCore,
): () => void {
  const limiter = new IpcRateLimiter();
  const handle = (
    route:
      | (typeof PROJECT_ROUTES)[keyof typeof PROJECT_ROUTES]
      | (typeof TASK_ROUTES)[keyof typeof TASK_ROUTES],
    listener: (value: Input, meta: GatewayRequestMeta) => Promise<unknown>,
  ) =>
    registerValidatedIpc(route, getWindow, limiter, (value, meta) =>
      listener(value as Input, meta),
    );

  handle(PROJECT_ROUTES.get, async (value) => {
    const project = await core.getProject(required<string>(value.projectId));
    if (!project) throw new ApplicationError('NOT_FOUND');
    return project;
  });
  handle(PROJECT_ROUTES.create, (value, meta) =>
    core.createProject(
      value as {
        name: string;
        description?: string;
        priority?: Priority;
        tagIds?: readonly string[];
      },
      commandContext(meta),
    ),
  );
  handle(PROJECT_ROUTES.update, (value, meta) =>
    core.updateProject(
      value as Parameters<ApplicationCore['updateProject']>[0],
      commandContext(meta),
    ),
  );
  handle(PROJECT_ROUTES.changeStatus, (value, meta) =>
    core.changeProjectStatus(
      value as {
        projectId: string;
        expectedRevision: number;
        status: ProjectStatus;
      },
      commandContext(meta),
    ),
  );
  handle(PROJECT_ROUTES.trash, (value, meta) =>
    core.setProjectDeleted(
      {
        projectId: required<string>(value.projectId),
        expectedRevision: required<number>(value.expectedRevision),
        deleted: true,
      },
      commandContext(meta),
    ),
  );
  handle(PROJECT_ROUTES.restore, (value, meta) =>
    core.setProjectDeleted(
      {
        projectId: required<string>(value.projectId),
        expectedRevision: required<number>(value.expectedRevision),
        deleted: false,
      },
      commandContext(meta),
    ),
  );

  handle(TASK_ROUTES.get, async (value) => {
    const task = await core.getTask(required<string>(value.taskId));
    if (!task) throw new ApplicationError('NOT_FOUND');
    return task;
  });
  handle(TASK_ROUTES.create, (value, meta) =>
    core.createTask(
      value as {
        projectId?: string;
        title: string;
        bodyMarkdown?: string;
        priority?: Priority;
        dueDate?: string | null;
        tagIds?: readonly string[];
      },
      commandContext(meta),
    ),
  );
  handle(TASK_ROUTES.update, (value, meta) =>
    core.updateTask(
      value as Parameters<ApplicationCore['updateTask']>[0],
      commandContext(meta),
    ),
  );
  handle(TASK_ROUTES.changeStatus, (value, meta) =>
    core.changeTaskStatus(
      value as {
        taskId: string;
        expectedRevision: number;
        status: TaskStatus;
      },
      commandContext(meta),
    ),
  );
  handle(TASK_ROUTES.move, (value, meta) =>
    core.moveTask(
      value as Parameters<ApplicationCore['moveTask']>[0],
      commandContext(meta),
    ),
  );
  handle(TASK_ROUTES.trash, (value, meta) =>
    core.setTaskDeleted(
      {
        taskId: required<string>(value.taskId),
        expectedRevision: required<number>(value.expectedRevision),
        deleted: true,
      },
      commandContext(meta),
    ),
  );
  handle(TASK_ROUTES.restore, (value, meta) =>
    core.setTaskDeleted(
      {
        taskId: required<string>(value.taskId),
        expectedRevision: required<number>(value.expectedRevision),
        deleted: false,
      },
      commandContext(meta),
    ),
  );

  return () => {
    for (const route of [
      ...Object.values(PROJECT_ROUTES),
      ...Object.values(TASK_ROUTES),
    ]) {
      ipcMain.removeHandler(route.channel);
    }
  };
}
