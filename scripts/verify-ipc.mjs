import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  FUTURE_ROUTES,
  IPC_ROUTE_COUNT,
  IPC_ROUTES,
  PROJECT_ROUTES,
  SETUP_ROUTES,
  TASK_ROUTES,
} from '../packages/contracts/dist/index.js';

const root = process.cwd();
const catalogs = {
  FUTURE_ROUTES,
  PROJECT_ROUTES,
  SETUP_ROUTES,
  TASK_ROUTES,
};
const routeReferencePattern =
  /(?:handle|invoke)\(\s*(FUTURE_ROUTES|PROJECT_ROUTES|SETUP_ROUTES|TASK_ROUTES)\.([A-Za-z0-9_]+)/gu;

function routeFromReference(catalogName, routeName) {
  const catalog = catalogs[catalogName];
  const route = catalog?.[routeName];
  if (!route)
    throw new Error(`Unknown IPC route reference ${catalogName}.${routeName}`);
  return route;
}

async function referencedChannels(relativePath) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  return [...source.matchAll(routeReferencePattern)].map(
    (match) => routeFromReference(match[1], match[2]).channel,
  );
}

const manifestChannels = IPC_ROUTES.map((route) => route.channel).sort();
const preloadChannels = (
  await referencedChannels('apps/desktop/src/preload/preload.ts')
).sort();
const handlerChannels = [
  ...(await referencedChannels('apps/desktop/src/main/setup-ipc.ts')),
  ...(await referencedChannels('apps/desktop/src/main/core-ipc.ts')),
  ...Object.values(FUTURE_ROUTES).map((route) => route.channel),
].sort();

function assertExact(label, actual) {
  if (actual.length !== IPC_ROUTE_COUNT) {
    throw new Error(
      `${label} expected ${IPC_ROUTE_COUNT} routes, found ${actual.length}`,
    );
  }
  if (new Set(actual).size !== actual.length) {
    throw new Error(`${label} contains duplicate routes`);
  }
  if (JSON.stringify(actual) !== JSON.stringify(manifestChannels)) {
    const missing = manifestChannels.filter(
      (channel) => !actual.includes(channel),
    );
    const extra = actual.filter(
      (channel) => !manifestChannels.includes(channel),
    );
    throw new Error(
      `${label} differs from manifest; missing=${missing.join(',')} extra=${extra.join(',')}`,
    );
  }
}

if (manifestChannels.length !== IPC_ROUTE_COUNT) {
  throw new Error(
    `IPC manifest expected ${IPC_ROUTE_COUNT} routes, found ${manifestChannels.length}`,
  );
}
if (new Set(manifestChannels).size !== manifestChannels.length) {
  throw new Error('IPC manifest contains duplicate channels');
}
for (const route of IPC_ROUTES) {
  if (typeof route.request?.safeParse !== 'function') {
    throw new Error(`${route.channel} has no request schema`);
  }
  if (typeof route.response?.safeParse !== 'function') {
    throw new Error(`${route.channel} has no response schema`);
  }
}
assertExact('Preload surface', preloadChannels);
assertExact('Main handlers', handlerChannels);

const report = {
  schemaVersion: 1,
  routeCount: IPC_ROUTE_COUNT,
  channels: manifestChannels,
  checks: {
    uniqueChannels: 'PASS',
    requestSchemas: 'PASS',
    responseSchemas: 'PASS',
    preloadManifestMatch: 'PASS',
    mainHandlerManifestMatch: 'PASS',
  },
  status: 'PASS',
};
const evidenceDirectory = path.join(root, '.artifacts', 'ip-06');
await fs.mkdir(evidenceDirectory, { recursive: true });
await fs.writeFile(
  path.join(evidenceDirectory, 'ipc-manifest.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
