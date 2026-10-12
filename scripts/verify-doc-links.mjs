import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(repoRoot, 'docs');
const expectedNames = Array.from({ length: 36 }, (_, index) =>
  index === 0
    ? '00-README.md'
    : index === 35
      ? '35-IMPLEMENTATION-PLAYBOOK.md'
      : null,
);

const actualNames = readdirSync(docsDir)
  .filter((name) => /^\d{2}-[A-Z0-9-]+\.md$/.test(name))
  .sort();
const docs = new Map(
  actualNames.map((name) => [name, readFileSync(join(docsDir, name), 'utf8')]),
);

const errors = [];
const warnings = [];
const checks = [];

function record(name, passed, detail) {
  checks.push({ name, status: passed ? 'PASS' : 'FAIL', detail });
  if (!passed) errors.push(`${name}: ${detail}`);
}

function unique(values) {
  return [...new Set(values)];
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const result = {};
  let activeKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const scalar = line.match(/^([a-z_]+):\s*(.*)$/);
    if (scalar) {
      activeKey = scalar[1];
      result[activeKey] = scalar[2].replace(/^['"]|['"]$/g, '');
      continue;
    }

    const listItem = line.match(/^\s+-\s+['"]?([^'"]+)['"]?\s*$/);
    if (listItem && activeKey) {
      if (!Array.isArray(result[activeKey])) result[activeKey] = [];
      result[activeKey].push(listItem[1]);
    }
  }
  return result;
}

function extractIds(text, prefix, width = 3) {
  const regex = new RegExp(`\\b${prefix}-(\\d{${width}})\\b`, 'g');
  return unique(
    [...text.matchAll(regex)].map((match) => `${prefix}-${match[1]}`),
  ).sort();
}

function expectedRange(prefix, count, width = 3) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${String(index + 1).padStart(width, '0')}`,
  );
}

function sameMembers(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function quotedValues(source) {
  return [...source.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function tsConstValues(text, name) {
  const match = text.match(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`),
  );
  return match ? quotedValues(match[1]) : [];
}

function tsUnionValues(text, name) {
  const match = text.match(new RegExp(`export type ${name} =([\\s\\S]*?);`));
  return match ? quotedValues(match[1]) : [];
}

function tableBody(sql, tableName) {
  const match = sql.match(
    new RegExp(
      `CREATE TABLE ${tableName} \\(([\\s\\S]*?)\\) STRICT(?:, WITHOUT ROWID)?;`,
    ),
  );
  return match?.[1] ?? '';
}

function sqlCheckValues(sql, tableName, columnName) {
  const body = tableBody(sql, tableName);
  const line = body
    .split(/\r?\n/)
    .find((candidate) =>
      new RegExp(`^\\s*${columnName}\\s+TEXT\\b`).test(candidate),
    );
  const match = line?.match(
    new RegExp(`CHECK \\(${columnName} IN \\(([^)]*)\\)\\)`),
  );
  return match ? quotedValues(match[1]) : [];
}

function routeInventory(text) {
  return [
    ...text.matchAll(
      /^\|\s*`([a-z][a-zA-Z]+\.[a-zA-Z]+\(\))`\s*\|\s*`([^`]+)`\s*\|\s*(?:Q|M\*?|M†|J|D|S)\s*\|/gm,
    ),
  ].map((match) => ({ method: match[1], channel: match[2] }));
}

const expectedFileByNumber = new Map();
for (const name of actualNames)
  expectedFileByNumber.set(Number(name.slice(0, 2)), name);
expectedNames[0] = expectedFileByNumber.get(0) ?? null;
expectedNames[35] = expectedFileByNumber.get(35) ?? null;

record(
  'document-count',
  actualNames.length === 36,
  `expected 36, found ${actualNames.length}`,
);
record(
  'document-number-sequence',
  Array.from({ length: 36 }, (_, index) =>
    expectedFileByNumber.has(index),
  ).every(Boolean),
  'expected one canonical Markdown file for every number DOC-00..DOC-35',
);

const frontmatter = new Map();
for (const [name, text] of docs) {
  const parsed = parseFrontmatter(text);
  frontmatter.set(name, parsed);
  record(
    `frontmatter:${name}`,
    parsed !== null,
    parsed ? 'frontmatter parsed' : 'missing frontmatter',
  );
  if (!parsed) continue;

  const number = name.slice(0, 2);
  record(
    `document-id:${name}`,
    parsed.document_id === `DOC-${number}`,
    `expected DOC-${number}, found ${parsed.document_id ?? 'missing'}`,
  );
  record(
    `last-updated:${name}`,
    /^\d{4}-\d{2}-\d{2}$/.test(parsed.last_updated ?? ''),
    `found ${parsed.last_updated ?? 'missing'}`,
  );
  record(
    `markdown-fences:${name}`,
    (text.match(/^```/gm)?.length ?? 0) % 2 === 0,
    'fenced code blocks must be balanced',
  );
}

const documentIds = [...frontmatter.values()]
  .map((item) => item?.document_id)
  .filter(Boolean);
record(
  'document-id-uniqueness',
  unique(documentIds).length === documentIds.length,
  `${unique(documentIds).length} unique IDs across ${documentIds.length} documents`,
);

const knownDocumentIds = new Set(documentIds);
for (const [name, parsed] of frontmatter) {
  if (!parsed) continue;
  for (const dependency of Array.isArray(parsed.depends_on)
    ? parsed.depends_on
    : []) {
    record(
      `dependency:${name}:${dependency}`,
      knownDocumentIds.has(dependency),
      knownDocumentIds.has(dependency)
        ? 'dependency exists'
        : 'dependency is missing',
    );
  }
  if (parsed.next_document && parsed.next_document !== 'null') {
    record(
      `next-document:${name}`,
      knownDocumentIds.has(parsed.next_document),
      `target ${parsed.next_document}`,
    );
  }
}

for (const [name, text] of docs) {
  const references = unique(
    [...text.matchAll(/\bDOC-(\d{2})\b/g)].map((match) => `DOC-${match[1]}`),
  );
  const missing = references.filter(
    (reference) => !knownDocumentIds.has(reference),
  );
  record(
    `doc-references:${name}`,
    missing.length === 0,
    missing.length
      ? `missing ${missing.join(', ')}`
      : 'all DOC references resolve',
  );

  const fileReferences = unique(
    [...text.matchAll(/`(\d{2}-[A-Z0-9-]+\.md)`/g)].map((match) => match[1]),
  );
  const missingFiles = fileReferences.filter(
    (reference) => !docs.has(reference),
  );
  record(
    `file-references:${name}`,
    missingFiles.length === 0,
    missingFiles.length
      ? `missing ${missingFiles.join(', ')}`
      : 'all canonical filenames resolve',
  );
}

const catalogSpecs = [
  ['requirements', 'REQ', '02-SCOPE-REQUIREMENTS.md', 140],
  ['acceptance', 'AC', '02-SCOPE-REQUIREMENTS.md', 18],
  ['journeys', 'JRN', '03-USER-JOURNEYS.md', 18],
  ['quality-gates', 'QG', '04-QUALITY-GATES.md', 26],
  ['tests', 'TEST', '33-TEST-STRATEGY.md', 96],
];
const catalogs = {};
for (const [label, prefix, fileName, count] of catalogSpecs) {
  const actual = extractIds(docs.get(fileName), prefix);
  const expected = expectedRange(prefix, count);
  catalogs[label] = {
    declared: count,
    actual: actual.length,
    missing: expected.filter((id) => !actual.includes(id)),
  };
  record(
    `catalog:${label}`,
    sameMembers(actual, expected),
    `expected ${count}, found ${actual.length}`,
  );
}

const routes = routeInventory(docs.get('11-IPC-CONTRACTS.md'));
const routeMethods = routes.map((route) => route.method);
const routeChannels = routes.map((route) => route.channel);
const duplicateMethods = unique(
  routeMethods.filter((item, index) => routeMethods.indexOf(item) !== index),
);
const duplicateChannels = unique(
  routeChannels.filter((item, index) => routeChannels.indexOf(item) !== index),
);
record(
  'ipc-route-count',
  routes.length === 101,
  `expected 101, found ${routes.length}`,
);
record(
  'ipc-method-uniqueness',
  duplicateMethods.length === 0,
  duplicateMethods.join(', ') || 'all methods unique',
);
record(
  'ipc-channel-uniqueness',
  duplicateChannels.length === 0,
  duplicateChannels.join(', ') || 'all channels unique',
);

const playbook = docs.get('35-IMPLEMENTATION-PLAYBOOK.md');
const packages = extractIds(playbook, 'IP', 2);
const expectedPackages = Array.from(
  { length: 20 },
  (_, index) => `IP-${String(index).padStart(2, '0')}`,
);
record(
  'implementation-package-count',
  sameMembers(packages, expectedPackages),
  `expected IP-00..IP-19, found ${packages.length}`,
);

const migrationMatch = docs
  .get('09-DATABASE-SCHEMA.md')
  .match(/```sql\r?\n([\s\S]*?)\r?\n```/);
record(
  'migration-sql-block',
  Boolean(migrationMatch),
  migrationMatch ? 'first canonical SQL block extracted' : 'missing SQL block',
);
const migrationSql = migrationMatch?.[1] ?? '';

const domain = docs.get('08-DOMAIN-MODEL.md');
const ipc = docs.get('11-IPC-CONTRACTS.md');
const jobs = docs.get('12-STATE-JOBS-EVENTS.md');
const enumComparisons = [
  [
    'project-status',
    tsConstValues(domain, 'PROJECT_STATUSES'),
    sqlCheckValues(migrationSql, 'projects', 'status'),
  ],
  [
    'task-status',
    tsConstValues(domain, 'TASK_STATUSES'),
    sqlCheckValues(migrationSql, 'tasks', 'status'),
  ],
  [
    'priority-project',
    tsConstValues(domain, 'PRIORITIES'),
    sqlCheckValues(migrationSql, 'projects', 'priority'),
  ],
  [
    'priority-task',
    tsConstValues(domain, 'PRIORITIES'),
    sqlCheckValues(migrationSql, 'tasks', 'priority'),
  ],
  [
    'decision-status',
    tsConstValues(domain, 'DECISION_STATUSES'),
    sqlCheckValues(migrationSql, 'decisions', 'status'),
  ],
  [
    'job-status',
    tsUnionValues(domain, 'JobStatus'),
    sqlCheckValues(migrationSql, 'background_jobs', 'status'),
  ],
  [
    'job-kind',
    tsUnionValues(domain, 'JobKind'),
    sqlCheckValues(migrationSql, 'background_jobs', 'kind'),
  ],
];
for (const [label, left, right] of enumComparisons) {
  record(
    `enum:${label}:domain-sql`,
    sameMembers([...left].sort(), [...right].sort()),
    `domain=${left.join(',')} sql=${right.join(',')}`,
  );
}

const ipcEnumSpecs = [
  [
    'project-status',
    'ProjectStatusSchema',
    tsConstValues(domain, 'PROJECT_STATUSES'),
  ],
  ['task-status', 'TaskStatusSchema', tsConstValues(domain, 'TASK_STATUSES')],
  ['priority', 'PrioritySchema', tsConstValues(domain, 'PRIORITIES')],
];
for (const [label, schemaName, expected] of ipcEnumSpecs) {
  const match = ipc.match(
    new RegExp(
      `export const ${schemaName} = z\\.enum\\(\\[([\\s\\S]*?)\\]\\);`,
    ),
  );
  const actual = match ? quotedValues(match[1]) : [];
  record(
    `enum:${label}:domain-ipc`,
    sameMembers([...actual].sort(), [...expected].sort()),
    `domain=${expected.join(',')} ipc=${actual.join(',')}`,
  );
}

const jobTable =
  jobs.split('V1 şu iş türlerini kapsar:')[1]?.split('**Ayrım:**')[0] ?? '';
const jobRows = [...jobTable.matchAll(/^\|\s*`([a-z_]+)`\s*\|/gm)].map(
  (match) => match[1],
);
const domainJobKinds = tsUnionValues(domain, 'JobKind');
record(
  'enum:job-kind:domain-job-doc',
  sameMembers([...unique(jobRows)].sort(), [...domainJobKinds].sort()),
  `domain=${domainJobKinds.join(',')} job-doc=${unique(jobRows).join(',')}`,
);

const staleIpcCounts = [];
for (const [name, text] of docs) {
  text.split(/\r?\n/).forEach((line, index) => {
    if (/\b(?:92|99)\s+(?:public\s+)?(?:IPC|route)/i.test(line))
      staleIpcCounts.push(`${name}:${index + 1}`);
  });
}
record(
  'ipc-count-cross-references',
  staleIpcCounts.length === 0,
  staleIpcCounts.join(', ') || 'no stale route counts',
);

const pythonProgram = String.raw`
import json, sqlite3, sys

sql = sys.stdin.read()
result = {"sqliteVersion": sqlite3.sqlite_version}

def expect_rejected(callback):
    try:
        callback()
        return False
    except sqlite3.DatabaseError:
        return True

db = sqlite3.connect(":memory:")
db.execute("PRAGMA foreign_keys=ON")
try:
    db.executescript(sql)
    result["apply"] = "PASS"
    now = "2026-10-12T12:00:00.000Z"
    workspace_id = "00000000-0000-4000-8000-000000000001"
    inbox_id = "00000000-0000-4000-8000-000000000002"
    task_id = "00000000-0000-4000-8000-000000000003"
    history_id = "00000000-0000-4000-8000-000000000004"

    db.execute("BEGIN IMMEDIATE")
    db.execute("INSERT INTO workspaces(id,display_name,inbox_project_id,created_at,updated_at) VALUES(?,?,?,?,?)", (workspace_id,"Audit",inbox_id,now,now))
    db.execute("INSERT INTO projects(id,workspace_id,kind,name,description,slug,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", (inbox_id,workspace_id,"inbox","Inbox","audit inbox","inbox","active",now,now))
    db.commit()
    db.execute("INSERT INTO tasks(id,project_id,title,body_markdown,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", (task_id,inbox_id,"Kalite denetimi","SQLite FTS fixture","todo",now,now))
    result["ftsInsert"] = db.execute("SELECT count(*) FROM search_fts WHERE search_fts MATCH 'Kalite'").fetchone()[0] == 1
    db.execute("UPDATE tasks SET title='Sözleşme denetimi',updated_at=?,revision=revision+1 WHERE id=?", (now,task_id))
    result["ftsUpdate"] = db.execute("SELECT count(*) FROM search_fts WHERE search_fts MATCH 'Sözleşme'").fetchone()[0] == 1 and db.execute("SELECT count(*) FROM search_fts WHERE search_fts MATCH 'Kalite'").fetchone()[0] == 0
    db.execute("UPDATE tasks SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=?", (now,now,task_id))
    result["ftsSoftDelete"] = db.execute("SELECT count(*) FROM search_fts WHERE search_fts MATCH 'Sözleşme'").fetchone()[0] == 0
    result["invalidTaskStatusRejected"] = expect_rejected(lambda: db.execute("UPDATE tasks SET status='invalid' WHERE id=?", (task_id,)))
    db.execute("INSERT INTO task_history(id,task_id,kind,occurred_at,actor_kind,actor_ref,correlation_id) VALUES(?,?,?,?,?,?,?)", (history_id,task_id,"created",now,"system","spec-audit","spec-audit"))
    result["appendOnlyRejected"] = expect_rejected(lambda: db.execute("UPDATE task_history SET kind='deleted' WHERE id=?", (history_id,)))
    result["inboxMutationRejected"] = expect_rejected(lambda: db.execute("UPDATE projects SET status='archived' WHERE id=?", (inbox_id,)))
    result["integrity"] = db.execute("PRAGMA integrity_check").fetchone()[0]
    result["foreignKeyViolations"] = db.execute("PRAGMA foreign_key_check").fetchall()
    result["userVersion"] = db.execute("PRAGMA user_version").fetchone()[0]
    result["strictTables"] = db.execute("SELECT count(*) FROM sqlite_schema WHERE type='table' AND sql LIKE '%STRICT%'").fetchone()[0]
    result["ftsTables"] = db.execute("SELECT count(*) FROM sqlite_schema WHERE type='table' AND sql LIKE '%USING fts5%'").fetchone()[0]
    result["triggers"] = db.execute("SELECT count(*) FROM sqlite_schema WHERE type='trigger'").fetchone()[0]
except Exception as exc:
    result["apply"] = "FAIL"
    result["error"] = repr(exc)

rollback_db = sqlite3.connect(":memory:")
rollback_db.execute("PRAGMA foreign_keys=ON")
try:
    rollback_db.executescript("BEGIN IMMEDIATE;\n" + sql + "\nROLLBACK;")
    remaining = rollback_db.execute("SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'").fetchone()[0]
    result["rollbackRemainingObjects"] = remaining
    result["rollback"] = "PASS" if remaining == 0 else "FAIL"
except Exception as exc:
    result["rollback"] = "FAIL"
    result["rollbackError"] = repr(exc)

print(json.dumps(result, ensure_ascii=False))
`;

let sqliteSmoke = {
  status: 'BLOCKED',
  reason: 'Python sqlite3 could not be executed',
};
for (const executable of ['python', 'python3', 'py']) {
  const args =
    executable === 'py' ? ['-3', '-c', pythonProgram] : ['-c', pythonProgram];
  const run = spawnSync(executable, args, {
    cwd: repoRoot,
    input: migrationSql,
    encoding: 'utf8',
  });
  if (run.error?.code === 'ENOENT') continue;
  if (run.status !== 0) {
    sqliteSmoke = {
      status: 'FAIL',
      executable,
      exitCode: run.status,
      stderr: run.stderr.trim(),
    };
    break;
  }
  try {
    const evidence = JSON.parse(run.stdout.trim());
    const passed =
      evidence.apply === 'PASS' &&
      evidence.rollback === 'PASS' &&
      evidence.integrity === 'ok' &&
      evidence.foreignKeyViolations?.length === 0 &&
      evidence.userVersion === 1 &&
      evidence.ftsInsert === true &&
      evidence.ftsUpdate === true &&
      evidence.ftsSoftDelete === true &&
      evidence.invalidTaskStatusRejected === true &&
      evidence.appendOnlyRejected === true &&
      evidence.inboxMutationRejected === true;
    sqliteSmoke = {
      status: passed ? 'PASS' : 'FAIL',
      executable,
      exitCode: run.status,
      ...evidence,
    };
  } catch (error) {
    sqliteSmoke = {
      status: 'FAIL',
      executable,
      exitCode: run.status,
      parseError: String(error),
      stdout: run.stdout.trim(),
    };
  }
  break;
}
record(
  'sqlite-migration-smoke',
  sqliteSmoke.status === 'PASS',
  JSON.stringify(sqliteSmoke),
);

const draftDocuments = [...frontmatter]
  .filter(([, item]) => item?.status === 'draft')
  .map(([name]) => name);
if (draftDocuments.length)
  warnings.push(
    `${draftDocuments.length} documents remain draft; the audit does not promote approval state.`,
  );
if (!existsSync(join(repoRoot, '.git')))
  warnings.push(
    'Workspace is not a Git repository; status/log/SHA evidence is unavailable.',
  );
if (!existsSync(join(repoRoot, 'package.json')))
  warnings.push(
    'package.json does not exist yet; npm scripts are NOT_RUN until IP-01.',
  );

const checksFailed = checks.filter((check) => check.status === 'FAIL').length;
const report = {
  schemaVersion: 1,
  packageId: 'IP-00',
  generatedAt: new Date().toISOString(),
  documentSnapshotSha256: createHash('sha256')
    .update(actualNames.map((name) => `${name}\0${docs.get(name)}\0`).join(''))
    .digest('hex'),
  documents: {
    expected: 36,
    actual: actualNames.length,
    files: actualNames.map((name) => ({
      name,
      documentId: frontmatter.get(name)?.document_id ?? null,
      status: frontmatter.get(name)?.status ?? null,
      sha256: createHash('sha256').update(docs.get(name)).digest('hex'),
    })),
  },
  catalogs,
  ipc: {
    declared: 101,
    actual: routes.length,
    duplicateMethods,
    duplicateChannels,
  },
  migration: {
    sha256: createHash('sha256').update(migrationSql).digest('hex'),
    smoke: sqliteSmoke,
  },
  checks: {
    total: checks.length,
    passed: checks.length - checksFailed,
    failed: checksFailed,
    details: checks,
  },
  conflicts: errors,
  warnings,
  runStatus: checksFailed === 0 ? 'PASS' : 'FAIL',
};

const reportIndex = process.argv.indexOf('--report');
if (reportIndex !== -1) {
  const target = resolve(repoRoot, process.argv[reportIndex + 1]);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (checksFailed > 0) process.exitCode = 1;
