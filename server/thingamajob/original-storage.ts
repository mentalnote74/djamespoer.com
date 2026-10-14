import { mutationAuthorization, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import type { Provenance } from './evidence-validation.ts';

export interface OriginalBucket {
  put(
    key: string,
    value: Uint8Array,
    options: { onlyIf: { etagDoesNotMatch: string } },
  ): Promise<unknown | null>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
}
export class StorageConflict extends Error {
  constructor() {
    super('Storage conflict');
  }
}
type Original = {
  source_id: string;
  object_key: string;
  sha256: string;
  byte_length: number;
  version: number;
};
const columns = 'source_id, object_key, sha256, byte_length, version';
async function digest(bytes: Uint8Array): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
  return Array.from(new Uint8Array(result), (value) => value.toString(16).padStart(2, '0')).join(
    '',
  );
}
async function receipt(database: IdentityDatabase, scope: WorkspaceAccess, requestKey: string) {
  await recheckWorkspace(scope);
  return database
    .prepare(
      `SELECT ${columns} FROM thingamajob_originals WHERE workspace_id = ? AND request_key = ?`,
    )
    .bind(scope.workspaceId, requestKey)
    .first<Original>();
}

async function replayProvenance(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  sourceId: string,
  provenance?: Provenance,
) {
  if (!provenance) return;
  const row = await database
    .prepare(
      `SELECT filename, source_type, attribution, source_locator
    FROM thingamajob_evidence WHERE workspace_id = ? AND source_id = ?`,
    )
    .bind(scope.workspaceId, sourceId)
    .first<{
      filename: string;
      source_type: string;
      attribution: string;
      source_locator: string;
    }>();
  if (
    !row ||
    row.filename !== provenance.filename ||
    row.source_type !== provenance.sourceType ||
    row.attribution !== provenance.attribution ||
    row.source_locator !== provenance.sourceLocator
  )
    throw new StorageConflict();
}

/** Internal immutable-byte storage seam; not an evidence-format/intake API.
 * Authorization is a genuine server scope. All object keys are server-generated.
 * No deletion on failure: an R2-success/D1-failure object remains a private orphan. */
export async function storeOriginal(
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  requestKey: string,
  bytes: Uint8Array,
  expectedVersion = 0,
  provenance?: Provenance,
) {
  await recheckWorkspace(scope);
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(requestKey) ||
    !bytes.byteLength ||
    bytes.byteLength > 10000000
  )
    throw new StorageConflict();
  if (expectedVersion !== 0) throw new StorageConflict(); // Immutable originals permit create-only.
  const hash = await digest(bytes);
  const existing = await receipt(database, scope, requestKey);
  if (existing) {
    if (existing.sha256 !== hash || existing.byte_length !== bytes.byteLength)
      throw new StorageConflict();
    await replayProvenance(database, scope, existing.source_id, provenance);
    await recheckWorkspace(scope);
    return { sourceId: existing.source_id, version: existing.version, replayed: true };
  }
  const sourceId = crypto.randomUUID();
  const key = `workspaces/${scope.workspaceId}/originals/${sourceId}`;
  await recheckWorkspace(scope);
  if (!(await bucket.put(key, bytes, { onlyIf: { etagDoesNotMatch: '*' } })))
    throw new Error('Storage unavailable');
  const authorization = mutationAuthorization(scope, 'owner');
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_originals
        (workspace_id, source_id, request_key, object_key, sha256, byte_length, version)
        SELECT ?, ?, ?, ?, ?, ?, 1 WHERE ? = 0 AND ${authorization.sql}`,
        )
        .bind(
          scope.workspaceId,
          sourceId,
          requestKey,
          key,
          hash,
          bytes.byteLength,
          expectedVersion,
          ...authorization.bindings,
        ),
      // If authorization/precondition inserted no parent, FK failure rolls back the entire batch.
      database
        .prepare(
          `INSERT INTO thingamajob_original_history
        (workspace_id, source_id, version, actor_id, operation) VALUES (?, ?, 1, ?, 'created')`,
        )
        .bind(scope.workspaceId, sourceId, scope.actorId),
      ...(provenance
        ? [
            database
              .prepare(
                `INSERT INTO thingamajob_evidence
        (workspace_id, source_id, version, filename, source_type, attribution, source_locator)
        VALUES (?, ?, 1, ?, ?, ?, ?)`,
              )
              .bind(
                scope.workspaceId,
                sourceId,
                provenance.filename,
                provenance.sourceType,
                provenance.attribution,
                provenance.sourceLocator,
              ),
          ]
        : []),
    ]);
  } catch {
    const winner = await receipt(database, scope, requestKey);
    if (!winner) throw new Error('Storage commit unavailable');
    if (winner.sha256 !== hash || winner.byte_length !== bytes.byteLength)
      throw new StorageConflict();
    await replayProvenance(database, scope, winner.source_id, provenance);
    await recheckWorkspace(scope);
    return { sourceId: winner.source_id, version: winner.version, replayed: true };
  }
  await recheckWorkspace(scope);
  return { sourceId, version: 1, replayed: false };
}

/** Originals can be read only by their workspace-scoped committed D1 record. */
export async function loadOriginal(
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  sourceId: string,
) {
  await recheckWorkspace(scope);
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(sourceId)) throw new StorageConflict();
  const original = await database
    .prepare(
      `SELECT ${columns} FROM thingamajob_originals WHERE workspace_id = ? AND source_id = ?`,
    )
    .bind(scope.workspaceId, sourceId)
    .first<Original>();
  if (!original) throw new StorageConflict();
  const object = await bucket.get(original.object_key);
  if (!object) throw new Error('Original unavailable');
  const bytes = new Uint8Array(await object.arrayBuffer());
  await recheckWorkspace(scope);
  if (bytes.byteLength !== original.byte_length || (await digest(bytes)) !== original.sha256)
    throw new Error('Original integrity failure');
  return { bytes, version: original.version };
}

export async function verifyOriginal(
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  sourceId: string,
) {
  const original = await loadOriginal(database, bucket, scope, sourceId);
  return { committed: true, integrity: 'verified', version: original.version } as const;
}
