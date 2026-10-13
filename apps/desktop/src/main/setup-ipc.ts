import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { app, BrowserWindow, ipcMain } from 'electron';
import { SETUP_ROUTES } from '@iterkeep/contracts';
import { IpcRateLimiter } from './ipc/ipc-guards.js';
import { registerValidatedIpc } from './ipc/ipc-gateway.js';

interface WorkerReply {
  readonly requestId: string;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: { readonly code: string; readonly safeMessageKey: string };
}

interface SetupState {
  readonly workspaceId: string;
  readonly coreSetupCompleted: boolean;
  readonly lastCompletedStep: string | null;
  readonly aiSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly voiceSetupChoice: 'unselected' | 'enabled' | 'skipped';
  readonly revision: number;
}

interface WorkspaceState {
  readonly id: string;
  readonly displayName: string;
  readonly inboxProjectId: string;
  readonly locale: 'tr-TR' | 'en-US';
  readonly theme: 'system' | 'light' | 'dark';
}

function workspaceSummary(workspace: WorkspaceState): WorkspaceState {
  return {
    id: workspace.id,
    displayName: workspace.displayName,
    inboxProjectId: workspace.inboxProjectId,
    locale: workspace.locale,
    theme: workspace.theme,
  };
}

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
};

export class DatabaseClient {
  readonly #databasePath = path.join(
    app.getPath('userData'),
    'workspace',
    'workspace.db',
  );
  readonly #pending = new Map<string, PendingRequest>();
  #worker: Worker | undefined;
  #ready: Promise<void> | undefined;

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.#databasePath);
      return true;
    } catch {
      return false;
    }
  }

  async request(op: string, payload: unknown): Promise<unknown> {
    await this.#start('open_existing');
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(requestId);
        reject(new Error('storage.timeout'));
      }, 15_000);
      this.#pending.set(requestId, { resolve, reject, timeout });
      this.#worker?.postMessage({
        protocolVersion: 1,
        requestId,
        op,
        timeoutMs: 15_000,
        payload,
      });
    });
  }

  async create(input: {
    displayName: string;
    locale: 'tr-TR' | 'en-US';
    theme: 'system' | 'light' | 'dark';
  }): Promise<{ workspace: WorkspaceState; setup: SetupState }> {
    if (await this.exists()) throw new Error('workspace.already_exists');
    await fs.mkdir(path.dirname(this.#databasePath), { recursive: true });
    await this.#start('create_new');
    const now = new Date().toISOString();
    const workspace = (await this.request('workspace.bootstrap', {
      workspaceId: randomUUID(),
      inboxProjectId: randomUUID(),
      displayName: input.displayName,
      locale: input.locale,
      theme: input.theme,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      now,
    })) as WorkspaceState;
    const setup = (await this.request('setup.read', {})) as SetupState;
    return { workspace: workspaceSummary(workspace), setup };
  }

  async close(): Promise<void> {
    const worker = this.#worker;
    this.#worker = undefined;
    this.#ready = undefined;
    for (const request of this.#pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error('storage.unavailable'));
    }
    this.#pending.clear();
    if (worker) await worker.terminate();
  }

  async #start(intent: 'open_existing' | 'create_new'): Promise<void> {
    if (this.#ready) return this.#ready;
    this.#ready = new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'db.worker.cjs');
      const migrationPath = app.isPackaged
        ? path.join(process.resourcesPath, 'migrations', '0001_initial.sql')
        : path.resolve(
            app.getAppPath(),
            '../../packages/storage-sqlite/migrations/0001_initial.sql',
          );
      const worker = new Worker(workerPath, {
        workerData: {
          mode: 'database',
          databasePath: this.#databasePath,
          migrationPath,
          nativeBindingPath: path.join(
            path.dirname(workerPath),
            'win32-x64.node',
          ),
          appliedAt: new Date().toISOString(),
          intent,
        },
      });
      this.#worker = worker;
      worker.on('message', (message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          (message as { kind?: string }).kind === 'ready'
        ) {
          resolve();
          return;
        }
        const reply = message as WorkerReply;
        const pending = this.#pending.get(reply.requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.#pending.delete(reply.requestId);
        if (reply.ok) pending.resolve(reply.result);
        else
          pending.reject(
            new Error(reply.error?.safeMessageKey ?? 'storage.internal_error'),
          );
      });
      worker.once('error', (error) => {
        this.#ready = undefined;
        reject(new Error('storage.unavailable', { cause: error }));
      });
      worker.once('exit', () => {
        this.#worker = undefined;
        this.#ready = undefined;
      });
    });
    return this.#ready;
  }
}

function createInput(value: unknown): {
  displayName: string;
  locale: 'tr-TR' | 'en-US';
  theme: 'system' | 'light' | 'dark';
} {
  const input = value as Record<string, unknown>;
  return {
    displayName: input.displayName as string,
    locale: input.locale as 'tr-TR' | 'en-US',
    theme: input.theme as 'system' | 'light' | 'dark',
  };
}

function parseSetupMutation(value: unknown, choice: 'none' | 'ai' | 'voice') {
  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
  };
  if (choice === 'none') return result;
  const key = choice === 'ai' ? 'aiSetupChoice' : 'voiceSetupChoice';
  result[key] = input[key];
  result.step = choice;
  return result;
}

export function registerSetupIpc(
  getWindow: () => BrowserWindow | null,
  database: DatabaseClient,
): () => Promise<void> {
  const limiter = new IpcRateLimiter();
  const handle = (
    route: (typeof SETUP_ROUTES)[keyof typeof SETUP_ROUTES],
    listener: (value: unknown) => Promise<unknown>,
  ) => registerValidatedIpc(route, getWindow, limiter, listener);

  handle(SETUP_ROUTES.systemBootstrap, async () => {
    if (!(await database.exists()))
      return { workspaceReady: false, workspace: null, setup: null };
    const [workspace, setup] = await Promise.all([
      database.request('workspace.read', {}),
      database.request('setup.read', {}),
    ]);
    return {
      workspaceReady: true,
      workspace: workspaceSummary(workspace as WorkspaceState),
      setup,
    };
  });
  handle(SETUP_ROUTES.workspaceCreate, (value) =>
    database.create(createInput(value)),
  );
  handle(SETUP_ROUTES.setupGet, () => database.request('setup.read', {}));
  handle(SETUP_ROUTES.setupSaveStep, (value) => {
    const step = (value as Record<string, unknown>).step;
    const parsed = parseSetupMutation(
      value,
      step === 'ai' ? 'ai' : step === 'voice' ? 'voice' : 'none',
    );
    return database.request('setup.save_step', { ...parsed, step });
  });
  handle(SETUP_ROUTES.setupComplete, (value) =>
    database.request('setup.complete', parseSetupMutation(value, 'none')),
  );

  return async () => {
    for (const route of Object.values(SETUP_ROUTES))
      ipcMain.removeHandler(route.channel);
  };
}
