import {
  completeSetup,
  readSetupState,
  saveSetupStep,
  StorageError,
} from '@iterkeep/storage-sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestWorkspace, type TestWorkspace } from './storage-fixture.js';

let workspace: TestWorkspace;
beforeEach(async () => {
  workspace = await createTestWorkspace();
});
afterEach(async () => workspace.close());

describe('setup state repository', () => {
  it('persists wizard progress and optional feature choices', () => {
    expect(readSetupState(workspace.db)).toMatchObject({
      coreSetupCompleted: false,
      lastCompletedStep: null,
      aiSetupChoice: 'unselected',
      voiceSetupChoice: 'unselected',
      revision: 1,
    });

    const system = saveSetupStep(workspace.db, {
      step: 'system_check',
      expectedRevision: 1,
      now: '2026-10-10T14:16:00.000Z',
    });
    const ai = saveSetupStep(workspace.db, {
      step: 'ai',
      aiSetupChoice: 'skipped',
      expectedRevision: system.revision,
      now: '2026-10-10T14:17:00.000Z',
    });
    const voice = saveSetupStep(workspace.db, {
      step: 'voice',
      voiceSetupChoice: 'enabled',
      expectedRevision: ai.revision,
      now: '2026-10-10T14:18:00.000Z',
    });
    const completed = completeSetup(workspace.db, {
      expectedRevision: voice.revision,
      now: '2026-10-10T14:19:00.000Z',
    });

    expect(completed).toMatchObject({
      coreSetupCompleted: true,
      lastCompletedStep: 'finish',
      aiSetupChoice: 'skipped',
      voiceSetupChoice: 'enabled',
      revision: 5,
    });
  });

  it('rejects a stale wizard revision without changing progress', () => {
    saveSetupStep(workspace.db, {
      step: 'system_check',
      expectedRevision: 1,
      now: '2026-10-10T14:16:00.000Z',
    });

    expect(() =>
      saveSetupStep(workspace.db, {
        step: 'ai',
        aiSetupChoice: 'enabled',
        expectedRevision: 1,
        now: '2026-10-10T14:17:00.000Z',
      }),
    ).toThrowError(new StorageError('CONFLICT_REVISION'));
    expect(readSetupState(workspace.db)).toMatchObject({
      lastCompletedStep: 'system_check',
      aiSetupChoice: 'unselected',
      revision: 2,
    });
  });
});
