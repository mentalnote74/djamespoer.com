import { AccessDenied, assertHumanIdentity } from './access-identity.ts';
import type { HumanIdentity } from './access-identity.ts';
import { authorizeWorkspace, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

/** Read-only subset of the Worker R2 binding; no upload/download/delete capability. */
export interface PrivateOriginals {
  head(key: string): Promise<unknown | null>;
}

/** Resolve only the authenticated owner's existing workspace; never provision one. */
export async function ownStorageWorkspace(database: IdentityDatabase, identity: HumanIdentity) {
  assertHumanIdentity(identity);
  const row = await database
    .prepare(
      `SELECT w.workspace_id FROM thingamajob_actors a
      JOIN thingamajob_workspaces w ON w.owner_actor_id = a.actor_id
      WHERE a.issuer = ? AND a.subject = ?`,
    )
    .bind(identity.issuer, identity.subject)
    .first<{ workspace_id: string }>();
  if (!row) throw new AccessDenied();
  return authorizeWorkspace(database, identity, row.workspace_id, 'owner');
}

/** Probe a random, server-owned reserved key, not a caller-selected evidence object.
 * This is binding connectivity evidence, not a claim that object storage is public/private
 * or that future evidence retrieval/transactions have been implemented. */
export async function storageReadiness(scope: WorkspaceAccess, originals?: PrivateOriginals) {
  await recheckWorkspace(scope);
  if (!originals || typeof originals.head !== 'function') throw new Error('Storage unavailable');
  await originals.head(`workspaces/${scope.workspaceId}/_readiness/${crypto.randomUUID()}`);
  await recheckWorkspace(scope);
  return { authorized: true, d1: 'ready', r2: 'ready' } as const;
}
