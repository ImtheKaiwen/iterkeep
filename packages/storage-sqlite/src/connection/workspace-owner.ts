import path from 'node:path';

const ownedDatabases = new Set<string>();

function ownerKey(databasePath: string): string {
  const resolved = path.resolve(databasePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export interface WorkspaceOwnership {
  release(): void;
}

export function acquireWorkspaceOwnership(
  databasePath: string,
): WorkspaceOwnership {
  const key = ownerKey(databasePath);
  if (ownedDatabases.has(key)) throw new Error('WORKSPACE_ALREADY_OPEN');
  ownedDatabases.add(key);
  let released = false;
  return {
    release(): void {
      if (released) return;
      released = true;
      ownedDatabases.delete(key);
    },
  };
}
