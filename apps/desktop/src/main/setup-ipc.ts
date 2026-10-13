import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';

const IPC_CHANNELS = [
  'iterkeep:system.bootstrap',
  'iterkeep:workspace.create',
  'iterkeep:setup.get',
  'iterkeep:setup.saveStep',
  'iterkeep:setup.complete',
] as const;

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

type PendingRequest = {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
};

class SetupDatabaseClient {
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
    return { workspace, setup };
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

function parseCreateInput(value: unknown): {
  displayName: string;
  locale: 'tr-TR' | 'en-US';
  theme: 'system' | 'light' | 'dark';
} {
  if (!value || typeof value !== 'object') throw new Error('validation.failed');
  const input = value as Record<string, unknown>;
  const displayName =
    typeof input.displayName === 'string' ? input.displayName.trim() : '';
  if (displayName.length < 1 || displayName.length > 120)
    throw new Error('validation.failed');
  if (input.locale !== 'tr-TR' && input.locale !== 'en-US')
    throw new Error('validation.failed');
  if (!['system', 'light', 'dark'].includes(String(input.theme)))
    throw new Error('validation.failed');
  return {
    displayName,
    locale: input.locale,
    theme: input.theme as 'system' | 'light' | 'dark',
  };
}

function parseSetupMutation(value: unknown, choice: 'none' | 'ai' | 'voice') {
  if (!value || typeof value !== 'object') throw new Error('validation.failed');
  const input = value as Record<string, unknown>;
  if (
    !Number.isInteger(input.expectedRevision) ||
    Number(input.expectedRevision) < 1
  )
    throw new Error('validation.failed');
  const result: Record<string, unknown> = {
    expectedRevision: input.expectedRevision,
    now: new Date().toISOString(),
  };
  if (choice === 'none') return result;
  const key = choice === 'ai' ? 'aiSetupChoice' : 'voiceSetupChoice';
  if (input[key] !== 'enabled' && input[key] !== 'skipped')
    throw new Error('validation.failed');
  result[key] = input[key];
  result.step = choice;
  return result;
}

export function registerSetupIpc(
  getWindow: () => BrowserWindow | null,
): () => Promise<void> {
  const database = new SetupDatabaseClient();
  const assertTrusted = (event: IpcMainInvokeEvent) => {
    const window = getWindow();
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    )
      throw new Error('permission.denied');
  };
  const handle = (
    channel: (typeof IPC_CHANNELS)[number],
    listener: (value: unknown) => Promise<unknown>,
  ) => {
    ipcMain.handle(channel, async (event, value) => {
      assertTrusted(event);
      return listener(value);
    });
  };

  handle('iterkeep:system.bootstrap', async () => {
    if (!(await database.exists()))
      return { workspaceReady: false, workspace: null, setup: null };
    const [workspace, setup] = await Promise.all([
      database.request('workspace.read', {}),
      database.request('setup.read', {}),
    ]);
    return { workspaceReady: true, workspace, setup };
  });
  handle('iterkeep:workspace.create', (value) =>
    database.create(parseCreateInput(value)),
  );
  handle('iterkeep:setup.get', () => database.request('setup.read', {}));
  handle('iterkeep:setup.saveStep', (value) => {
    if (!value || typeof value !== 'object')
      throw new Error('validation.failed');
    const step = (value as Record<string, unknown>).step;
    if (step !== 'system_check' && step !== 'ai' && step !== 'voice')
      throw new Error('validation.failed');
    const parsed = parseSetupMutation(
      value,
      step === 'ai' ? 'ai' : step === 'voice' ? 'voice' : 'none',
    );
    return database.request('setup.save_step', { ...parsed, step });
  });
  handle('iterkeep:setup.complete', (value) =>
    database.request('setup.complete', parseSetupMutation(value, 'none')),
  );

  return async () => {
    for (const channel of IPC_CHANNELS) ipcMain.removeHandler(channel);
    await database.close();
  };
}
