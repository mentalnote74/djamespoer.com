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
      FROM thingamajob_claims c WHERE c.workspace_id=p.workspace_id AND c.proposal_id=p.proposal_id) AS claim_json,
    (SELECT json_group_array(json_object('version',version,'operation',operation,'statement',statement,'recordedAt',recorded_at))
      FROM (SELECT h.version,h.operation,h.statement,h.recorded_at FROM thingamajob_assertion_history h
        WHERE h.workspace_id=p.workspace_id AND h.proposal_id=p.proposal_id ORDER BY h.version)) AS history_json
    FROM thingamajob_proposals p WHERE p.workspace_id=? AND p.proposal_id=?`,
    )
    .bind(scope.workspaceId, id)
    .first<
      Proposal & { references_json: string; claim_json: string | null; history_json: string }
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
    evidence: JSON.parse(row.references_json) as unknown,
    claim: row.claim_json ? (JSON.parse(row.claim_json) as unknown) : null,
    history: JSON.parse(row.history_json) as unknown,
  };
}

export async function createProposal(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownLink?: { unknownId: string; answerId: string; expectedVersion: number },
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  const input = object(await payload(request), ['statement', 'proposerAttribution', 'evidence']);
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
  const hash = await fingerprint({ statement, attribution, evidence, unknownLink });
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
  const id = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_proposals(workspace_id,proposal_id,request_key,fingerprint,statement,proposer_attribution,proposer_actor_id)
        SELECT ?,?,?,?,?,?,? WHERE ${authorization.sql}`,
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
        ),
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
  const reviewId = crypto.randomUUID(),
    claimId = crypto.randomUUID();
  const resulting = decision === 'corrected' ? corrected : original.statement;
  try {
    await database.batch([
      database
        .prepare(
          `UPDATE thingamajob_proposals SET current_version=2,disposition=?,final_review_id=?
        WHERE workspace_id=? AND proposal_id=? AND current_version=? AND disposition='proposed' AND ${authorization.sql}`,
        )
        .bind(decision, reviewId, scope.workspaceId, id, expected, ...authorization.bindings),
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
    throw new Error('Review unavailable');
  }
  return { ...(await getProposal(database, scope, id)), replayed: false };
}
