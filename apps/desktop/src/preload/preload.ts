import { contextBridge, ipcRenderer } from 'electron';
import { randomUUID } from 'node:crypto';
import {
  FUTURE_ROUTES,
  PROJECT_ROUTES,
  SETUP_ROUTES,
  TASK_ROUTES,
} from '@iterkeep/contracts';

interface Route {
  readonly channel: `iterkeep:v1:${string}`;
  readonly response: { parse(value: unknown): unknown };
}

async function invoke(route: Route, payload: unknown, mutation = false) {
  const requestId = randomUUID();
  const result = await ipcRenderer.invoke(route.channel, {
    protocolVersion: 1,
    requestId,
    ...(mutation ? { idempotencyKey: randomUUID() } : {}),
    payload,
  });
  const parsed = route.response.parse(result) as
    | { ok: true; data: unknown }
    | { ok: false; error: { messageKey: string } };
  if (!parsed.ok) throw new Error(parsed.error.messageKey);
  return parsed.data;
}

contextBridge.exposeInMainWorld('iterkeep', {
  system: {
    bootstrap: () => invoke(SETUP_ROUTES.systemBootstrap, {}),
    health: () => invoke(FUTURE_ROUTES.systemHealth, {}),
    getDiagnostics: () =>
      invoke(FUTURE_ROUTES.systemDiagnostics, { level: 'safe' }),
    openExternalUrl: (input: unknown) =>
      invoke(FUTURE_ROUTES.systemOpenExternalUrl, input, true),
  },
  workspace: {
    create: (input: unknown) =>
      invoke(SETUP_ROUTES.workspaceCreate, input, true),
    get: () => invoke(FUTURE_ROUTES.workspaceGet, {}),
    listRecent: () => invoke(FUTURE_ROUTES.workspaceListRecent, {}),
    chooseFolder: (input: unknown) =>
      invoke(FUTURE_ROUTES.workspaceChooseFolder, input),
    open: (input: unknown) => invoke(FUTURE_ROUTES.workspaceOpen, input, true),
    updatePreferences: (input: unknown) =>
      invoke(FUTURE_ROUTES.workspaceUpdatePreferences, input, true),
    getPreferences: () => invoke(FUTURE_ROUTES.workspaceGetPreferences, {}),
  },
  operations: {
    getReceipt: (input: unknown) =>
      invoke(FUTURE_ROUTES.operationsGetReceipt, input),
  },
  setup: {
    get: () => invoke(SETUP_ROUTES.setupGet, {}),
    saveStep: (input: unknown) =>
      invoke(SETUP_ROUTES.setupSaveStep, input, true),
    complete: (input: unknown) =>
      invoke(SETUP_ROUTES.setupComplete, input, true),
  },
  projects: {
    list: (input: unknown) => invoke(PROJECT_ROUTES.list, input),
    get: (projectId: string) => invoke(PROJECT_ROUTES.get, { projectId }),
    getResume: (projectId: string) =>
      invoke(PROJECT_ROUTES.getResume, { projectId }),
    create: (input: unknown) => invoke(PROJECT_ROUTES.create, input, true),
    update: (input: unknown) => invoke(PROJECT_ROUTES.update, input, true),
    changeStatus: (input: unknown) =>
      invoke(PROJECT_ROUTES.changeStatus, input, true),
    trash: (input: unknown) => invoke(PROJECT_ROUTES.trash, input, true),
    restore: (input: unknown) => invoke(PROJECT_ROUTES.restore, input, true),
  },
  tasks: {
    list: (input: unknown) => invoke(TASK_ROUTES.list, input),
    get: (taskId: string) => invoke(TASK_ROUTES.get, { taskId }),
    create: (input: unknown) => invoke(TASK_ROUTES.create, input, true),
    update: (input: unknown) => invoke(TASK_ROUTES.update, input, true),
    changeStatus: (input: unknown) =>
      invoke(TASK_ROUTES.changeStatus, input, true),
    move: (input: unknown) => invoke(TASK_ROUTES.move, input, true),
    reorder: (input: unknown) => invoke(TASK_ROUTES.reorder, input, true),
    trash: (input: unknown) => invoke(TASK_ROUTES.trash, input, true),
    restore: (input: unknown) => invoke(TASK_ROUTES.restore, input, true),
  },
  documents: {
    list: (input: unknown) => invoke(FUTURE_ROUTES.documentsList, input),
    get: (input: unknown) => invoke(FUTURE_ROUTES.documentsGet, input),
    create: (input: unknown) =>
      invoke(FUTURE_ROUTES.documentsCreate, input, true),
    save: (input: unknown) => invoke(FUTURE_ROUTES.documentsSave, input, true),
    versions: (input: unknown) =>
      invoke(FUTURE_ROUTES.documentsVersions, input),
    trash: (input: unknown) =>
      invoke(FUTURE_ROUTES.documentsTrash, input, true),
    restore: (input: unknown) =>
      invoke(FUTURE_ROUTES.documentsRestore, input, true),
  },
  decisions: {
    list: (input: unknown) => invoke(FUTURE_ROUTES.decisionsList, input),
    get: (input: unknown) => invoke(FUTURE_ROUTES.decisionsGet, input),
    create: (input: unknown) =>
      invoke(FUTURE_ROUTES.decisionsCreate, input, true),
    revise: (input: unknown) =>
      invoke(FUTURE_ROUTES.decisionsRevise, input, true),
    supersede: (input: unknown) =>
      invoke(FUTURE_ROUTES.decisionsSupersede, input, true),
  },
  activity: {
    list: (input: unknown) => invoke(FUTURE_ROUTES.activityList, input),
    get: (input: unknown) => invoke(FUTURE_ROUTES.activityGet, input),
    append: (input: unknown) =>
      invoke(FUTURE_ROUTES.activityAppend, input, true),
  },
  records: {
    link: (input: unknown) => invoke(FUTURE_ROUTES.recordsLink, input, true),
    unlink: (input: unknown) =>
      invoke(FUTURE_ROUTES.recordsUnlink, input, true),
  },
  attachments: {
    list: (input: unknown) => invoke(FUTURE_ROUTES.attachmentsList, input),
    import: (input: unknown) =>
      invoke(FUTURE_ROUTES.attachmentsImport, input, true),
    reveal: (input: unknown) => invoke(FUTURE_ROUTES.attachmentsReveal, input),
    trash: (input: unknown) =>
      invoke(FUTURE_ROUTES.attachmentsTrash, input, true),
  },
  search: {
    query: (input: unknown) => invoke(FUTURE_ROUTES.searchQuery, input),
  },
  files: {
    chooseImport: (input: unknown) =>
      invoke(FUTURE_ROUTES.filesChooseImport, input),
    chooseExportTarget: (input: unknown) =>
      invoke(FUTURE_ROUTES.filesChooseExportTarget, input),
  },
  transfer: {
    previewImport: (input: unknown) =>
      invoke(FUTURE_ROUTES.transferPreviewImport, input, true),
    commitImport: (input: unknown) =>
      invoke(FUTURE_ROUTES.transferCommitImport, input, true),
    exportMarkdown: (input: unknown) =>
      invoke(FUTURE_ROUTES.transferExportMarkdown, input, true),
    getImportPreview: (input: unknown) =>
      invoke(FUTURE_ROUTES.transferGetImportPreview, input),
  },
  git: {
    listProfiles: () => invoke(FUTURE_ROUTES.gitListProfiles, {}),
    getStatus: (input: unknown) => invoke(FUTURE_ROUTES.gitGetStatus, input),
    commitExport: (input: unknown) =>
      invoke(FUTURE_ROUTES.gitCommitExport, input, true),
    pushExport: (input: unknown) =>
      invoke(FUTURE_ROUTES.gitPushExport, input, true),
  },
  backups: {
    create: (input: unknown) =>
      invoke(FUTURE_ROUTES.backupsCreate, input, true),
    list: (input: unknown) => invoke(FUTURE_ROUTES.backupsList, input),
    previewRestore: (input: unknown) =>
      invoke(FUTURE_ROUTES.backupsPreviewRestore, input, true),
    commitRestore: (input: unknown) =>
      invoke(FUTURE_ROUTES.backupsCommitRestore, input, true),
  },
  jobs: {
    get: (input: unknown) => invoke(FUTURE_ROUTES.jobsGet, input),
    list: (input: unknown) => invoke(FUTURE_ROUTES.jobsList, input),
    cancel: (input: unknown) => invoke(FUTURE_ROUTES.jobsCancel, input, true),
  },
  capabilities: {
    get: (input: unknown) => invoke(FUTURE_ROUTES.capabilitiesGet, input),
    setPreference: (input: unknown) =>
      invoke(FUTURE_ROUTES.capabilitiesSetPreference, input, true),
  },
  models: {
    detectOllama: () =>
      invoke(FUTURE_ROUTES.modelsDetectOllama, { explicit: true }),
    listInstalled: () => invoke(FUTURE_ROUTES.modelsListInstalled, {}),
    listRecommended: (input: unknown) =>
      invoke(FUTURE_ROUTES.modelsListRecommended, input),
    setActive: (input: unknown) =>
      invoke(FUTURE_ROUTES.modelsSetActive, input, true),
    startDownload: (input: unknown) =>
      invoke(FUTURE_ROUTES.modelsStartDownload, input, true),
    cancelDownload: (input: unknown) =>
      invoke(FUTURE_ROUTES.modelsCancelDownload, input, true),
    runBenchmark: (input: unknown) =>
      invoke(FUTURE_ROUTES.modelsRunBenchmark, input, true),
  },
  conversations: {
    list: (input: unknown) => invoke(FUTURE_ROUTES.conversationsList, input),
    get: (input: unknown) => invoke(FUTURE_ROUTES.conversationsGet, input),
    create: (input: unknown) =>
      invoke(FUTURE_ROUTES.conversationsCreate, input, true),
  },
  agent: {
    startRun: (input: unknown) =>
      invoke(FUTURE_ROUTES.agentStartRun, input, true),
    getRun: (input: unknown) => invoke(FUTURE_ROUTES.agentGetRun, input),
    cancelRun: (input: unknown) =>
      invoke(FUTURE_ROUTES.agentCancelRun, input, true),
    getToolCalls: (input: unknown) =>
      invoke(FUTURE_ROUTES.agentGetToolCalls, input),
    getApprovals: (input: unknown) =>
      invoke(FUTURE_ROUTES.agentGetApprovals, input),
    decideApproval: (input: unknown) =>
      invoke(FUTURE_ROUTES.agentDecideApproval, input, true),
  },
  voice: {
    getStatus: () => invoke(FUTURE_ROUTES.voiceGetStatus, {}),
    listComponents: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceListComponents, input),
    startComponentInstall: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceStartComponentInstall, input, true),
    startCapture: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceStartCapture, input, true),
    appendChunk: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceAppendChunk, input),
    stopCapture: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceStopCapture, input, true),
    cancelCapture: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceCancelCapture, input, true),
    getTranscript: (input: unknown) =>
      invoke(FUTURE_ROUTES.voiceGetTranscript, input),
    speak: (input: unknown) => invoke(FUTURE_ROUTES.voiceSpeak, input, true),
  },
  events: {
    subscribe: (input: unknown) => invoke(FUTURE_ROUTES.eventsSubscribe, input),
    unsubscribe: (input: unknown) =>
      invoke(FUTURE_ROUTES.eventsUnsubscribe, input),
    getSince: (input: unknown) => invoke(FUTURE_ROUTES.eventsGetSince, input),
    onEvent: (listener: (payload: unknown) => void) => {
      const callback = (_event: Electron.IpcRendererEvent, payload: unknown) =>
        listener(payload);
      ipcRenderer.on('iterkeep:v1:event', callback);
      return () => ipcRenderer.removeListener('iterkeep:v1:event', callback);
    },
  },
});
