import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const executable = path.join(
  root,
  'apps',
  'desktop',
  'out',
  'Iterkeep-win32-x64',
  'Iterkeep.exe',
);
const runId = randomUUID();
const runDirectory = path.join(os.tmpdir(), 'iterkeep-ipc-smoke', runId);
const electronEnvironment = { ...process.env };
delete electronEnvironment.ELECTRON_RUN_AS_NODE;

await fs.access(executable);
for (const phase of ['create', 'restart']) {
  const execution = spawnSync(
    executable,
    [`iterkeep-ipc-smoke:${runId}:${phase}`],
    {
      encoding: 'utf8',
      env: electronEnvironment,
      timeout: 120_000,
      windowsHide: true,
    },
  );
  if (execution.error) throw execution.error;
  if (execution.status !== 0) {
    throw new Error(
      `Packaged IPC ${phase} smoke exited ${String(execution.status)}: ${execution.stderr}`,
    );
  }
}

const create = JSON.parse(
  await fs.readFile(path.join(runDirectory, 'create.json'), 'utf8'),
);
const restart = JSON.parse(
  await fs.readFile(path.join(runDirectory, 'restart.json'), 'utf8'),
);

const assertions = [
  [
    create.result.before.workspaceReady === false,
    'fresh run must require setup',
  ],
  [
    create.result.after.workspaceReady === true,
    'workspace create must persist',
  ],
  [
    restart.result.before.workspaceReady === true,
    'restart must load workspace',
  ],
  [
    restart.result.before.workspace.displayName === 'IPC Smoke Workspace',
    'restart must preserve workspace data',
  ],
  [
    create.result.namedFunctionCount === 102,
    '101 routes plus event listener must be named',
  ],
  [
    create.result.genericInvokeType === 'undefined',
    'generic invoke must not be exposed',
  ],
  [
    create.result.disabledCapabilityError === 'error.capability_disabled',
    'future route must fail safely',
  ],
  [
    create.result.oversizedPayloadError === 'error.payload_too_large',
    'oversized payload must be rejected',
  ],
];
for (const [passed, message] of assertions) {
  if (!passed) throw new Error(`Packaged IPC smoke failed: ${message}`);
}

const evidence = {
  executable,
  create,
  restart,
  status: 'PASS',
};
const evidenceDirectory = path.join(root, '.artifacts', 'ip-06');
await fs.mkdir(evidenceDirectory, { recursive: true });
await fs.writeFile(
  path.join(evidenceDirectory, 'packaged-ipc-smoke.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);
process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
await fs.rm(runDirectory, { recursive: true, force: true });
