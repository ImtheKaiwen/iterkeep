import { contextBridge, ipcRenderer } from 'electron';
import { randomUUID } from 'node:crypto';
import { SETUP_ROUTES } from '@iterkeep/contracts';

async function invoke(
  route: (typeof SETUP_ROUTES)[keyof typeof SETUP_ROUTES],
  payload: unknown,
  mutation = false,
) {
  const requestId = randomUUID();
  const result = await ipcRenderer.invoke(route.channel, {
    protocolVersion: 1,
    requestId,
    ...(mutation ? { idempotencyKey: randomUUID() } : {}),
    payload,
  });
  const parsed = route.response.parse(result);
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
});
