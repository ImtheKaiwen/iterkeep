import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BrowserWindow } from 'electron';

const argumentPrefix = 'iterkeep-ipc-smoke:';
const argumentPattern =
  /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(create|restart)$/iu;

export interface PackagedIpcSmokeRequest {
  readonly runId: string;
  readonly phase: 'create' | 'restart';
  readonly runDirectory: string;
}

export function getPackagedIpcSmokeRequest(
  argv: readonly string[],
): PackagedIpcSmokeRequest | undefined {
  const argument = argv.find((value) => value.startsWith(argumentPrefix));
  if (!argument) return undefined;
  const match = argument.slice(argumentPrefix.length).match(argumentPattern);
  if (!match) throw new Error('Invalid packaged IPC smoke argument');
  const runId = match[1] as string;
  return {
    runId,
    phase: match[2] as 'create' | 'restart',
    runDirectory: path.join(os.tmpdir(), 'iterkeep-ipc-smoke', runId),
  };
}

export async function runPackagedIpcSmoke(
  request: PackagedIpcSmokeRequest,
  window: BrowserWindow,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    window.webContents.once('did-finish-load', () => resolve());
    window.webContents.once('did-fail-load', (_event, code, description) =>
      reject(new Error(`Renderer load failed ${code}: ${description}`)),
    );
  });

  const result = await window.webContents.executeJavaScript(`
    (async () => {
      const api = window.iterkeep;
      const countFunctions = (value) => Object.values(value).reduce(
        (total, child) => total + (typeof child === 'function' ? 1 : countFunctions(child)),
        0,
      );
      const captureError = async (operation) => {
        try { await operation(); return null; }
        catch (error) { return error instanceof Error ? error.message : String(error); }
      };
      const before = await api.system.bootstrap();
      let created = null;
      if (${JSON.stringify(request.phase)} === 'create') {
        created = await api.workspace.create({
          displayName: 'IPC Smoke Workspace',
          locale: 'tr-TR',
          theme: 'system',
        });
      }
      const after = await api.system.bootstrap();
      return {
        phase: ${JSON.stringify(request.phase)},
        before,
        after,
        created,
        namedFunctionCount: countFunctions(api),
        genericInvokeType: typeof api.invoke,
        disabledCapabilityError: await captureError(() => api.system.health()),
        oversizedPayloadError: await captureError(() =>
          api.system.openExternalUrl({ url: 'x'.repeat(140000) })
        ),
      };
    })()
  `);

  await fs.mkdir(request.runDirectory, { recursive: true });
  await fs.writeFile(
    path.join(request.runDirectory, `${request.phase}.json`),
    `${JSON.stringify({ electron: process.versions.electron, result }, null, 2)}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
}
