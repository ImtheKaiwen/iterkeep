import { randomUUID } from 'node:crypto';
import {
  StorageDbWorkerRequestSchema,
  type StorageDbWorkerRequest,
} from '@iterkeep/contracts';
import {
  acquireWorkspaceOwnership,
  bootstrapWorkspace,
  createConsistentBackup,
  createTask,
  ensureMigration,
  eventsSince,
  hashCommandPayload,
  lookupReceiptStatus,
  openDatabase,
  passiveCheckpoint,
  readSetupState,
  readTask,
  readWorkspace,
  renameTask,
  saveSetupStep,
  SqliteCoreRepository,
  completeSetup,
  StorageError,
  verifyDatabaseIntegrity,
  type MigrationEntry,
  type WorkspaceOwnership,
} from '@iterkeep/storage-sqlite';

export interface DatabaseWorkerRuntimeOptions {
  readonly databasePath: string;
  readonly intent: 'open_existing' | 'create_new';
  readonly migration: MigrationEntry;
  readonly appliedAt: string;
  readonly nativeBindingPath?: string;
}

export type DatabaseWorkerReply =
  | {
      readonly protocolVersion: 1;
      readonly requestId: string;
      readonly ok: true;
      readonly result: unknown;
    }
  | {
      readonly protocolVersion: 1;
      readonly requestId: string;
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly retryable: boolean;
        readonly safeMessageKey: string;
      };
    };

function errorReply(requestId: string, error: unknown): DatabaseWorkerReply {
  let code = 'INTERNAL_ERROR';
  if (error instanceof StorageError) {
    code =
      error.code === 'PARENT_PROJECT_UNAVAILABLE'
        ? 'REFERENTIAL_INTEGRITY'
        : error.code === 'MIGRATION_CHECKSUM_MISMATCH' ||
            error.code === 'UNRECOGNIZED_SCHEMA'
          ? 'SCHEMA_INCOMPATIBLE'
          : error.code;
  } else if (error instanceof Error) {
    const sqliteCode = (error as Error & { code?: string }).code;
    code =
      sqliteCode === 'SQLITE_BUSY' || sqliteCode === 'SQLITE_LOCKED'
        ? 'DATABASE_BUSY'
        : sqliteCode === 'SQLITE_FULL'
          ? 'DATABASE_DISK_FULL'
          : sqliteCode === 'SQLITE_CORRUPT' ||
              error.message === 'DATABASE_CORRUPT'
            ? 'DATABASE_CORRUPT'
            : 'INTERNAL_ERROR';
  }
  return {
    protocolVersion: 1,
    requestId,
    ok: false,
    error: {
      code,
      retryable: code === 'DATABASE_BUSY',
      safeMessageKey: `storage.${code.toLowerCase()}`,
    },
  };
}

function requestIdFrom(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const candidate = (raw as Record<string, unknown>).requestId;
    if (
      typeof candidate === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        candidate,
      )
    ) {
      return candidate;
    }
  }
  return randomUUID();
}

export class DatabaseWorkerRuntime {
  readonly #db: ReturnType<typeof openDatabase>;
  readonly #ownership: WorkspaceOwnership;
  readonly #nativeBindingPath: string | undefined;
  readonly #coreRepository: SqliteCoreRepository;
  #closed = false;

  constructor(options: DatabaseWorkerRuntimeOptions) {
    this.#ownership = acquireWorkspaceOwnership(options.databasePath);
    this.#nativeBindingPath = options.nativeBindingPath;
    try {
      this.#db = openDatabase({
        path: options.databasePath,
        intent: options.intent,
        ...(options.nativeBindingPath
          ? { nativeBinding: options.nativeBindingPath }
          : {}),
      });
      ensureMigration(this.#db, options.migration, options.appliedAt);
      this.#coreRepository = new SqliteCoreRepository(this.#db);
      if (options.intent === 'open_existing') verifyDatabaseIntegrity(this.#db);
    } catch (error) {
      this.#ownership.release();
      throw error;
    }
  }

  async handle(raw: unknown): Promise<DatabaseWorkerReply> {
    const requestId = requestIdFrom(raw);
    try {
      const request = StorageDbWorkerRequestSchema.parse(raw);
      const result = await this.#dispatch(request);
      return {
        protocolVersion: 1,
        requestId: request.requestId,
        ok: true,
        result,
      };
    } catch (error) {
      return errorReply(requestId, error);
    }
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#db.close();
    this.#ownership.release();
  }

  async #dispatch(request: StorageDbWorkerRequest): Promise<unknown> {
    switch (request.op) {
      case 'workspace.bootstrap': {
        const result = bootstrapWorkspace(this.#db, request.payload);
        verifyDatabaseIntegrity(this.#db);
        return result;
      }
      case 'workspace.read':
        return readWorkspace(this.#db);
      case 'core.repository': {
        const operation = request.payload;
        switch (operation.method) {
          case 'getWorkspace':
            return this.#coreRepository.getWorkspace();
          case 'getProject':
            return this.#coreRepository.getProject(operation.input.projectId);
          case 'getTask':
            return this.#coreRepository.getTask(operation.input.taskId);
          case 'createProject':
            return this.#coreRepository.createProject(operation.input);
          case 'updateProject':
            return this.#coreRepository.updateProject({
              ...operation.input,
              patch: {
                ...(operation.input.patch.name === undefined
                  ? {}
                  : { name: operation.input.patch.name }),
                ...(operation.input.patch.description === undefined
                  ? {}
                  : { description: operation.input.patch.description }),
                ...(operation.input.patch.priority === undefined
                  ? {}
                  : { priority: operation.input.patch.priority }),
                ...(operation.input.patch.tagIds === undefined
                  ? {}
                  : { tagIds: operation.input.patch.tagIds }),
              },
            });
          case 'changeProjectStatus':
            return this.#coreRepository.changeProjectStatus(operation.input);
          case 'setProjectDeleted':
            return this.#coreRepository.setProjectDeleted(operation.input);
          case 'createTask':
            return this.#coreRepository.createTask(operation.input);
          case 'updateTask':
            return this.#coreRepository.updateTask({
              ...operation.input,
              patch: {
                ...(operation.input.patch.title === undefined
                  ? {}
                  : { title: operation.input.patch.title }),
                ...(operation.input.patch.bodyMarkdown === undefined
                  ? {}
                  : { bodyMarkdown: operation.input.patch.bodyMarkdown }),
                ...(operation.input.patch.priority === undefined
                  ? {}
                  : { priority: operation.input.patch.priority }),
                ...(operation.input.patch.dueDate === undefined
                  ? {}
                  : { dueDate: operation.input.patch.dueDate }),
                ...(operation.input.patch.blockedReason === undefined
                  ? {}
                  : { blockedReason: operation.input.patch.blockedReason }),
                ...(operation.input.patch.tagIds === undefined
                  ? {}
                  : { tagIds: operation.input.patch.tagIds }),
              },
            });
          case 'changeTaskStatus':
            return this.#coreRepository.changeTaskStatus(operation.input);
          case 'moveTask':
            return this.#coreRepository.moveTask({
              taskId: operation.input.taskId,
              moveHistoryId: operation.input.moveHistoryId,
              statusHistoryId: operation.input.statusHistoryId,
              eventId: operation.input.eventId,
              receiptId: operation.input.receiptId,
              expectedRevision: operation.input.expectedRevision,
              projectId: operation.input.projectId,
              ...(operation.input.status === undefined
                ? {}
                : { status: operation.input.status }),
              ...(operation.input.sortOrder === undefined
                ? {}
                : { sortOrder: operation.input.sortOrder }),
              context: operation.input.context,
            });
          case 'setTaskDeleted':
            return this.#coreRepository.setTaskDeleted(operation.input);
        }
        throw new Error('UNSUPPORTED_CORE_REPOSITORY_METHOD');
      }
      case 'setup.read':
        return readSetupState(this.#db);
      case 'setup.save_step':
        return saveSetupStep(this.#db, request.payload);
      case 'setup.complete':
        return completeSetup(this.#db, request.payload);
      case 'tasks.create': {
        const { payloadHash, ...command } = request.payload;
        const payload = {
          projectId: command.projectId,
          title: command.title,
          bodyMarkdown: command.bodyMarkdown,
          priority: command.priority,
          dueDate: command.dueDate,
          tagIds: command.tagIds,
        };
        if (hashCommandPayload(request.op, payload) !== payloadHash) {
          throw new StorageError('IDEMPOTENCY_CONFLICT');
        }
        return createTask(this.#db, { ...command, payloadHash });
      }
      case 'tasks.read':
        return readTask(this.#db, request.payload.taskId);
      case 'tasks.update': {
        const { payloadHash, ...command } = request.payload;
        const payload = {
          taskId: command.taskId,
          title: command.title,
          expectedRevision: command.expectedRevision,
        };
        if (hashCommandPayload(request.op, payload) !== payloadHash) {
          throw new StorageError('IDEMPOTENCY_CONFLICT');
        }
        return renameTask(this.#db, { ...command, payloadHash });
      }
      case 'events.since':
        return eventsSince(
          this.#db,
          request.payload.sequence,
          request.payload.limit,
        );
      case 'receipts.lookup':
        return lookupReceiptStatus(this.#db, request.payload);
      case 'maintenance.backup':
        await createConsistentBackup(
          this.#db,
          request.payload.destinationPath,
          this.#nativeBindingPath,
        );
        return { completed: true };
      case 'maintenance.checkpoint':
        return passiveCheckpoint(this.#db);
      case 'maintenance.quick_check':
        return verifyDatabaseIntegrity(this.#db);
    }
  }
}
