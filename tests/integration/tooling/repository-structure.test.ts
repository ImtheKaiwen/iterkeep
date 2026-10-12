import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const expectedPackages = [
  'apps/desktop',
  'packages/agent-runtime',
  'packages/application',
  'packages/contracts',
  'packages/domain',
  'packages/git-adapter',
  'packages/import-export',
  'packages/job-system',
  'packages/provider-ollama',
  'packages/search',
  'packages/storage-sqlite',
  'packages/testing',
  'packages/ui',
  'packages/voice-client',
];

describe('IP-01 repository structure', () => {
  it('contains exactly the fourteen contracted workspace manifests', async () => {
    const names = await Promise.all(
      expectedPackages.map(async (relative) => {
        const manifest = JSON.parse(
          await fs.readFile(path.join(root, relative, 'package.json'), 'utf8'),
        );
        return manifest.name;
      }),
    );

    expect(new Set(names).size).toBe(14);
    expect(names).toContain('@iterkeep/desktop');
    expect(names).toContain('@iterkeep/domain');
  });

  it('pins the Node 24 runtime contract', async () => {
    const manifest = JSON.parse(
      await fs.readFile(path.join(root, 'package.json'), 'utf8'),
    );
    const nvmrc = await fs.readFile(path.join(root, '.nvmrc'), 'utf8');

    expect(manifest.engines.node).toBe('>=24 <25');
    expect(nvmrc.trim()).toBe('24');
  });
});
