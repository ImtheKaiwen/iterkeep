type Locale = 'tr-TR' | 'en-US';
type Theme = 'system' | 'light' | 'dark';
type SetupChoice = 'unselected' | 'enabled' | 'skipped';

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
  };
}
