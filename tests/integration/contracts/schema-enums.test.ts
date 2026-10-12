import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AgentRunStatusSchema,
  ApprovalStatusSchema,
  DecisionStatusSchema,
  JobKindSchema,
  JobStatusSchema,
  PrioritySchema,
  ProjectStatusSchema,
  RecordKindSchema,
  RecordRelationSchema,
  RiskLevelSchema,
  TaskHistoryKindSchema,
  TaskStatusSchema,
  ToolCallStatusSchema,
} from '@iterkeep/contracts';
import {
  AGENT_RUN_STATUSES,
  APPROVAL_STATUSES,
  DECISION_STATUSES,
  JOB_KINDS,
  JOB_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  RECORD_KINDS,
  RECORD_RELATIONS,
  RISK_LEVELS,
  TASK_HISTORY_KINDS,
  TASK_STATUSES,
  TOOL_CALL_STATUSES,
} from '@iterkeep/domain';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(
  process.cwd(),
  'packages/storage-sqlite/migrations/0001_initial.sql',
);

function quotedValues(expression: string): string[] {
  return [...expression.matchAll(/'([^']+)'/gu)].map(
    (match) => match[1] as string,
  );
}

describe('IP-03 domain enum and SQLite schema consistency', () => {
  it('derives every persisted Zod enum from the domain catalog', () => {
    const pairs = [
      [ProjectStatusSchema.options, PROJECT_STATUSES],
      [TaskStatusSchema.options, TASK_STATUSES],
      [PrioritySchema.options, PRIORITIES],
      [DecisionStatusSchema.options, DECISION_STATUSES],
      [RecordKindSchema.options, RECORD_KINDS],
      [RecordRelationSchema.options, RECORD_RELATIONS],
      [TaskHistoryKindSchema.options, TASK_HISTORY_KINDS],
      [AgentRunStatusSchema.options, AGENT_RUN_STATUSES],
      [ToolCallStatusSchema.options, TOOL_CALL_STATUSES],
      [ApprovalStatusSchema.options, APPROVAL_STATUSES],
      [RiskLevelSchema.options, RISK_LEVELS],
      [JobKindSchema.options, JOB_KINDS],
      [JobStatusSchema.options, JOB_STATUSES],
    ];

    for (const [schemaValues, domainValues] of pairs) {
      expect(schemaValues).toEqual([...domainValues]);
    }
  });

  it('keeps canonical enums present in physical CHECK constraints', async () => {
    const sql = await fs.readFile(migrationPath, 'utf8');
    const expected = [
      PROJECT_STATUSES,
      TASK_STATUSES,
      PRIORITIES,
      DECISION_STATUSES,
      RECORD_KINDS,
      RECORD_RELATIONS,
      TASK_HISTORY_KINDS,
      AGENT_RUN_STATUSES,
      TOOL_CALL_STATUSES,
      APPROVAL_STATUSES,
      RISK_LEVELS,
      JOB_KINDS,
      JOB_STATUSES,
    ];

    for (const values of expected) {
      expect(sql).toContain(values.map((value) => `'${value}'`).join(','));
    }
  });

  it('does not hide extra job values in the database schema', async () => {
    const sql = await fs.readFile(migrationPath, 'utf8');
    const jobTable = sql.match(
      /CREATE TABLE background_jobs[\s\S]*?;\r?\n/u,
    )?.[0];
    expect(jobTable).toBeDefined();
    const kinds = jobTable?.match(/kind TEXT[^\n]+IN \(([^)]+)\)/u)?.[1];
    const statuses = jobTable?.match(/status TEXT[^\n]+IN \(([^)]+)\)/u)?.[1];
    expect(quotedValues(kinds ?? '')).toEqual([...JOB_KINDS]);
    expect(quotedValues(statuses ?? '')).toEqual([...JOB_STATUSES]);
  });
});
