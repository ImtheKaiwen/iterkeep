import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { messages, type MessageKey } from './locales';

const stepKeys: MessageKey[] = [
  'steps.welcome',
  'steps.workspace',
  'steps.system',
  'steps.ai',
  'steps.voice',
  'steps.finish',
];

function stepAfter(lastCompleted: string | null): number {
  return (
    { workspace: 2, system_check: 3, ai: 4, voice: 5 }[lastCompleted ?? ''] ?? 2
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Iterkeep">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>iterkeep</span>
    </div>
  );
}

export function App() {
  const browserLocale: Locale = navigator.language
    .toLowerCase()
    .startsWith('tr')
    ? 'tr-TR'
    : 'en-US';
  const [locale, setLocale] = useState<Locale>(browserLocale);
  const [theme, setTheme] = useState<Theme>('system');
  const [status, setStatus] = useState<
    'loading' | 'wizard' | 'dashboard' | 'error'
  >('loading');
  const [step, setStep] = useState(0);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useMemo(() => (key: MessageKey) => messages[locale][key], [locale]);

  const bootstrap = async () => {
    setStatus('loading');
    try {
      const state = await window.iterkeep.system.bootstrap();
      if (!state.workspaceReady || !state.workspace || !state.setup) {
        setStatus('wizard');
        setStep(0);
        return;
      }
      setWorkspace(state.workspace);
      setSetup(state.setup);
      setLocale(state.workspace.locale);
      setTheme(state.workspace.theme);
      setWorkspaceName(state.workspace.displayName);
      if (state.setup.coreSetupCompleted) setStatus('dashboard');
      else {
        setStatus('wizard');
        setStep(stepAfter(state.setup.lastCompletedStep));
      }
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void bootstrap();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
  }, [locale, theme]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  };

  const createWorkspace = () => {
    if (!workspaceName.trim()) {
      setNameError(true);
      return;
    }
    void run(async () => {
      const result = await window.iterkeep.workspace.create({
        displayName: workspaceName,
        locale,
        theme,
      });
      setWorkspace(result.workspace);
      setSetup(result.setup);
      setStep(2);
    });
  };

  const saveStep = (
    nextStep: number,
    input: Parameters<Window['iterkeep']['setup']['saveStep']>[0],
  ) => {
    if (!setup) return;
    void run(async () => {
      const updated = await window.iterkeep.setup.saveStep(input);
      setSetup(updated);
      setStep(nextStep);
    });
  };

  const finish = () => {
    if (!setup) return;
    void run(async () => {
      const updated = await window.iterkeep.setup.complete({
        expectedRevision: setup.revision,
      });
      setSetup(updated);
      setStatus('dashboard');
    });
  };

  if (status === 'loading')
    return (
      <main className="center-state">
        <Brand />
        <div className="loader" />
        <p>{t('common.loading')}</p>
      </main>
    );
  if (status === 'error')
    return (
      <main className="center-state error-state">
        <Brand />
        <span className="error-glyph" aria-hidden="true">
          !
        </span>
        <h1>{t('error.title')}</h1>
        <p>{t('error.body')}</p>
        <button className="button primary" onClick={() => void bootstrap()}>
          {t('common.retry')}
        </button>
      </main>
    );
  if (status === 'dashboard') return <Dashboard workspace={workspace} t={t} />;

  return (
    <main className="setup-shell">
      <aside className="setup-rail">
        <Brand />
        <nav aria-label="Setup progress">
          {stepKeys.map((key, index) => (
            <div
              className={`step-item ${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`}
              key={key}
            >
              <span>{index < step ? '✓' : index + 1}</span>
              <p>{t(key)}</p>
            </div>
          ))}
        </nav>
        <p className="rail-note">{t('brand.tagline')}</p>
      </aside>
      <section className="setup-stage">
        <header className="preferences">
          <label>
            {t('language.label')}
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="tr-TR">Türkçe</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <label>
            {t('theme.label')}
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              <option value="system">{t('theme.system')}</option>
              <option value="light">{t('theme.light')}</option>
              <option value="dark">{t('theme.dark')}</option>
            </select>
          </label>
        </header>
        <div className="setup-card" aria-live="polite">
          {step === 0 && (
            <Intro
              eyebrow={t('welcome.eyebrow')}
              title={t('welcome.title')}
              body={t('welcome.body')}
            >
              <div className="privacy-pill">
                <span>●</span>
                {t('welcome.privacy')}
              </div>
              <button className="button primary" onClick={() => setStep(1)}>
                {t('welcome.cta')}
                <span>→</span>
              </button>
            </Intro>
          )}
          {step === 1 && (
            <Intro
              eyebrow={t('workspace.eyebrow')}
              title={t('workspace.title')}
              body={t('workspace.body')}
            >
              <label className="field">
                <span>{t('workspace.name')}</span>
                <input
                  autoFocus
                  maxLength={120}
                  value={workspaceName}
                  placeholder={t('workspace.placeholder')}
                  onChange={(event) => {
                    setWorkspaceName(event.target.value);
                    setNameError(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') createWorkspace();
                  }}
                />
                {nameError && (
                  <small role="alert">{t('workspace.required')}</small>
                )}
              </label>
              <Actions back={() => setStep(0)} backText={t('common.back')}>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={createWorkspace}
                >
                  {t('workspace.create')}
                  <span>→</span>
                </button>
              </Actions>
            </Intro>
          )}
          {step === 2 && (
            <Intro
              eyebrow={t('system.eyebrow')}
              title={t('system.title')}
              body={t('system.body')}
            >
              <div className="check-list">
                <Check
                  title={t('system.database')}
                  hint={t('system.databaseHint')}
                  ready={t('status.ready')}
                />
                <Check
                  title={t('system.security')}
                  hint={t('system.securityHint')}
                  ready={t('status.ready')}
                />
                <Check
                  title={t('system.optional')}
                  hint={t('system.optionalHint')}
                  ready={t('status.ready')}
                />
              </div>
              <Actions backText={t('common.back')}>
                <button
                  className="button primary"
                  disabled={busy || !setup}
                  onClick={() =>
                    setup &&
                    saveStep(3, {
                      step: 'system_check',
                      expectedRevision: setup.revision,
                    })
                  }
                >
                  {t('common.continue')}
                  <span>→</span>
                </button>
              </Actions>
            </Intro>
          )}
          {step === 3 && (
            <ChoiceStep
              eyebrow={t('ai.eyebrow')}
              title={t('ai.title')}
              body={t('ai.body')}
              enable={t('ai.enable')}
              enableHint={t('ai.enableHint')}
              skip={t('ai.skip')}
              skipHint={t('ai.skipHint')}
              disabled={busy}
              onChoice={(choice) =>
                setup &&
                saveStep(4, {
                  step: 'ai',
                  aiSetupChoice: choice,
                  expectedRevision: setup.revision,
                })
              }
            />
          )}
          {step === 4 && (
            <ChoiceStep
              eyebrow={t('voice.eyebrow')}
              title={t('voice.title')}
              body={t('voice.body')}
              enable={t('voice.enable')}
              enableHint={t('voice.enableHint')}
              skip={t('voice.skip')}
              skipHint={t('voice.skipHint')}
              disabled={busy}
              onChoice={(choice) =>
                setup &&
                saveStep(5, {
                  step: 'voice',
                  voiceSetupChoice: choice,
                  expectedRevision: setup.revision,
                })
              }
            />
          )}
          {step === 5 && (
            <Intro
              eyebrow={t('finish.eyebrow')}
              title={t('finish.title')}
              body={t('finish.body')}
            >
              <div className="finish-orbit" aria-hidden="true">
                <span>✓</span>
              </div>
              <button
                className="button primary"
                disabled={busy || !setup}
                onClick={finish}
              >
                {t('finish.cta')}
                <span>→</span>
              </button>
            </Intro>
          )}
        </div>
      </section>
    </main>
  );
}

function Dashboard({
  workspace,
  t,
}: {
  workspace: WorkspaceState | null;
  t: (key: MessageKey) => string;
}) {
  return (
    <main className="dashboard-shell">
      <header>
        <Brand />
        <div className="avatar" aria-hidden="true">
          {workspace?.displayName.slice(0, 1).toUpperCase()}
        </div>
      </header>
      <section className="dashboard-content">
        <p className="eyebrow">
          {t('dashboard.greeting')}, {workspace?.displayName}
        </p>
        <h1>{t('dashboard.title')}</h1>
        <button className="capture-card">
          <span className="capture-plus" aria-hidden="true">
            +
          </span>
          <span>
            <strong>{t('dashboard.quickCapture')}</strong>
            <small>{t('dashboard.quickHint')}</small>
          </span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="dashboard-grid">
          <article>
            <span className="tile-icon">01</span>
            <h2>{t('dashboard.inbox')}</h2>
            <p>{t('dashboard.inboxHint')}</p>
          </article>
          <article>
            <span className="tile-icon">✓</span>
            <h2>{t('dashboard.local')}</h2>
            <p>{t('dashboard.localHint')}</p>
          </article>
        </div>
      </section>
    </main>
  );
}

function Intro({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="panel">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lede">{body}</p>
      {children}
    </div>
  );
}

function Actions({
  back,
  backText,
  children,
}: {
  back?: () => void;
  backText: string;
  children: ReactNode;
}) {
  return (
    <div className="actions">
      {back && (
        <button className="button ghost" onClick={back}>
          ← {backText}
        </button>
      )}
      {children}
    </div>
  );
}

function Check({
  title,
  hint,
  ready,
}: {
  title: string;
  hint: string;
  ready: string;
}) {
  return (
    <div className="check">
      <span className="check-icon">✓</span>
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      <em>{ready}</em>
    </div>
  );
}

function ChoiceStep(props: {
  eyebrow: string;
  title: string;
  body: string;
  enable: string;
  enableHint: string;
  skip: string;
  skipHint: string;
  disabled: boolean;
  onChoice: (choice: 'enabled' | 'skipped') => void;
}) {
  return (
    <Intro eyebrow={props.eyebrow} title={props.title} body={props.body}>
      <div className="choice-grid">
        <button
          disabled={props.disabled}
          onClick={() => props.onChoice('enabled')}
        >
          <span className="choice-icon">✦</span>
          <strong>{props.enable}</strong>
          <small>{props.enableHint}</small>
          <i>→</i>
        </button>
        <button
          disabled={props.disabled}
          onClick={() => props.onChoice('skipped')}
        >
          <span className="choice-icon muted">○</span>
          <strong>{props.skip}</strong>
          <small>{props.skipHint}</small>
          <i>→</i>
        </button>
      </div>
    </Intro>
  );
}
