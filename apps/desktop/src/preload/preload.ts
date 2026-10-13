import { contextBridge, ipcRenderer } from 'electron';
import { randomUUID } from 'node:crypto';
import { PROJECT_ROUTES, SETUP_ROUTES, TASK_ROUTES } from '@iterkeep/contracts';

interface Route {
  readonly channel: `iterkeep:v1:${string}`;
  readonly response: { parse(value: unknown): unknown };
}

async function invoke(route: Route, payload: unknown, mutation = false) {
  const requestId = randomUUID();
  const result = await ipcRenderer.invoke(route.channel, {
    protocolVersion: 1,
    requestId,
    ...(mutation ? { idempotencyKey: randomUUID() } : {}),
    payload,
  });
  const parsed = route.response.parse(result) as
    | { ok: true; data: unknown }
    | { ok: false; error: { messageKey: string } };
  if (!parsed.ok) throw new Error(parsed.error.messageKey);
  return parsed.data;
}

contextBridge.exposeInMainWorld('iterkeep', {
  system: {
    bootstrap: () => invoke(SETUP_ROUTES.systemBootstrap, {}),
  },
  workspace: {
    create: (input: unknown) =>
      invoke(SETUP_ROUTES.workspaceCreate, input, true),
  },
  setup: {
    get: () => invoke(SETUP_ROUTES.setupGet, {}),
    saveStep: (input: unknown) =>
      invoke(SETUP_ROUTES.setupSaveStep, input, true),
    complete: (input: unknown) =>
      invoke(SETUP_ROUTES.setupComplete, input, true),
  },
  projects: {
    get: (projectId: string) => invoke(PROJECT_ROUTES.get, { projectId }),
    create: (input: unknown) => invoke(PROJECT_ROUTES.create, input, true),
    update: (input: unknown) => invoke(PROJECT_ROUTES.update, input, true),
    changeStatus: (input: unknown) =>
      invoke(PROJECT_ROUTES.changeStatus, input, true),
    trash: (input: unknown) => invoke(PROJECT_ROUTES.trash, input, true),
    restore: (input: unknown) => invoke(PROJECT_ROUTES.restore, input, true),
  },
  tasks: {
    get: (taskId: string) => invoke(TASK_ROUTES.get, { taskId }),
    create: (input: unknown) => invoke(TASK_ROUTES.create, input, true),
    update: (input: unknown) => invoke(TASK_ROUTES.update, input, true),
    changeStatus: (input: unknown) =>
      invoke(TASK_ROUTES.changeStatus, input, true),
    move: (input: unknown) => invoke(TASK_ROUTES.move, input, true),
    trash: (input: unknown) => invoke(TASK_ROUTES.trash, input, true),
    restore: (input: unknown) => invoke(TASK_ROUTES.restore, input, true),
  },
});
