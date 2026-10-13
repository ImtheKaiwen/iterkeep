import { z } from 'zod';
import {
  BaseRequestSchema,
  MutationMetaSchema,
  resultSchema,
} from '../shared/result.js';
import {
  PositiveRevisionSchema,
  UtcMsSchema,
  WorkspaceIdSchema,
} from '../shared/value-schemas.js';

export const LocaleSchema = z.enum(['tr-TR', 'en-US']);
export const ThemeSchema = z.enum(['system', 'light', 'dark']);
export const SetupChoiceSchema = z.enum(['unselected', 'enabled', 'skipped']);

export const WorkspaceSummarySchema = z.strictObject({
  id: WorkspaceIdSchema,
  displayName: z.string().min(1).max(120),
  inboxProjectId: z.string().uuid(),
  locale: LocaleSchema,
  theme: ThemeSchema,
});
export const SetupSnapshotSchema = z.strictObject({
  workspaceId: WorkspaceIdSchema,
  coreSetupCompleted: z.boolean(),
  lastCompletedStep: z.string().max(64).nullable(),
  aiSetupChoice: SetupChoiceSchema,
  voiceSetupChoice: SetupChoiceSchema,
  updatedAt: UtcMsSchema,
  revision: PositiveRevisionSchema,
});
export const BootstrapSnapshotSchema = z.strictObject({
  workspaceReady: z.boolean(),
  workspace: WorkspaceSummarySchema.nullable(),
  setup: SetupSnapshotSchema.nullable(),
});

export const SystemBootstrapRequestSchema = BaseRequestSchema.extend({
  payload: z.strictObject({}),
});
export const WorkspaceCreateRequestSchema = MutationMetaSchema.extend({
  payload: z.strictObject({
    displayName: z.string().trim().min(1).max(120),
    locale: LocaleSchema,
    theme: ThemeSchema,
  }),
});
export const SetupGetRequestSchema = BaseRequestSchema.extend({
  payload: z.strictObject({}),
});
export const SetupSaveStepRequestSchema = MutationMetaSchema.extend({
  payload: z.strictObject({
    step: z.enum(['system_check', 'ai', 'voice']),
    expectedRevision: PositiveRevisionSchema,
    aiSetupChoice: z.enum(['enabled', 'skipped']).optional(),
    voiceSetupChoice: z.enum(['enabled', 'skipped']).optional(),
  }),
});
export const SetupCompleteRequestSchema = MutationMetaSchema.extend({
  payload: z.strictObject({ expectedRevision: PositiveRevisionSchema }),
});

export const SystemBootstrapResultSchema = resultSchema(
  BootstrapSnapshotSchema,
);
export const WorkspaceCreateResultSchema = resultSchema(
  z.strictObject({
    workspace: WorkspaceSummarySchema,
    setup: SetupSnapshotSchema,
  }),
);
export const SetupSnapshotResultSchema = resultSchema(SetupSnapshotSchema);

export const SETUP_ROUTES = {
  systemBootstrap: {
    channel: 'iterkeep:v1:system.bootstrap',
    request: SystemBootstrapRequestSchema,
    response: SystemBootstrapResultSchema,
    limitBytes: 128 * 1024,
    rateLimit: 30,
  },
  workspaceCreate: {
    channel: 'iterkeep:v1:workspace.create',
    request: WorkspaceCreateRequestSchema,
    response: WorkspaceCreateResultSchema,
    limitBytes: 128 * 1024,
    rateLimit: 5,
  },
  setupGet: {
    channel: 'iterkeep:v1:setup.get',
    request: SetupGetRequestSchema,
    response: SetupSnapshotResultSchema,
    limitBytes: 128 * 1024,
    rateLimit: 30,
  },
  setupSaveStep: {
    channel: 'iterkeep:v1:setup.saveStep',
    request: SetupSaveStepRequestSchema,
    response: SetupSnapshotResultSchema,
    limitBytes: 128 * 1024,
    rateLimit: 20,
  },
  setupComplete: {
    channel: 'iterkeep:v1:setup.complete',
    request: SetupCompleteRequestSchema,
    response: SetupSnapshotResultSchema,
    limitBytes: 128 * 1024,
    rateLimit: 5,
  },
} as const;
