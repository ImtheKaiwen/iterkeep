import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('iterkeep', {
  system: {
    bootstrap: () => ipcRenderer.invoke('iterkeep:system.bootstrap'),
  },
  workspace: {
    create: (input: unknown) =>
      ipcRenderer.invoke('iterkeep:workspace.create', input),
  },
  setup: {
    get: () => ipcRenderer.invoke('iterkeep:setup.get'),
    saveStep: (input: unknown) =>
      ipcRenderer.invoke('iterkeep:setup.saveStep', input),
    complete: (input: unknown) =>
      ipcRenderer.invoke('iterkeep:setup.complete', input),
  },
});
