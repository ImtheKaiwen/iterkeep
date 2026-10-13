import { ipcMain, type BrowserWindow } from 'electron';
import { FUTURE_ROUTES } from '@iterkeep/contracts';
import { IpcRateLimiter } from './ipc/ipc-guards.js';
import { registerValidatedIpc } from './ipc/ipc-gateway.js';

export function registerFutureIpc(
  getWindow: () => BrowserWindow | null,
): () => void {
  const limiter = new IpcRateLimiter();
  for (const route of Object.values(FUTURE_ROUTES)) {
    registerValidatedIpc(route, getWindow, limiter, async () => {
      throw new Error('capability.disabled');
    });
  }
  return () => {
    for (const route of Object.values(FUTURE_ROUTES)) {
      ipcMain.removeHandler(route.channel);
    }
  };
}
