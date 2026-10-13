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
    expect(main).toContain('webSecurity: true');
    expect(main).toContain('webviewTag: false');
    expect(main).toContain('setPermissionRequestHandler');
  });

  it('exposes only named setup methods through the preload bridge', async () => {
    const preload = await fs.readFile(
      path.join(process.cwd(), 'apps/desktop/src/preload/preload.ts'),
      'utf8',
    );

    expect(preload).toContain("contextBridge.exposeInMainWorld('iterkeep'");
    expect(preload).not.toMatch(/exposeInMainWorld\([^]*invoke:\s*/u);
    expect(preload).not.toContain('channel: string');
    expect(preload).not.toContain('ipcRenderer.send');
    expect(preload).toContain('SETUP_ROUTES');
  });

  it('uses a restrictive renderer content security policy', async () => {
    const html = await fs.readFile(
      path.join(process.cwd(), 'apps/desktop/index.html'),
      'utf8',
    );
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).not.toContain('unsafe-eval');
    expect(html).not.toContain('unsafe-inline');
  });
});
