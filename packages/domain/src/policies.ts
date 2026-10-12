import type {
  AgentRunStatus,
  JobStatus,
  ProjectStatus,
  TaskStatus,
} from './value-objects/enums.js';

export interface TaskTransition {
  readonly next: TaskStatus;
  readonly changesCompletion: 'complete' | 'reopen' | 'unchanged';
  readonly isNoop: boolean;
}

export function planTaskTransition(
  from: TaskStatus,
  to: TaskStatus,
): TaskTransition {
  if (from === to) {
    return { next: to, changesCompletion: 'unchanged', isNoop: true };
  }
  if (to === 'done') {
    return { next: to, changesCompletion: 'complete', isNoop: false };
  }
  if (from === 'done') {
    return { next: to, changesCompletion: 'reopen', isNoop: false };
  }
  return { next: to, changesCompletion: 'unchanged', isNoop: false };
}

const projectTransitions: Readonly<
  Record<ProjectStatus, readonly ProjectStatus[]>
> = {
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'completed', 'archived'],
  completed: ['active', 'archived'],
  archived: ['active'],
};

export function canTransitionProject(
  from: ProjectStatus,
  to: ProjectStatus,
  kind: 'user' | 'inbox',
): boolean {
  if (from === to) return true;
  if (kind === 'inbox') return false;
  return projectTransitions[from].includes(to);
}

const agentRunTransitions: Readonly<
  Record<AgentRunStatus, readonly AgentRunStatus[]>
> = {
  queued: ['running', 'cancelled', 'failed'],
  running: ['awaiting_approval', 'completed', 'failed', 'cancelled'],
  awaiting_approval: ['running', 'cancelled', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
};

export function canTransitionAgentRun(
  from: AgentRunStatus,
  to: AgentRunStatus,
): boolean {
  return from === to || agentRunTransitions[from].includes(to);
}

const jobTransitions: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  queued: ['running', 'cancelled', 'failed'],
  running: ['succeeded', 'failed', 'cancelled'],
  paused: [],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return jobTransitions[from].includes(to);
}

export function isTerminalJob(status: JobStatus): boolean {
  return (
    status === 'succeeded' || status === 'failed' || status === 'cancelled'
  );
}

export function isCurrentRevision(actual: number, expected: number): boolean {
  return (
    Number.isSafeInteger(actual) &&
    actual >= 1 &&
    Number.isSafeInteger(expected) &&
    expected >= 1 &&
    actual === expected
  );
}

export interface Progress {
  readonly done: number | null;
  readonly total: number | null;
}
export function isValidProgress(progress: Progress): boolean {
  if (
    progress.done !== null &&
    (!Number.isSafeInteger(progress.done) || progress.done < 0)
  )
    return false;
  if (
    progress.total !== null &&
    (!Number.isSafeInteger(progress.total) || progress.total < 0)
  )
    return false;
  return !(
    progress.done !== null &&
    progress.total !== null &&
    progress.done > progress.total
  );
}
export function progressPercent(progress: Progress): number | null {
  if (!isValidProgress(progress)) return null;
  if (progress.done === null || !progress.total) return null;
  return Math.floor((progress.done / progress.total) * 100);
}
