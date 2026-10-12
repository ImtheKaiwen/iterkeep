import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from '@babel/parser';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const sourceRoots = ['apps', 'packages'];
const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);

const forbiddenByArea = [
  {
    area: 'native SQLite ownership',
    match: (file) => !file.includes('/packages/storage-sqlite/'),
    forbidden: [/^better-sqlite3$/],
  },
  {
    area: 'renderer',
    match: (file) => file.includes('/apps/desktop/src/renderer/'),
    forbidden: [
      /^node:/,
      /^electron$/,
      /^@iterkeep\/(storage-sqlite|application|git-adapter|agent-runtime|job-system)$/,
    ],
  },
  {
    area: 'preload',
    match: (file) => file.includes('/apps/desktop/src/preload/'),
    forbidden: [
      /^@iterkeep\/(storage-sqlite|application|git-adapter|agent-runtime|job-system)$/,
    ],
  },
  {
    area: 'domain',
    match: (file) => file.includes('/packages/domain/'),
    forbidden: [/^electron$/, /^node:/, /^@iterkeep\//],
  },
];

async function walk(directory) {
  const files = [];
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }

  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (sourceExtensions.has(path.extname(entry.name)))
      files.push(absolute);
  }
  return files;
}

function moduleSpecifiers(source) {
  const imports = [];
  const ast = parse(source, {
    plugins: ['jsx', 'typescript'],
    sourceType: 'module',
  });

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (
      [
        'ImportDeclaration',
        'ExportAllDeclaration',
        'ExportNamedDeclaration',
      ].includes(node.type) &&
      typeof node.source?.value === 'string'
    ) {
      imports.push(node.source.value);
    }
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Import' &&
      typeof node.arguments?.[0]?.value === 'string'
    ) {
      imports.push(node.arguments[0].value);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      if (Array.isArray(value)) value.forEach(visit);
      else visit(value);
    }
  }
  visit(ast.program);
  return imports;
}

const files = (
  await Promise.all(
    sourceRoots.map((directory) => walk(path.join(root, directory))),
  )
).flat();
const violations = [];

for (const file of files) {
  const normalized = file.replaceAll('\\', '/');
  const source = await fs.readFile(file, 'utf8');
  for (const rule of forbiddenByArea.filter(({ match }) => match(normalized))) {
    for (const specifier of moduleSpecifiers(source)) {
      if (rule.forbidden.some((pattern) => pattern.test(specifier))) {
        violations.push(
          `${path.relative(root, file)}: ${rule.area} cannot import "${specifier}"`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS import boundaries (${files.length} source files checked)\n`,
  );
}
