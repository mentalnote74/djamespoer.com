import { AccessDenied } from './access-identity.ts';
import { mutationAuthorization, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { evidenceMetadata } from './evidence-service.ts';
import { boundedBytes } from './evidence-validation.ts';

export class AssertionInputError extends Error {
  constructor() {
    super('Invalid assertion input');
  }
}
export class ReviewConflict extends Error {
  constructor() {
    super('Review conflict');
  }
}
type Decision = 'accepted' | 'rejected' | 'corrected';
type Proposal = {
  proposal_id: string;
  statement: string;
  proposer_attribution: string;
  original_version: number;
  current_version: number;
  disposition: string;
  fingerprint: string;
};
function identifier(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new AssertionInputError();
  return value;
}
function words(value: unknown, limit: number, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > limit ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) ||
    (required && !value.trim())
  )
    throw new AssertionInputError();
  return value;
}
function object(value: unknown, allowed: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AssertionInputError();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new AssertionInputError();
  return record;
}
async function payload(request: Request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
    throw new AssertionInputError();
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 32_000)),
    ) as unknown;
  } catch {
    throw new AssertionInputError();
  }
}
async function fingerprint(value: unknown) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
}
async function proposal(database: IdentityDatabase, scope: WorkspaceAccess, id: string) {
  await recheckWorkspace(scope);
  const row = await database
    .prepare(
      `SELECT proposal_id,statement,proposer_attribution,original_version,current_version,disposition,fingerprint
    FROM thingamajob_proposals WHERE workspace_id=? AND proposal_id=?`,
    )
    .bind(scope.workspaceId, id)
    .first<Proposal>();
  if (!row) throw new AccessDenied();
  return row;
}
export async function getProposal(database: IdentityDatabase, scope: WorkspaceAccess, id: string) {
  await recheckWorkspace(scope);
  identifier(id);
  // One D1 statement: disposition/claim/history reflect one read snapshot.
  const row = await database
    .prepare(
      `SELECT p.proposal_id,p.statement,p.proposer_attribution,p.original_version,p.current_version,p.disposition,p.fingerprint,
    (SELECT json_group_array(json_object('sourceId',s.source_id,'locator',s.locator)) FROM thingamajob_proposal_sources s
      WHERE s.workspace_id=p.workspace_id AND s.proposal_id=p.proposal_id) AS references_json,
    (SELECT json_object('claimId',c.claim_id,'statement',c.statement,'version',c.version,'reviewDisposition',c.disposition)
      FROM thingamajob_active_claims c WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id) AS claim_json,
    (SELECT json_object('claimId',c.claim_id,'statement',c.statement,'reviewDisposition',c.disposition,'lifecycleState','superseded')
      FROM thingamajob_claims c JOIN thingamajob_claim_supersessions s ON s.workspace_id=c.workspace_id AND s.obsolete_claim_id=c.claim_id
      WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id) AS historical_claim_json,
    (SELECT json_object('eventId',s.event_id,'replacementClaimId',s.replacement_claim_id,'replacementProposalId',s.replacement_proposal_id,
      'replacementReviewId',s.replacement_review_id,'reason',s.reason,'recordedAt',s.recorded_at,'executionContext',s.execution_context,
      'authorizingOwnerActorId',s.authorizing_owner_actor_id,'authorizationReference',s.authorization_reference)
      FROM thingamajob_claim_supersessions s JOIN thingamajob_claims c ON c.workspace_id=s.workspace_id AND c.claim_id=s.obsolete_claim_id
      WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id) AS supersession_json,
    (SELECT json_group_array(json_object('obsoleteClaimId',s.obsolete_claim_id,'obsoleteProposalId',old.proposal_id,'eventId',s.event_id,'reason',s.reason,'recordedAt',s.recorded_at)) FROM thingamajob_claim_supersessions s JOIN thingamajob_claims old ON old.workspace_id=s.workspace_id AND old.claim_id=s.obsolete_claim_id JOIN thingamajob_claims replacement ON replacement.workspace_id=s.workspace_id AND replacement.claim_id=s.replacement_claim_id WHERE replacement.workspace_id=p.workspace_id AND replacement.proposal_id=p.proposal_id) AS supersedes_json,
    (SELECT json_object('obsoleteClaimId',obsolete_claim_id,'reason',reason) FROM thingamajob_claim_correction_proposals WHERE workspace_id=p.workspace_id AND proposal_id=p.proposal_id) AS correction_json,
    (SELECT json_group_array(json_object('version',version,'operation',operation,'statement',statement,'recordedAt',recorded_at))
      FROM (SELECT h.version,h.operation,h.statement,h.recorded_at FROM thingamajob_assertion_history h
        WHERE h.workspace_id=p.workspace_id AND h.proposal_id=p.proposal_id ORDER BY h.version)) AS history_json
    FROM thingamajob_proposals p WHERE p.workspace_id=? AND p.proposal_id=?`,
    )
    .bind(scope.workspaceId, id)
    .first<
      Proposal & {
        references_json: string;
        claim_json: string | null;
        supersedes_json: string;
        correction_json: string | null;
        historical_claim_json: string | null;
        supersession_json: string | null;
        history_json: string;
      }
    >();
  if (!row) throw new AccessDenied();
  await recheckWorkspace(scope);
  return {
    proposalId: row.proposal_id,
    statement: row.statement,
    proposerAttribution: row.proposer_attribution,
    originalVersion: row.original_version,
    version: row.current_version,
    reviewDisposition: row.disposition,
    supersedes: JSON.parse(row.supersedes_json) as unknown,
    ...(row.correction_json ? { correctionOf: JSON.parse(row.correction_json) as unknown } : {}),
    evidence: JSON.parse(row.references_json) as unknown,
    claim: row.claim_json ? (JSON.parse(row.claim_json) as unknown) : null,
    ...(row.historical_claim_json
      ? {
          historicalClaim: JSON.parse(row.historical_claim_json) as unknown,
          supersession: JSON.parse(row.supersession_json!) as unknown,
        }
      : {}),
    history: JSON.parse(row.history_json) as unknown,
  };
}

export async function createProposal(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownLink?: { unknownId: string; answerId: string; expectedVersion: number },
  correctionTarget?: string,
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  const input = object(await payload(request), [
    'statement',
    'proposerAttribution',
    'evidence',
    ...(correctionTarget ? ['correctionReason'] : []),
  ]);
  const correctionReason = correctionTarget ? words(input.correctionReason, 4000) : undefined;
  if (correctionTarget) identifier(correctionTarget);
  const statement = words(input.statement, 4000),
    attribution = words(input.proposerAttribution, 1000);
  if (!Array.isArray(input.evidence) || input.evidence.length < 1 || input.evidence.length > 8)
    throw new AssertionInputError();
  const evidence = input.evidence
    .map((value) => {
      const item = object(value, ['sourceId', 'locator']);
      return {
        sourceId: identifier(item.sourceId),
        locator: words(item.locator ?? '', 2000, false),
      };
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  if (new Set(evidence.map((e) => e.sourceId)).size !== evidence.length)
    throw new AssertionInputError();
  for (const item of evidence) await evidenceMetadata(database, scope, item.sourceId);
  const requestKey = identifier(request.headers.get('Idempotency-Key'));
  const hash = await fingerprint({
    statement,
    attribution,
    evidence,
    unknownLink,
    ...(correctionTarget ? { correctionTarget, correctionReason } : {}),
  });
  async function replay() {
    await recheckWorkspace(scope);
    const existing = await database
      .prepare(
        'SELECT proposal_id,fingerprint FROM thingamajob_proposals WHERE workspace_id=? AND request_key=?',
      )
      .bind(scope.workspaceId, requestKey)
      .first<{ proposal_id: string; fingerprint: string }>();
    if (!existing) return null;
    if (existing.fingerprint !== hash) throw new ReviewConflict();
    return { ...(await getProposal(database, scope, existing.proposal_id)), replayed: true };
  }
  const existing = await replay();
  if (existing) return existing;
  if (
    correctionTarget &&
    !(await database
      .prepare('SELECT claim_id FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id=?')
      .bind(scope.workspaceId, correctionTarget)
      .first())
  )
    throw new AccessDenied();
  const id = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_proposals(workspace_id,proposal_id,request_key,fingerprint,statement,proposer_attribution,proposer_actor_id)
        SELECT ?,?,?,?,?,?,? WHERE ${authorization.sql} ${correctionTarget ? 'AND EXISTS (SELECT 1 FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id=?)' : ''}`,
        )
        .bind(
          scope.workspaceId,
          id,
          requestKey,
          hash,
          statement,
          attribution,
          scope.actorId,
          ...authorization.bindings,
          ...(correctionTarget ? [scope.workspaceId, correctionTarget] : []),
        ),
      ...(correctionTarget
        ? [
            database
              .prepare('INSERT INTO thingamajob_claim_correction_proposals VALUES (?,?,?,?)')
              .bind(scope.workspaceId, id, correctionTarget, correctionReason!),
          ]
        : []),
      ...evidence.map((e) =>
        database
          .prepare('INSERT INTO thingamajob_proposal_sources VALUES (?,?,?,?)')
          .bind(scope.workspaceId, id, e.sourceId, e.locator),
      ),
      database
        .prepare(
          `INSERT INTO thingamajob_assertion_history(workspace_id,proposal_id,version,operation,actor_id,review_id,statement)
        VALUES (?,?,1,'proposed',?,NULL,?)`,
        )
        .bind(scope.workspaceId, id, scope.actorId, statement),
      ...(unknownLink
        ? [
            database
              .prepare(
                `UPDATE thingamajob_unknowns SET version=version+1,last_event_id=?
          WHERE workspace_id=? AND unknown_id=? AND state='open' AND version=? AND ${authorization.sql}`,
              )
              .bind(
                eventId,
                scope.workspaceId,
                unknownLink.unknownId,
                unknownLink.expectedVersion,
                ...authorization.bindings,
              ),
            database
              .prepare(
                `INSERT INTO thingamajob_unknown_events(workspace_id,unknown_id,event_id,version,operation,request_key,fingerprint,actor_id,answer_id,proposal_id)
          SELECT workspace_id,unknown_id,?,version,'proposal-linked',?,?,?,?,? FROM thingamajob_unknowns
          WHERE workspace_id=? AND unknown_id=? AND last_event_id=? AND state='open'`,
              )
              .bind(
                eventId,
                requestKey,
                hash,
                scope.actorId,
                unknownLink.answerId,
                id,
                scope.workspaceId,
                unknownLink.unknownId,
                eventId,
              ),
            database
              .prepare('INSERT INTO thingamajob_unknown_proposals VALUES (?,?,?,?,?)')
              .bind(scope.workspaceId, unknownLink.unknownId, unknownLink.answerId, id, eventId),
          ]
        : []),
    ]);
  } catch {
    const winner = await replay();
    if (winner) return winner;
    throw new Error('Proposal unavailable');
  }
  return { ...(await getProposal(database, scope, id)), replayed: false };
}

export async function reviewProposal(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  id: string,
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  const original = await proposal(database, scope, identifier(id));
  const input = object(await payload(request), [
    'decision',
    'expectedVersion',
    'correctedStatement',
  ]);
  if (
    !['accepted', 'rejected', 'corrected'].includes(String(input.decision)) ||
    !Number.isSafeInteger(input.expectedVersion)
  )
    throw new AssertionInputError();
  const decision = input.decision as Decision,
    expected = input.expectedVersion as number;
  const corrected = decision === 'corrected' ? words(input.correctedStatement, 4000) : '';
  if (decision !== 'corrected' && input.correctedStatement !== undefined)
    throw new AssertionInputError();
  const requestKey = identifier(request.headers.get('Idempotency-Key'));
  const hash = await fingerprint({
    proposalId: id,
    decision,
    expectedVersion: expected,
    correctedStatement: corrected,
  });
  async function replay() {
    await recheckWorkspace(scope);
    const existing = await database
      .prepare('SELECT fingerprint FROM thingamajob_reviews WHERE workspace_id=? AND request_key=?')
      .bind(scope.workspaceId, requestKey)
      .first<{ fingerprint: string }>();
    if (!existing) return null;
    if (existing.fingerprint !== hash) throw new ReviewConflict();
    return { ...(await getProposal(database, scope, id)), replayed: true };
  }
  const existing = await replay();
  if (existing) return existing;
  if (original.current_version !== expected || original.disposition !== 'proposed')
    throw new ReviewConflict();
  const correction = await database
    .prepare(
      'SELECT obsolete_claim_id,reason FROM thingamajob_claim_correction_proposals WHERE workspace_id=? AND proposal_id=?',
    )
    .bind(scope.workspaceId, id)
    .first<{ obsolete_claim_id: string; reason: string }>();
  const reviewId = crypto.randomUUID(),
    claimId = crypto.randomUUID();
  const resulting = decision === 'corrected' ? corrected : original.statement;
  try {
    await database.batch([
      database
        .prepare(
          `UPDATE thingamajob_proposals SET current_version=2,disposition=?,final_review_id=?
        WHERE workspace_id=? AND proposal_id=? AND current_version=? AND disposition='proposed' AND ${authorization.sql} ${correction && decision !== 'rejected' ? 'AND EXISTS (SELECT 1 FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id=?)' : ''}`,
        )
        .bind(
          decision,
          reviewId,
          scope.workspaceId,
          id,
          expected,
          ...authorization.bindings,
          ...(correction && decision !== 'rejected'
            ? [scope.workspaceId, correction.obsolete_claim_id]
            : []),
        ),
      // FK to the exact final state/review nonce aborts all dependents if guarded UPDATE changed nothing.
      database
        .prepare(
          `INSERT INTO thingamajob_reviews(workspace_id,review_id,proposal_id,request_key,fingerprint,owner_actor_id,
        expected_version,resulting_version,decision,corrected_statement) VALUES (?,?,?,?,?,?,?,2,?,?)`,
        )
        .bind(
          scope.workspaceId,
          reviewId,
          id,
          requestKey,
          hash,
          scope.actorId,
          expected,
          decision,
          corrected,
        ),
      ...(decision !== 'rejected'
        ? [
            database
              .prepare(
                `INSERT INTO thingamajob_claims(workspace_id,claim_id,proposal_id,review_id,statement,version,disposition)
          VALUES (?,?,?,?,?,1,?)`,
              )
              .bind(scope.workspaceId, claimId, id, reviewId, resulting, decision),
            database
              .prepare(
                `INSERT INTO thingamajob_claim_sources SELECT workspace_id,?,source_id,locator
          FROM thingamajob_proposal_sources WHERE workspace_id=? AND proposal_id=?`,
              )
              .bind(claimId, scope.workspaceId, id),
          ]
        : []),
      ...(correction && decision !== 'rejected'
        ? [
            database
              .prepare(
                `INSERT INTO thingamajob_claim_supersessions (workspace_id,obsolete_claim_id,event_id,replacement_claim_id,replacement_proposal_id,replacement_review_id,
          authorizing_owner_actor_id,execution_context,authorization_reference,reason,request_key,fingerprint,expected_obsolete_version,expected_replacement_version)
        VALUES (?,?,?,?,?,?,?,'owner_access','',?,?,?,1,1)`,
              )
              .bind(
                scope.workspaceId,
                correction.obsolete_claim_id,
                crypto.randomUUID(),
                claimId,
                id,
                reviewId,
                scope.actorId,
                correction.reason,
                reviewId,
                hash,
              ),
          ]
        : []),
      database
        .prepare(
          `INSERT INTO thingamajob_assertion_history(workspace_id,proposal_id,version,operation,actor_id,review_id,statement)
        VALUES (?,?,2,?,?,?,?)`,
        )
        .bind(scope.workspaceId, id, decision, scope.actorId, reviewId, resulting),
    ]);
  } catch {
    const winner = await replay();
    if (winner) return winner;
    const current = await proposal(database, scope, id);
    if (current.current_version !== expected || current.disposition !== 'proposed')
      throw new ReviewConflict();
    if (
      correction &&
      decision !== 'rejected' &&
      !(await database
        .prepare(
          'SELECT claim_id FROM thingamajob_active_claims WHERE workspace_id=? AND claim_id=?',
        )
        .bind(scope.workspaceId, correction.obsolete_claim_id)
        .first())
    )
      throw new ReviewConflict();
    throw new Error('Review unavailable');
  }
  return { ...(await getProposal(database, scope, id)), replayed: false };
}
