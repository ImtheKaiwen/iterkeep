import { z } from 'zod';
import {
  BaseRequestSchema,
  MutationMetaSchema,
  resultSchema,
} from '../shared/result.js';
import {
  JobIdSchema,
  PageLimitSchema,
  ProjectIdSchema,
  RecordRefSchema,
  UtcMsSchema,
  UuidV4Schema,
} from '../shared/value-schemas.js';

const empty = z.strictObject({});
const cursor = z.string().min(1).max(2048).optional();
const shortText = z.string().min(1).max(500);
const identifier = z.string().min(1).max(160);
const selectionHandle = UuidV4Schema;
const unavailableResult = resultSchema(z.never());

function query<Payload extends z.ZodType>(channel: string, payload: Payload) {
  return {
    channel: `iterkeep:v1:${channel}` as const,
    request: BaseRequestSchema.extend({ payload }),
    response: unavailableResult,
    limitBytes: 128 * 1024,
    rateLimit: 60,
  } as const;
}

function mutation<Payload extends z.ZodType>(
  channel: string,
  payload: Payload,
) {
  return {
    channel: `iterkeep:v1:${channel}` as const,
    request: MutationMetaSchema.extend({ payload }),
    response: unavailableResult,
    limitBytes: 128 * 1024,
    rateLimit: 30,
  } as const;
}

function job<Payload extends z.ZodType>(channel: string, payload: Payload) {
  return { ...mutation(channel, payload), rateLimit: 10 } as const;
}

const idPayload = (key: string) => z.strictObject({ [key]: UuidV4Schema });
const pagePayload = z.strictObject({ cursor, limit: PageLimitSchema });

export const SYSTEM_WORKSPACE_FUTURE_ROUTES = {
  systemHealth: query('system.health', empty),
  systemDiagnostics: query(
    'system.diagnostics',
    z.strictObject({ level: z.literal('safe') }),
  ),
  workspaceGet: query('workspace.get', empty),
  workspaceListRecent: query('workspace.listRecent', empty),
  workspaceChooseFolder: query(
    'workspace.chooseFolder',
    z.strictObject({ purpose: z.enum(['create', 'open']) }),
  ),
  workspaceOpen: mutation(
    'workspace.open',
    z.strictObject({ selectionHandle }),
  ),
  workspaceUpdatePreferences: mutation(
    'workspace.preferences.update',
    z.strictObject({
      patch: z
        .strictObject({
          locale: z.enum(['tr-TR', 'en-US']).optional(),
          theme: z.enum(['system', 'light', 'dark']).optional(),
          timezone: z.string().min(1).max(100).optional(),
          lastSelectedProjectId: ProjectIdSchema.nullable().optional(),
          lastView: z
            .enum(['dashboard', 'projects', 'tasks', 'search', 'chat'])
            .optional(),
        })
        .refine((value) => Object.keys(value).length > 0),
      expectedRevision: z.number().int().min(1),
    }),
  ),
  workspaceGetPreferences: query('workspace.preferences.get', empty),
  operationsGetReceipt: query(
    'operations.receipt.get',
    z.strictObject({
      idempotencyKey: UuidV4Schema,
      commandName: z.string().min(1).max(120),
    }),
  ),
  systemOpenExternalUrl: mutation(
    'system.openExternalUrl',
    z.strictObject({
      url: z.string().url().max(2048),
      verifiedUserGestureToken: identifier,
    }),
  ),
} as const;

const documentPatch = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  bodyMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  pinned: z.boolean().optional(),
  tagIds: z.array(UuidV4Schema).max(30).optional(),
});
const decisionPatch = z.strictObject({
  title: z.string().min(1).max(200).optional(),
  contextMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  decisionMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  rationaleMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  consequencesMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  alternativesMarkdown: z
    .string()
    .max(2 * 1024 * 1024)
    .optional(),
  status: z.enum(['proposed', 'accepted', 'rejected']).optional(),
});

export const CONTENT_FUTURE_ROUTES = {
  documentsList: query(
    'documents.list',
    z.strictObject({
      projectId: ProjectIdSchema,
      cursor,
      limit: PageLimitSchema,
      includeDeleted: z.boolean().optional(),
    }),
  ),
  documentsGet: query('documents.get', idPayload('documentId')),
  documentsCreate: mutation(
    'documents.create',
    z.strictObject({
      projectId: ProjectIdSchema,
      title: z.string().min(1).max(200),
      bodyMarkdown: z.string().max(2 * 1024 * 1024),
      pinned: z.boolean().optional(),
      tagIds: z.array(UuidV4Schema).max(30).optional(),
    }),
  ),
  documentsSave: mutation(
    'documents.save',
    z.strictObject({
      documentId: UuidV4Schema,
      expectedRevision: z.number().int().min(1),
      patch: documentPatch.refine((value) => Object.keys(value).length > 0),
    }),
  ),
  documentsVersions: query(
    'documents.versions',
    z.strictObject({
      documentId: UuidV4Schema,
      cursor,
      limit: PageLimitSchema,
    }),
  ),
  documentsTrash: mutation(
    'documents.trash',
    z.strictObject({
      documentId: UuidV4Schema,
      expectedRevision: z.number().int().min(1),
    }),
  ),
  documentsRestore: mutation(
    'documents.restore',
    z.strictObject({
      documentId: UuidV4Schema,
      expectedRevision: z.number().int().min(1),
    }),
  ),
  decisionsList: query(
    'decisions.list',
    z.strictObject({
      projectId: ProjectIdSchema,
      cursor,
      status: z
        .array(z.enum(['proposed', 'accepted', 'rejected', 'superseded']))
        .max(4)
        .optional(),
    }),
  ),
  decisionsGet: query(
    'decisions.get',
    z.strictObject({ decisionId: UuidV4Schema, revisionsCursor: cursor }),
  ),
  decisionsCreate: mutation(
    'decisions.create',
    z.strictObject({
      projectId: ProjectIdSchema,
      title: z.string().min(1).max(200),
      contextMarkdown: z.string().max(2 * 1024 * 1024),
      decisionMarkdown: z.string().max(2 * 1024 * 1024),
      rationaleMarkdown: z.string().max(2 * 1024 * 1024),
      consequencesMarkdown: z
        .string()
        .max(2 * 1024 * 1024)
        .optional(),
      alternativesMarkdown: z
        .string()
        .max(2 * 1024 * 1024)
        .optional(),
    }),
  ),
  decisionsRevise: mutation(
    'decisions.revise',
    z.strictObject({
      decisionId: UuidV4Schema,
      patch: decisionPatch.refine((value) => Object.keys(value).length > 0),
      expectedRevision: z.number().int().min(1),
      reason: shortText,
    }),
  ),
  decisionsSupersede: mutation(
    'decisions.supersede',
    z.strictObject({
      oldDecisionId: UuidV4Schema,
      newDecisionId: UuidV4Schema,
      expectedRevision: z.number().int().min(1),
      newExpectedRevision: z.number().int().min(1),
    }),
  ),
  activityList: query(
    'activity.list',
    z.strictObject({
      projectId: ProjectIdSchema,
      from: UtcMsSchema.optional(),
      to: UtcMsSchema.optional(),
      cursor,
      limit: PageLimitSchema,
    }),
  ),
  activityGet: query('activity.get', idPayload('activityId')),
  activityAppend: mutation(
    'activity.append',
    z.strictObject({
      projectId: ProjectIdSchema,
      bodyMarkdown: z
        .string()
        .min(1)
        .max(64 * 1024),
      occurredAt: UtcMsSchema.optional(),
      correctionOfId: UuidV4Schema.optional(),
      relatedTaskId: UuidV4Schema.optional(),
      relatedDecisionId: UuidV4Schema.optional(),
    }),
  ),
  recordsLink: mutation(
    'records.link',
    z.strictObject({
      source: RecordRefSchema,
      target: RecordRefSchema,
      relationship: z.enum(['references', 'depends_on', 'related_to']),
    }),
  ),
  recordsUnlink: mutation('records.unlink', idPayload('linkId')),
  attachmentsList: query(
    'attachments.list',
    z.strictObject({
      owner: RecordRefSchema,
      cursor,
      limit: PageLimitSchema,
    }),
  ),
  attachmentsImport: mutation(
    'attachments.import',
    z.strictObject({ selectionHandle, owner: RecordRefSchema }),
  ),
  attachmentsReveal: query('attachments.reveal', idPayload('attachmentId')),
  attachmentsTrash: mutation('attachments.trash', idPayload('attachmentId')),
  searchQuery: query(
    'search.query',
    z.strictObject({
      query: z.string().trim().min(1).max(1024),
      types: z.array(z.string().min(1).max(40)).max(10).optional(),
      projectIds: z.array(ProjectIdSchema).max(100).optional(),
      cursor,
      limit: PageLimitSchema,
    }),
  ),
} as const;

const previewJobId = JobIdSchema;
const approvalId = UuidV4Schema;

export const OPERATIONS_FUTURE_ROUTES = {
  filesChooseImport: query(
    'files.chooseImport',
    z.strictObject({
      types: z
        .array(z.enum(['markdown', 'archive', 'attachment']))
        .min(1)
        .max(3),
    }),
  ),
  filesChooseExportTarget: query(
    'files.chooseExportTarget',
    z.strictObject({ kind: z.enum(['directory', 'file']) }),
  ),
  transferPreviewImport: job(
    'transfer.import.preview',
    z.strictObject({ selectionHandle }),
  ),
  transferCommitImport: job(
    'transfer.import.commit',
    z.strictObject({
      previewJobId,
      selectionIds: z.array(UuidV4Schema).max(10_000),
      conflictPolicy: z.enum(['skip', 'replace', 'duplicate']),
    }),
  ),
  transferExportMarkdown: job(
    'transfer.export.markdown',
    z.strictObject({
      selectionHandle,
      projectIds: z.array(ProjectIdSchema).max(1_000).optional(),
      options: z.strictObject({
        includeAttachments: z.boolean().optional(),
        includeArchived: z.boolean().optional(),
      }),
    }),
  ),
  transferGetImportPreview: query(
    'transfer.import.preview.get',
    z.strictObject({ previewJobId, cursor, limit: PageLimitSchema }),
  ),
  gitListProfiles: query('git.profiles.list', empty),
  gitGetStatus: query('git.status', idPayload('exportProfileId')),
  gitCommitExport: job(
    'git.commit',
    z.strictObject({ exportProfileId: UuidV4Schema, message: shortText }),
  ),
  gitPushExport: job(
    'git.push',
    z.strictObject({ exportProfileId: UuidV4Schema, approvalId }),
  ),
  backupsCreate: job(
    'backups.create',
    z.strictObject({ destinationHandle: selectionHandle.optional() }),
  ),
  backupsList: query('backups.list', pagePayload),
  backupsPreviewRestore: job(
    'backups.restore.preview',
    z.strictObject({ selectionHandle }),
  ),
  backupsCommitRestore: job(
    'backups.restore.commit',
    z.strictObject({ previewJobId, approvalId }),
  ),
  jobsGet: query('jobs.get', z.strictObject({ jobId: JobIdSchema })),
  jobsList: query(
    'jobs.list',
    z.strictObject({
      states: z
        .array(
          z.enum([
            'queued',
            'running',
            'paused',
            'succeeded',
            'failed',
            'cancelled',
          ]),
        )
        .max(6)
        .optional(),
      limit: PageLimitSchema,
      cursor,
    }),
  ),
  jobsCancel: mutation('jobs.cancel', z.strictObject({ jobId: JobIdSchema })),
  capabilitiesGet: query(
    'capabilities.get',
    z.strictObject({ refresh: z.boolean().optional() }),
  ),
  capabilitiesSetPreference: mutation(
    'capabilities.preference.set',
    z.strictObject({
      capability: z.enum(['ai', 'stt', 'tts']),
      enabled: z.boolean(),
    }),
  ),
} as const;

export const AI_VOICE_FUTURE_ROUTES = {
  modelsDetectOllama: query(
    'models.ollama.detect',
    z.strictObject({ explicit: z.literal(true) }),
  ),
  modelsListInstalled: query('models.installed.list', empty),
  modelsListRecommended: query(
    'models.recommended.list',
    z.strictObject({ hardwareClass: identifier.optional() }),
  ),
  modelsSetActive: mutation(
    'models.active.set',
    z.strictObject({ modelId: identifier }),
  ),
  modelsStartDownload: job(
    'models.download.start',
    z.strictObject({ modelId: identifier, consent: z.literal(true) }),
  ),
  modelsCancelDownload: mutation(
    'models.download.cancel',
    z.strictObject({ jobId: JobIdSchema }),
  ),
  modelsRunBenchmark: job(
    'models.benchmark.start',
    z.strictObject({ modelId: identifier }),
  ),
  conversationsList: query('conversations.list', pagePayload),
  conversationsGet: query('conversations.get', idPayload('conversationId')),
  conversationsCreate: mutation(
    'conversations.create',
    z.strictObject({
      projectId: ProjectIdSchema.optional(),
      title: z.string().max(200).optional(),
    }),
  ),
  agentStartRun: job(
    'agent.run.start',
    z.strictObject({
      conversationId: UuidV4Schema,
      message: z
        .string()
        .min(1)
        .max(2 * 1024 * 1024),
      projectId: ProjectIdSchema.optional(),
    }),
  ),
  agentGetRun: query('agent.run.get', idPayload('runId')),
  agentCancelRun: mutation('agent.run.cancel', idPayload('runId')),
  agentGetToolCalls: query('agent.tools.list', idPayload('runId')),
  agentGetApprovals: query(
    'agent.approvals.list',
    z.strictObject({ runId: UuidV4Schema.optional() }),
  ),
  agentDecideApproval: mutation(
    'agent.approvals.decide',
    z.strictObject({
      approvalId,
      decision: z.enum(['approve', 'deny']),
      challengeNonce: identifier,
    }),
  ),
  voiceGetStatus: query('voice.status', empty),
  voiceListComponents: query(
    'voice.components.list',
    z.strictObject({ feature: z.enum(['stt', 'tts']).optional() }),
  ),
  voiceStartComponentInstall: job(
    'voice.components.install.start',
    z.strictObject({ componentId: identifier, consent: z.literal(true) }),
  ),
  voiceStartCapture: mutation(
    'voice.capture.start',
    z.strictObject({
      format: z.enum(['pcm_s16le', 'wav']),
      channelCount: z.number().int().min(1).max(2),
      sampleRate: z.number().int().min(8_000).max(48_000),
    }),
  ),
  voiceAppendChunk: {
    channel: 'iterkeep:v1:voice.capture.chunk',
    request: BaseRequestSchema.extend({
      payload: z.strictObject({
        captureId: UuidV4Schema,
        seq: z.number().int().min(0),
        bytes: z
          .instanceof(Uint8Array)
          .refine((value) => value.byteLength <= 64 * 1024),
      }),
    }),
    response: unavailableResult,
    limitBytes: 68 * 1024,
    rateLimit: 240,
  },
  voiceStopCapture: job('voice.capture.stop', idPayload('captureId')),
  voiceCancelCapture: mutation('voice.capture.cancel', idPayload('captureId')),
  voiceGetTranscript: query(
    'voice.transcript.get',
    z.strictObject({ transcriptionJobId: JobIdSchema }),
  ),
  voiceSpeak: job(
    'voice.tts.start',
    z.strictObject({
      text: z.string().min(1).max(100_000),
      voiceId: identifier.optional(),
    }),
  ),
} as const;

export const EVENT_FUTURE_ROUTES = {
  eventsSubscribe: query(
    'events.subscribe',
    z.strictObject({
      topics: z.array(identifier).min(1).max(50),
      projectIds: z.array(ProjectIdSchema).max(100).optional(),
      runIds: z.array(UuidV4Schema).max(100).optional(),
      jobIds: z.array(JobIdSchema).max(100).optional(),
      sinceDomainSequence: z.number().int().min(0).optional(),
    }),
  ),
  eventsUnsubscribe: query(
    'events.unsubscribe',
    z.strictObject({ subscriptionId: UuidV4Schema }),
  ),
  eventsGetSince: query(
    'events.since',
    z.strictObject({
      afterSequence: z.number().int().min(0),
      limit: PageLimitSchema,
    }),
  ),
} as const;

export const FUTURE_ROUTES = {
  ...SYSTEM_WORKSPACE_FUTURE_ROUTES,
  ...CONTENT_FUTURE_ROUTES,
  ...OPERATIONS_FUTURE_ROUTES,
  ...AI_VOICE_FUTURE_ROUTES,
  ...EVENT_FUTURE_ROUTES,
} as const;
