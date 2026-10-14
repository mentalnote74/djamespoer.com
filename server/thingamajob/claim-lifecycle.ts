import { AccessDenied } from './access-identity.ts';
import { AssertionInputError, ReviewConflict } from './assertion-service.ts';
import { boundedBytes } from './evidence-validation.ts';
import { mutationAuthorization, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';

export interface SupersessionInput {
  replacementClaimId: string;
  expectedObsoleteVersion: number;
  expectedReplacementVersion: number;
  reason: string;
}
export function lifecycleIdentifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new AssertionInputError();
  return value;
}
export function validateSupersession(value: unknown): SupersessionInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AssertionInputError();
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) =>
        ![
          'replacementClaimId',
          'expectedObsoleteVersion',
          'expectedReplacementVersion',
          'reason',
        ].includes(k),
    ) ||
    v.expectedObsoleteVersion !== 1 ||
    v.expectedReplacementVersion !== 1 ||
    typeof v.reason !== 'string' ||
    !v.reason.trim() ||
    v.reason.length > 4000 ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v.reason)
  )
    throw new AssertionInputError();
  return {
    replacementClaimId: lifecycleIdentifier(v.replacementClaimId),
    expectedObsoleteVersion: 1,
    expectedReplacementVersion: 1,
    reason: v.reason,
  };
}
/** Domain transition shared by the protected owner route and trusted operator tooling.
 * The authorization predicate is constructed by those boundaries, never by request data. */
export async function recordSupersession(
  database: IdentityDatabase,
  workspaceId: string,
  obsoleteId: string,
  input: SupersessionInput,
  requestKey: string,
  actorId: string,
  authorization: { sql: string; bindings: readonly (string | number)[] },
  executionContext: 'owner_access' | 'operator',
  authorizationReference: string,
) {
  lifecycleIdentifier(workspaceId);
  lifecycleIdentifier(obsoleteId);
  lifecycleIdentifier(requestKey);
  lifecycleIdentifier(actorId);
  input = validateSupersession(input);
  if (obsoleteId === input.replacementClaimId) throw new ReviewConflict();
  const fingerprint = Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify({ obsoleteId, input, actorId, executionContext, authorizationReference }),
        ),
      ),
    ),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
  async function replay() {
    const event = await database
      .prepare(
        'SELECT event_id,obsolete_claim_id,replacement_claim_id,replacement_proposal_id,replacement_review_id,reason,execution_context,authorization_reference,authorizing_owner_actor_id,recorded_at,fingerprint FROM thingamajob_claim_supersessions WHERE workspace_id=? AND request_key=?',
      )
      .bind(workspaceId, requestKey)
      .first<Record<string, unknown>>();
    if (!event) return null;
    if (event.fingerprint !== fingerprint) throw new ReviewConflict();
    const { fingerprint: _privateFingerprint, ...safe } = event;
    return safe;
  }
  const prior = await replay();
  if (prior) return { transition: prior, replayed: true };
  // Deny missing/foreign IDs without revealing which target exists.
  for (const id of [obsoleteId, input.replacementClaimId]) {
    if (
      !(await database
        .prepare('SELECT claim_id FROM thingamajob_claims WHERE workspace_id=? AND claim_id=?')
        .bind(workspaceId, id)
        .first())
    )
      throw new AccessDenied();
  }
  const eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_claim_supersessions
      (workspace_id,obsolete_claim_id,event_id,replacement_claim_id,replacement_proposal_id,replacement_review_id,
       authorizing_owner_actor_id,execution_context,authorization_reference,reason,request_key,fingerprint,expected_obsolete_version,expected_replacement_version)
      SELECT o.workspace_id,o.claim_id,?,r.claim_id,r.proposal_id,r.review_id,?,?,?,?,?,?,?,?
      FROM thingamajob_active_claims o JOIN thingamajob_active_claims r ON r.workspace_id=o.workspace_id
      JOIN thingamajob_reviews review ON review.workspace_id=r.workspace_id AND review.review_id=r.review_id
        AND review.proposal_id=r.proposal_id AND review.decision=r.disposition
      WHERE o.workspace_id=? AND o.claim_id=? AND r.claim_id=? AND o.version=? AND r.version=?
        AND o.claim_id<>r.claim_id AND r.disposition IN ('accepted','corrected') AND ${authorization.sql}`,
        )
        .bind(
          eventId,
          actorId,
          executionContext,
          authorizationReference,
          input.reason,
          requestKey,
          fingerprint,
          input.expectedObsoleteVersion,
          input.expectedReplacementVersion,
          workspaceId,
          obsoleteId,
          input.replacementClaimId,
          input.expectedObsoleteVersion,
          input.expectedReplacementVersion,
          ...authorization.bindings,
        ),
    ]);
  } catch {
    const winner = await replay();
    if (winner) return { transition: winner, replayed: true };
    for (const id of [obsoleteId, input.replacementClaimId]) {
      if (
        !(await database
          .prepare(
            'SELECT claim_id FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id=?',
          )
          .bind(workspaceId, id)
          .first())
      )
        throw new ReviewConflict();
    }
    throw new Error('Supersession unavailable');
  }
  const saved = await replay();
  if (!saved) throw new ReviewConflict();
  return { transition: saved, replayed: false };
}
export async function supersedeClaim(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  obsoleteId: string,
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
    throw new AssertionInputError();
  let input: SupersessionInput;
  try {
    input = validateSupersession(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 32_000)),
      ),
    );
  } catch {
    throw new AssertionInputError();
  }
  const result = await recordSupersession(
    database,
    scope.workspaceId,
    obsoleteId,
    input,
    lifecycleIdentifier(request.headers.get('Idempotency-Key')),
    scope.actorId,
    authorization,
    'owner_access',
    '',
  );
  await recheckWorkspace(scope);
  return result;
}
