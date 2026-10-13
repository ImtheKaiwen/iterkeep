type Locale = 'tr-TR' | 'en-US';
type Theme = 'system' | 'light' | 'dark';
type SetupChoice = 'unselected' | 'enabled' | 'skipped';
type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';
type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

interface RevisionReceipt {
  readonly id: string;
  readonly revision: number;
  readonly changed: boolean;
}

interface ProjectState {
  readonly id: string;
  readonly workspaceId: string;
  readonly kind: 'user' | 'inbox';
  readonly name: string;
  readonly description: string;
  readonly status: ProjectStatus;
  readonly priority: Priority;
  readonly tagIds: readonly string[];
  readonly revision: number;
  readonly deletedAt: string | null;
}

interface TaskState {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly bodyMarkdown: string;
  readonly status: TaskStatus;
  readonly priority: Priority;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly sortOrder: number;
  readonly blockedReason: string | null;
  readonly tagIds: readonly string[];
  readonly revision: number;
  readonly deletedAt: string | null;
}

interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

interface ProjectSummary {
  readonly id: string;
  readonly kind: 'user' | 'inbox';
  readonly name: string;
  readonly status: ProjectStatus;
  readonly priority: Priority;
  readonly lastActivityAt: string | null;
  readonly openTaskCount: number;
  readonly revision: number;
}

type TaskSummary = Pick<
  TaskState,
  | 'id'
  | 'projectId'
  | 'title'
  | 'status'
  | 'priority'
  | 'dueDate'
  | 'sortOrder'
  | 'revision'
>;

interface ProjectResumeState {
  readonly project: Pick<ProjectState, 'id' | 'name' | 'status' | 'revision'>;
  readonly openTasks: readonly TaskSummary[];
  readonly latestLogs: readonly {
    id: string;
    textMarkdown: string;
    occurredAt: string;
  }[];
  readonly recentDecisions: readonly {
    id: string;
    displayCode: string;
    title: string;
    status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
    updatedAt: string;
  }[];
  readonly computedAt: string;
}

interface WorkspaceState {
  readonly id: string;
  readonly displayName: string;
  readonly inboxProjectId: string;
  readonly locale: Locale;
  readonly theme: Theme;
}

interface SetupState {
  readonly workspaceId: string;
  readonly coreSetupCompleted: boolean;
  readonly lastCompletedStep: string | null;
  readonly aiSetupChoice: SetupChoice;
  readonly voiceSetupChoice: SetupChoice;
  readonly revision: number;
}

interface BootstrapState {
  readonly workspaceReady: boolean;
  readonly workspace: WorkspaceState | null;
  readonly setup: SetupState | null;
}

interface Window {
  readonly iterkeep: {
    readonly system: {
      bootstrap(): Promise<BootstrapState>;
      health(): Promise<unknown>;
      getDiagnostics(): Promise<unknown>;
      openExternalUrl(input: unknown): Promise<unknown>;
    };
    readonly workspace: {
      create(input: {
        displayName: string;
        locale: Locale;
        theme: Theme;
      }): Promise<{ workspace: WorkspaceState; setup: SetupState }>;
      get(): Promise<unknown>;
      listRecent(): Promise<unknown>;
      chooseFolder(input: unknown): Promise<unknown>;
      open(input: unknown): Promise<unknown>;
      updatePreferences(input: unknown): Promise<unknown>;
      getPreferences(): Promise<unknown>;
    };
    readonly operations: {
      getReceipt(input: unknown): Promise<unknown>;
    };
    readonly setup: {
      get(): Promise<SetupState>;
      saveStep(input: {
        step: 'system_check' | 'ai' | 'voice';
        expectedRevision: number;
        aiSetupChoice?: 'enabled' | 'skipped';
        voiceSetupChoice?: 'enabled' | 'skipped';
      }): Promise<SetupState>;
      complete(input: { expectedRevision: number }): Promise<SetupState>;
    };
    readonly projects: {
      list(input: {
        cursor?: string;
        limit?: number;
        status?: readonly ProjectStatus[];
        search?: string;
        tagIds?: readonly string[];
        sortBy?: 'recent' | 'name' | 'status';
        direction?: 'asc' | 'desc';
      }): Promise<Page<ProjectSummary>>;
      get(projectId: string): Promise<ProjectState>;
      getResume(projectId: string): Promise<ProjectResumeState>;
      create(input: {
        name: string;
        description?: string;
        priority?: Priority;
        tagIds?: readonly string[];
      }): Promise<RevisionReceipt>;
      update(input: {
        projectId: string;
        expectedRevision: number;
        patch: {
          name?: string;
          description?: string;
          priority?: Priority;
          tagIds?: readonly string[];
        };
      }): Promise<RevisionReceipt>;
      changeStatus(input: {
        projectId: string;
        status: ProjectStatus;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      trash(input: {
        projectId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      restore(input: {
        projectId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
    };
    readonly tasks: {
      list(input: {
        projectId?: string;
        status?: readonly TaskStatus[];
        priority?: readonly Priority[];
        tagIds?: readonly string[];
        due?: 'overdue' | 'today' | 'upcoming' | 'no_date';
        sortBy?: 'manual' | 'due_date' | 'priority' | 'updated_at';
        direction?: 'asc' | 'desc';
        cursor?: string;
        limit?: number;
      }): Promise<Page<TaskSummary>>;
      get(taskId: string): Promise<TaskState>;
      create(input: {
        projectId?: string;
        title: string;
        bodyMarkdown?: string;
        priority?: Priority;
        dueDate?: string | null;
        tagIds?: readonly string[];
      }): Promise<RevisionReceipt>;
      update(input: {
        taskId: string;
        expectedRevision: number;
        patch: {
          title?: string;
          bodyMarkdown?: string;
          priority?: Priority;
          dueDate?: string | null;
          blockedReason?: string | null;
          tagIds?: readonly string[];
        };
      }): Promise<RevisionReceipt>;
      changeStatus(input: {
        taskId: string;
        status: TaskStatus;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      move(input: {
        taskId: string;
        projectId: string;
        status?: TaskStatus;
        sortOrder?: number;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      reorder(input: {
        projectId: string;
        status: TaskStatus;
        orderedTaskIds: readonly string[];
        expectedRevisions: Readonly<Record<string, number>>;
      }): Promise<{ updatedIds: readonly string[] }>;
      trash(input: {
        taskId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      restore(input: {
        taskId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
    };
    readonly documents: {
      list(input: unknown): Promise<unknown>;
      get(input: unknown): Promise<unknown>;
      create(input: unknown): Promise<unknown>;
      save(input: unknown): Promise<unknown>;
      versions(input: unknown): Promise<unknown>;
      trash(input: unknown): Promise<unknown>;
      restore(input: unknown): Promise<unknown>;
    };
    readonly decisions: {
      list(input: unknown): Promise<unknown>;
      get(input: unknown): Promise<unknown>;
      create(input: unknown): Promise<unknown>;
      revise(input: unknown): Promise<unknown>;
      supersede(input: unknown): Promise<unknown>;
    };
    readonly activity: {
      list(input: unknown): Promise<unknown>;
      get(input: unknown): Promise<unknown>;
      append(input: unknown): Promise<unknown>;
    };
    readonly records: {
      link(input: unknown): Promise<unknown>;
      unlink(input: unknown): Promise<unknown>;
    };
    readonly attachments: {
      list(input: unknown): Promise<unknown>;
      import(input: unknown): Promise<unknown>;
      reveal(input: unknown): Promise<unknown>;
      trash(input: unknown): Promise<unknown>;
    };
    readonly search: { query(input: unknown): Promise<unknown> };
    readonly files: {
      chooseImport(input: unknown): Promise<unknown>;
      chooseExportTarget(input: unknown): Promise<unknown>;
    };
    readonly transfer: {
      previewImport(input: unknown): Promise<unknown>;
      commitImport(input: unknown): Promise<unknown>;
      exportMarkdown(input: unknown): Promise<unknown>;
      getImportPreview(input: unknown): Promise<unknown>;
    };
    readonly git: {
      listProfiles(): Promise<unknown>;
      getStatus(input: unknown): Promise<unknown>;
      commitExport(input: unknown): Promise<unknown>;
      pushExport(input: unknown): Promise<unknown>;
    };
    readonly backups: {
      create(input: unknown): Promise<unknown>;
      list(input: unknown): Promise<unknown>;
      previewRestore(input: unknown): Promise<unknown>;
      commitRestore(input: unknown): Promise<unknown>;
    };
    readonly jobs: {
      get(input: unknown): Promise<unknown>;
      list(input: unknown): Promise<unknown>;
      cancel(input: unknown): Promise<unknown>;
    };
    readonly capabilities: {
      get(input: unknown): Promise<unknown>;
      setPreference(input: unknown): Promise<unknown>;
    };
    readonly models: {
      detectOllama(): Promise<unknown>;
      listInstalled(): Promise<unknown>;
      listRecommended(input: unknown): Promise<unknown>;
      setActive(input: unknown): Promise<unknown>;
      startDownload(input: unknown): Promise<unknown>;
      cancelDownload(input: unknown): Promise<unknown>;
      runBenchmark(input: unknown): Promise<unknown>;
    };
    readonly conversations: {
      list(input: unknown): Promise<unknown>;
      get(input: unknown): Promise<unknown>;
      create(input: unknown): Promise<unknown>;
    };
    readonly agent: {
      startRun(input: unknown): Promise<unknown>;
      getRun(input: unknown): Promise<unknown>;
      cancelRun(input: unknown): Promise<unknown>;
      getToolCalls(input: unknown): Promise<unknown>;
      getApprovals(input: unknown): Promise<unknown>;
      decideApproval(input: unknown): Promise<unknown>;
    };
    readonly voice: {
      getStatus(): Promise<unknown>;
      listComponents(input: unknown): Promise<unknown>;
      startComponentInstall(input: unknown): Promise<unknown>;
      startCapture(input: unknown): Promise<unknown>;
      appendChunk(input: unknown): Promise<unknown>;
      stopCapture(input: unknown): Promise<unknown>;
      cancelCapture(input: unknown): Promise<unknown>;
      getTranscript(input: unknown): Promise<unknown>;
      speak(input: unknown): Promise<unknown>;
    };
    readonly events: {
      subscribe(input: unknown): Promise<unknown>;
      unsubscribe(input: unknown): Promise<unknown>;
      getSince(input: unknown): Promise<unknown>;
      onEvent(listener: (payload: unknown) => void): () => void;
    };
  };
}
