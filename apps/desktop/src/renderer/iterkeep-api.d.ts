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
    readonly system: { bootstrap(): Promise<BootstrapState> };
    readonly workspace: {
      create(input: {
        displayName: string;
        locale: Locale;
        theme: Theme;
      }): Promise<{ workspace: WorkspaceState; setup: SetupState }>;
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
      get(projectId: string): Promise<ProjectState>;
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
      trash(input: {
        taskId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
      restore(input: {
        taskId: string;
        expectedRevision: number;
      }): Promise<RevisionReceipt>;
    };
  };
}
