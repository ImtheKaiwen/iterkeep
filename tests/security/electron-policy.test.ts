import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Electron baseline policy', () => {
  it('keeps the renderer sandboxed and isolated from Node', async () => {
    const main = await fs.readFile(
      path.join(process.cwd(), 'apps/desktop/src/main/main.ts'),
      'utf8',
    );

    expect(main).toContain('contextIsolation: true');
    expect(main).toContain('nodeIntegration: false');
    expect(main).toContain('sandbox: true');
  });

  it('exposes only named setup methods through the preload bridge', async () => {
    const preload = await fs.readFile(
      path.join(process.cwd(), 'apps/desktop/src/preload/preload.ts'),
      'utf8',
    );

    expect(preload).toContain("contextBridge.exposeInMainWorld('iterkeep'");
    expect(preload).not.toMatch(/invoke\([^'"]/u);
    expect(preload).not.toContain('ipcRenderer.send');
  });
});
