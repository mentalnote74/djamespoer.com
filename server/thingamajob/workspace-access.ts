import { AccessDenied, assertHumanIdentity } from './access-identity.ts';
import type { HumanIdentity } from './access-identity.ts';

// Small binding contract; no Worker entry point or Cloudflare SDK required here.
export interface Statement {
  bind(...values: (string | number)[]): Statement;
  first<T>(): Promise<T | null>;
}
export interface IdentityDatabase {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}
export type WorkspaceOperation = 'member' | 'owner';
export interface WorkspaceAccess {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly operation: WorkspaceOperation;
}
type Grant = { identity: HumanIdentity; database: IdentityDatabase };
const grants = new WeakMap<WorkspaceAccess, Grant>();
const membershipSql = `SELECT a.actor_id, w.workspace_id, w.owner_actor_id
  FROM thingamajob_actors a
  JOIN thingamajob_memberships m ON m.actor_id = a.actor_id
  JOIN thingamajob_workspaces w ON w.workspace_id = m.workspace_id
  WHERE a.issuer = ? AND a.subject = ? AND w.workspace_id = ?
    AND a.active = 1 AND m.active = 1 AND w.active = 1`;
function identifier(value: string): void {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new AccessDenied();
}
export async function authorizeWorkspace(
  database: IdentityDatabase,
  identity: HumanIdentity,
  workspaceId: string,
  operation: WorkspaceOperation,
): Promise<WorkspaceAccess> {
  assertHumanIdentity(identity);
  identifier(workspaceId);
  if (operation !== 'member' && operation !== 'owner') throw new AccessDenied();
  let row: { actor_id: string; workspace_id: string; owner_actor_id: string } | null;
  try {
    row = await database
      .prepare(membershipSql)
      .bind(identity.issuer, identity.subject, workspaceId)
      .first<{ actor_id: string; workspace_id: string; owner_actor_id: string }>();
  } catch {
    throw new AccessDenied();
  }
  assertHumanIdentity(identity);
  if (
    !row ||
    row.workspace_id !== workspaceId ||
    (operation === 'owner' && row.owner_actor_id !== row.actor_id)
  )
    throw new AccessDenied();
  const scope = Object.freeze({ actorId: row.actor_id, workspaceId: row.workspace_id, operation });
  grants.set(scope, { identity, database });
  return scope;
}
/** Read fresh membership; scopes are not long-lived cached authority. */
export async function recheckWorkspace(scope: WorkspaceAccess): Promise<void> {
  const grant = grants.get(scope);
  if (!grant) throw new AccessDenied();
  const current = await authorizeWorkspace(
    grant.database,
    grant.identity,
    scope.workspaceId,
    scope.operation,
  );
  if (current.actorId !== scope.actorId) throw new AccessDenied();
}
/** Later mutations must include this predicate IN their committing SQL statement.
 * A preceding read/recheck alone does not prevent a revoke/check/write race. */
export function mutationAuthorization(
  scope: WorkspaceAccess,
  requiredOperation: WorkspaceOperation,
) {
  const grant = grants.get(scope);
  if (
    !grant ||
    (requiredOperation !== 'member' && requiredOperation !== 'owner') ||
    (requiredOperation === 'owner' && scope.operation !== 'owner')
  )
    throw new AccessDenied();
  assertHumanIdentity(grant.identity);
  return {
    sql: `EXISTS (${membershipSql} AND a.actor_id = ? ${requiredOperation === 'owner' ? 'AND w.owner_actor_id = a.actor_id' : ''}) AND unixepoch() < ?`,
    bindings: [
      grant.identity.issuer,
      grant.identity.subject,
      scope.workspaceId,
      scope.actorId,
      grant.identity.expiresAt,
    ] as readonly (string | number)[],
  };
}
/** One request composition; request body/identity headers/role claims are never read. */
export function createWorkspaceAuthorizer(
  authenticate: (request: Request) => Promise<HumanIdentity>,
  database: IdentityDatabase,
) {
  return async (request: Request, requestedWorkspace: string, operation: WorkspaceOperation) =>
    authorizeWorkspace(database, await authenticate(request), requestedWorkspace, operation);
}

export interface OwnerBinding {
  readonly issuer: string;
  readonly subject: string;
  readonly actorId: string;
  readonly workspaceId: string;
}
/** Trusted operator-only provisioning helper; NEVER expose as a browser/API action.
 * Plain inserts prevent accidental reassignment; repeated provisioning fails atomically. */
export async function provisionTwoOwners(
  database: IdentityDatabase,
  bindings: readonly [OwnerBinding, OwnerBinding],
) {
  if (
    bindings.length !== 2 ||
    new Set(bindings.map((b) => b.actorId)).size !== 2 ||
    new Set(bindings.map((b) => b.workspaceId)).size !== 2 ||
    new Set(bindings.map((b) => b.issuer + '\n' + b.subject)).size !== 2
  )
    throw new Error('Invalid owner provisioning');
  for (const b of bindings) {
    identifier(b.actorId);
    identifier(b.workspaceId);
    if (
      !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(b.issuer) ||
      !b.subject.trim() ||
      b.subject.length > 200
    )
      throw new Error('Invalid owner provisioning');
  }
  const statements = bindings.flatMap((b) => [
    database
      .prepare('INSERT INTO thingamajob_actors (actor_id, issuer, subject) VALUES (?, ?, ?)')
      .bind(b.actorId, b.issuer, b.subject),
    database
      .prepare('INSERT INTO thingamajob_workspaces (workspace_id, owner_actor_id) VALUES (?, ?)')
      .bind(b.workspaceId, b.actorId),
    database
      .prepare('INSERT INTO thingamajob_memberships (actor_id, workspace_id) VALUES (?, ?)')
      .bind(b.actorId, b.workspaceId),
  ]);
  await database.batch(statements);
}
