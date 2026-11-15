import { AccessDenied } from './access-identity.ts';
import {
  recordSupersession,
  validateSupersession,
  lifecycleIdentifier,
} from './claim-lifecycle.ts';
import type { SupersessionInput } from './claim-lifecycle.ts';
import type { IdentityDatabase } from './workspace-access.ts';

/** Trusted operator-only maintenance, like provisionTwoOwners. Not imported by Worker.
 * Requires external authenticated Cloudflare operator access AND explicit owner direction.
 * Records operator execution honestly; never fabricates a human Access identity. */
export async function operatorSupersedeClaim(
  database: IdentityDatabase,
  instruction: {
    workspaceId: string;
    authorizingOwnerActorId: string;
    obsoleteClaimId: string;
    input: SupersessionInput;
    requestKey: string;
    authorizationReference: string;
  },
) {
  const {
    workspaceId,
    authorizingOwnerActorId,
    obsoleteClaimId,
    requestKey,
    authorizationReference,
  } = instruction;
  for (const id of [workspaceId, authorizingOwnerActorId, obsoleteClaimId, requestKey])
    lifecycleIdentifier(id);
  if (!authorizationReference.trim() || authorizationReference.length > 1000)
    throw new Error('Explicit owner direction required');
  const sql = `EXISTS (SELECT 1 FROM thingamajob_workspaces w JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id
    JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id
    WHERE w.workspace_id=? AND a.actor_id=? AND w.active=1 AND a.active=1 AND m.active=1)`;
  const bindings = [workspaceId, authorizingOwnerActorId];
  if (
    !(await database
      .prepare('SELECT 1 AS allowed WHERE ' + sql)
      .bind(...bindings)
      .first())
  )
    throw new AccessDenied();
  return recordSupersession(
    database,
    workspaceId,
    obsoleteClaimId,
    validateSupersession(instruction.input),
    requestKey,
    authorizingOwnerActorId,
    { sql, bindings },
    'operator',
    authorizationReference,
  );
}
