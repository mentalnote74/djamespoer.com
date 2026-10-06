import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Explicit injected neutral acquisition only; no default network source during migration. */
export async function createSnapshot({ acquire, now = () => new Date() } = {}) {
  if (typeof acquire !== 'function') throw new Error('Pipeline acquisition is not configured.');
  const records = await acquire();
  const { normalizeDeploymentHistory } = await import('./load-adapter.mjs');
  const result = normalizeDeploymentHistory(records);
  if (!result.ok) throw new Error('Pipeline history validation failed.');
  const checkedAt = now().toISOString();
  return {
    schemaVersion: 4,
    checkedAt,
    generatedAt: checkedAt,
    refreshStatus: 'ok',
    rows: result.rows,
  };
}

export async function serializeVerifiedSnapshot(snapshot) {
  const serialized = JSON.stringify(snapshot, null, 2);
  const value = JSON.parse(serialized);
  const { validateDeploymentSnapshot } = await import('./load-adapter.mjs');
  if (!validateDeploymentSnapshot(value).ok) throw new Error('Invalid snapshot envelope.');
  return `${serialized}\n`;
}

export async function recoverTemporaryOutput(output) {
  let files;
  try {
    files = await readdir(dirname(output), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const prefix = basename(output).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const current = new RegExp(`^\\.${prefix}-${uuid}\\.tmp$`);
  const legacy = new RegExp(`^\\.deployment-history-${uuid}\\.tmp$`);
  // Single generator process: discard abandoned candidates, never promote them.
  for (const file of files) {
    if (
      file.isFile() &&
      (current.test(file.name) ||
        (basename(output) === 'deployment-history.json' && legacy.test(file.name)))
    ) {
      await rm(join(dirname(output), file.name));
    }
  }
}

export async function writeSnapshotAtomically(output, snapshot, replace = rename) {
  const serialized = await serializeVerifiedSnapshot(snapshot);
  await mkdir(dirname(output), { recursive: true });
  const temporary = join(dirname(output), `.${basename(output)}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, serialized, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await replace(temporary, output);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function generateSnapshot(output, options) {
  try {
    await recoverTemporaryOutput(output);
    // All acquisition and validation finish before touching the existing asset.
    const snapshot = await createSnapshot(options);
    await writeSnapshotAtomically(output, snapshot);
    return snapshot;
  } catch (cause) {
    let lastKnownGoodAvailable = false;
    try {
      await serializeVerifiedSnapshot(JSON.parse(await readFile(output, 'utf8')));
      lastKnownGoodAvailable = true;
    } catch {
      /* Missing or invalid snapshots are not last-known-good evidence. */
    }
    const error = new Error('Deployment snapshot generation failed.', { cause });
    error.lastKnownGoodAvailable = lastKnownGoodAvailable;
    throw error;
  }
}
