import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const expectedNames = new Set([
  '@iterkeep/desktop',
  '@iterkeep/domain',
  '@iterkeep/contracts',
  '@iterkeep/application',
  '@iterkeep/storage-sqlite',
  '@iterkeep/import-export',
  '@iterkeep/search',
  '@iterkeep/git-adapter',
  '@iterkeep/agent-runtime',
  '@iterkeep/provider-ollama',
  '@iterkeep/voice-client',
  '@iterkeep/job-system',
  '@iterkeep/ui',
  '@iterkeep/testing',
]);

async function packageDirectories(parent) {
  const directory = path.join(root, parent);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
}

const directories = [
  ...(await packageDirectories('apps')),
  ...(await packageDirectories('packages')),
];
const manifests = await Promise.all(
  directories.map(async (directory) => {
    const contents = await fs.readFile(
      path.join(directory, 'package.json'),
      'utf8',
    );
    return { directory, manifest: JSON.parse(contents) };
  }),
);

const errors = [];
const names = manifests.map(({ manifest }) => manifest.name);
if (names.length !== expectedNames.size)
  errors.push(`expected 14 workspaces, found ${names.length}`);
for (const name of expectedNames)
  if (!names.includes(name)) errors.push(`missing workspace ${name}`);
for (const name of names)
  if (!expectedNames.has(name)) errors.push(`unexpected workspace ${name}`);
if (new Set(names).size !== names.length)
  errors.push('workspace names must be unique');

const graph = new Map(names.map((name) => [name, []]));
for (const { manifest } of manifests) {
  const dependencyGroups = [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
  ];
  for (const dependencies of dependencyGroups) {
    for (const [dependency, version] of Object.entries(dependencies ?? {})) {
      if (!dependency.startsWith('@iterkeep/')) continue;
      if (!expectedNames.has(dependency))
        errors.push(`${manifest.name} references unknown ${dependency}`);
      if (version !== '0.1.0')
        errors.push(`${manifest.name} must pin ${dependency} to 0.1.0`);
      graph.get(manifest.name)?.push(dependency);
    }
  }
}

const visiting = new Set();
const visited = new Set();
function visit(name, trail = []) {
  if (visiting.has(name)) {
    errors.push(`dependency cycle: ${[...trail, name].join(' -> ')}`);
    return;
  }
  if (visited.has(name)) return;
  visiting.add(name);
  for (const dependency of graph.get(name) ?? [])
    visit(dependency, [...trail, name]);
  visiting.delete(name);
  visited.add(name);
}
for (const name of names) visit(name);

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `PASS package graph (${names.length} workspaces, no cycles)\n`,
  );
}
