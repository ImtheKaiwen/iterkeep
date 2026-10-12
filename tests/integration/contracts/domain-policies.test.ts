import {
  canTransitionAgentRun,
  canTransitionJob,
  canTransitionProject,
  isCurrentRevision,
  isTerminalJob,
  isValidProgress,
  planTaskTransition,
} from '@iterkeep/domain';
import { describe, expect, it } from 'vitest';

describe('IP-03 domain invariants', () => {
  it('protects Inbox and enforces project transitions', () => {
    expect(canTransitionProject('active', 'paused', 'user')).toBe(true);
    expect(canTransitionProject('archived', 'completed', 'user')).toBe(false);
    expect(canTransitionProject('active', 'archived', 'inbox')).toBe(false);
    expect(canTransitionProject('active', 'active', 'inbox')).toBe(true);
  });

  it('plans task completion and reopen side effects', () => {
    expect(planTaskTransition('todo', 'done')).toMatchObject({
      changesCompletion: 'complete',
    });
    expect(planTaskTransition('done', 'blocked')).toMatchObject({
      changesCompletion: 'reopen',
    });
    expect(planTaskTransition('todo', 'todo')).toMatchObject({ isNoop: true });
  });

  it('keeps agent and job terminal states terminal', () => {
    expect(canTransitionAgentRun('running', 'awaiting_approval')).toBe(true);
    expect(canTransitionAgentRun('completed', 'running')).toBe(false);
    expect(canTransitionJob('queued', 'running')).toBe(true);
    expect(canTransitionJob('succeeded', 'running')).toBe(false);
    expect(isTerminalJob('cancelled')).toBe(true);
  });

  it('validates optimistic revisions and job progress', () => {
    expect(isCurrentRevision(3, 3)).toBe(true);
    expect(isCurrentRevision(3, 2)).toBe(false);
    expect(isValidProgress({ done: 2, total: 1 })).toBe(false);
    expect(isValidProgress({ done: 1, total: 2 })).toBe(true);
  });
});
