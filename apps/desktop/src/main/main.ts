import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import {
  getNativeSmokeRunId,
  runPackagedNativeSmoke,
} from './native-smoke-mode.js';
import { registerSetupIpc } from './setup-ipc.js';

let mainWindow: BrowserWindow | null = null;
let disposeSetupIpc: (() => Promise<void>) | undefined;

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    height: 800,
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: 'Iterkeep',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    },
    width: 1280,
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return window;
}

void app.whenReady().then(async () => {
  const smokeRunId = getNativeSmokeRunId(process.argv);
  if (smokeRunId) {
    try {
      await runPackagedNativeSmoke(
        smokeRunId,
        process.resourcesPath,
        path.join(__dirname, 'db.worker.cjs'),
      );
      app.exit(0);
    } catch (error) {
      console.error(error);
      app.exit(1);
    }
    return;
  }
  mainWindow = createMainWindow();
  disposeSetupIpc = registerSetupIpc(() => mainWindow);
  mainWindow.once('closed', () => {
    mainWindow = null;
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      mainWindow.once('closed', () => {
        mainWindow = null;
      });
    }
  });
});

app.on('before-quit', () => {
  if (disposeSetupIpc) void disposeSetupIpc();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
