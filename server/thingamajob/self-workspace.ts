import { AccessDenied, assertHumanIdentity } from './access-identity.ts';
import type { HumanIdentity } from './access-identity.ts';
import { authorizeWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

async function existingWorkspace(database: IdentityDatabase, identity: HumanIdentity) {
  const row = await database
    .prepare(
      `SELECT w.workspace_id
    FROM thingamajob_actors a
    JOIN thingamajob_workspaces w ON w.owner_actor_id = a.actor_id
    WHERE a.issuer = ? AND a.subject = ?`,
    )
    .bind(identity.issuer, identity.subject)
    .first<{ workspace_id: string }>();
  return row ? authorizeWorkspace(database, identity, row.workspace_id, 'owner') : null;
}

/** Only an operator-approved verified human may initialize their own workspace. */
export async function bootstrapOwnWorkspace(
  database: IdentityDatabase,
  identity: HumanIdentity,
): Promise<WorkspaceAccess | null> {
  assertHumanIdentity(identity);
  const existing = await existingWorkspace(database, identity);
  if (existing) return existing;
  // Never repair/reassign an existing actor with absent or revoked ownership.
  const actor = await database
    .prepare('SELECT actor_id FROM thingamajob_actors WHERE issuer = ? AND subject = ?')
    .bind(identity.issuer, identity.subject)
    .first<{ actor_id: string }>();
  if (actor) throw new AccessDenied();
  // Public requests record ONLY the server-verified identity. This is not approval.
  await database.batch([
    database
      .prepare(
        'INSERT OR IGNORE INTO thingamajob_pending_identities (issuer, subject) VALUES (?, ?)',
      )
      .bind(identity.issuer, identity.subject),
  ]);
  const approval = await database
    .prepare('SELECT active FROM thingamajob_owner_approvals WHERE issuer = ? AND subject = ?')
    .bind(identity.issuer, identity.subject)
    .first<{ active: number }>();
  if (approval?.active !== 1) return null;
  const actorId = crypto.randomUUID(),
    workspaceId = crypto.randomUUID();
  assertHumanIdentity(identity);
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_actors (actor_id, issuer, subject)
        SELECT ?, ?, ? WHERE unixepoch() < ? AND EXISTS (
          SELECT 1 FROM thingamajob_owner_approvals WHERE issuer = ? AND subject = ? AND active = 1)`,
        )
        .bind(
          actorId,
          identity.issuer,
          identity.subject,
          identity.expiresAt,
          identity.issuer,
          identity.subject,
        ),
      database
        .prepare('INSERT INTO thingamajob_workspaces (workspace_id, owner_actor_id) VALUES (?, ?)')
        .bind(workspaceId, actorId),
      database
        .prepare('INSERT INTO thingamajob_memberships (actor_id, workspace_id) VALUES (?, ?)')
        .bind(actorId, workspaceId),
    ]);
  } catch {
    // A simultaneous request may have won the unique subject insert. Re-read authority;
    // no upsert or role/identity reassignment. Other failures remain safe failures.
    const concurrent = await existingWorkspace(database, identity);
    if (concurrent) return concurrent;
    throw new Error('Workspace initialization unavailable');
  }
  return authorizeWorkspace(database, identity, workspaceId, 'owner');
}
