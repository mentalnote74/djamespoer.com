import { AccessDenied } from './access-identity.ts';
import { mutationAuthorization, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { boundedBytes } from './evidence-validation.ts';
import { evidenceMetadata } from './evidence-service.ts';
import { createProposal } from './assertion-service.ts';

export class UnknownInputError extends Error {
  constructor() {
    super('Invalid UNKNOWN input');
  }
}
export class UnknownConflict extends Error {
  constructor() {
    super('UNKNOWN conflict');
  }
}
type UnknownRow = {
  unknown_id: string;
  question: string;
  reason: string;
  context: string;
  version: number;
  state: string;
};
function id(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    throw new UnknownInputError();
  return value;
}
function words(value: unknown, max: number, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) ||
    (required && !value.trim())
  )
    throw new UnknownInputError();
  return value;
}
function object(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new UnknownInputError();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) throw new UnknownInputError();
  return record;
}
function version(value: unknown) {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new UnknownInputError();
  return value as number;
}
async function payload(request: Request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
    throw new UnknownInputError();
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 32_000)),
    ) as unknown;
  } catch {
    throw new UnknownInputError();
  }
}
async function fingerprint(value: unknown) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
}
async function unknown(database: IdentityDatabase, scope: WorkspaceAccess, unknownId: string) {
  await recheckWorkspace(scope);
  const row = await database
    .prepare(
      'SELECT unknown_id,question,reason,context,version,state FROM thingamajob_unknowns WHERE workspace_id=? AND unknown_id=?',
    )
    .bind(scope.workspaceId, id(unknownId))
    .first<UnknownRow>();
  if (!row) throw new AccessDenied();
  return row;
}
function requireOpen(row: UnknownRow, expected: number) {
  if (row.state !== 'open' || row.version !== expected) throw new UnknownConflict();
}
async function replay(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  operation: string,
  key: string,
  hash: string,
) {
  await recheckWorkspace(scope);
  const event = await database
    .prepare(
      'SELECT unknown_id,fingerprint FROM thingamajob_unknown_events WHERE workspace_id=? AND operation=? AND request_key=?',
    )
    .bind(scope.workspaceId, operation, key)
    .first<{ unknown_id: string; fingerprint: string }>();
  if (!event) return null;
  if (event.fingerprint !== hash) throw new UnknownConflict();
  return { ...(await getUnknown(database, scope, event.unknown_id)), replayed: true };
}

export async function getUnknown(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownId: string,
) {
  await recheckWorkspace(scope);
  const row = await database
    .prepare(
      `SELECT u.unknown_id,u.question,u.reason,u.context,u.version,u.state,
  (SELECT json_group_array(json_object('answerId',a.answer_id,'answer',a.answer,'attribution',a.attribution,
    'evidence',json((SELECT json_group_array(json_object('sourceId',s.source_id,'locator',s.locator)) FROM thingamajob_unknown_answer_sources s WHERE s.workspace_id=a.workspace_id AND s.answer_id=a.answer_id))))
    FROM (SELECT a.* FROM thingamajob_unknown_answers a JOIN thingamajob_unknown_events e
      ON e.workspace_id=a.workspace_id AND e.event_id=a.event_id
      WHERE a.workspace_id=u.workspace_id AND a.unknown_id=u.unknown_id ORDER BY e.version) a) AS answers_json,
  (SELECT json_group_array(json_object('answerId',l.answer_id,'proposalId',l.proposal_id,'statement',p.statement,'reviewDisposition',p.disposition,
    'reviewHistory',json((SELECT json_group_array(json_object('version',version,'operation',operation,'statement',statement,'recordedAt',recorded_at)) FROM (SELECT h.version,h.operation,h.statement,h.recorded_at FROM thingamajob_assertion_history h WHERE h.workspace_id=l.workspace_id AND h.proposal_id=l.proposal_id ORDER BY h.version))),
    'claimId',(SELECT c.claim_id FROM thingamajob_claims c WHERE c.workspace_id=l.workspace_id AND c.proposal_id=l.proposal_id)))
    FROM (SELECT l.* FROM thingamajob_unknown_proposals l JOIN thingamajob_unknown_events e
      ON e.workspace_id=l.workspace_id AND e.event_id=l.event_id
      WHERE l.workspace_id=u.workspace_id AND l.unknown_id=u.unknown_id ORDER BY e.version) l
    JOIN thingamajob_proposals p ON p.workspace_id=l.workspace_id AND p.proposal_id=l.proposal_id) AS proposals_json,
  (SELECT json_object('claimId',r.claim_id,'answerId',r.answer_id,'proposalId',r.proposal_id,'explanation',r.explanation,'expectedVersion',r.expected_version,'version',r.resulting_version)
    FROM thingamajob_unknown_resolutions r WHERE r.workspace_id=u.workspace_id AND r.unknown_id=u.unknown_id) AS resolution_json,
  (SELECT json_group_array(json_object('version',version,'operation',operation,'answerId',answer_id,'proposalId',proposal_id,'claimId',claim_id,'recordedAt',recorded_at))
    FROM (SELECT * FROM thingamajob_unknown_events e WHERE e.workspace_id=u.workspace_id AND e.unknown_id=u.unknown_id ORDER BY version)) AS history_json
  FROM thingamajob_unknowns u WHERE u.workspace_id=? AND u.unknown_id=?`,
    )
    .bind(scope.workspaceId, id(unknownId))
    .first<
      UnknownRow & {
        answers_json: string;
        proposals_json: string;
        resolution_json: string | null;
        history_json: string;
      }
    >();
  if (!row) throw new AccessDenied();
  await recheckWorkspace(scope);
  return {
    unknownId: row.unknown_id,
    question: row.question,
    reason: row.reason,
    context: row.context,
    version: row.version,
    state: row.state,
    answers: JSON.parse(row.answers_json) as unknown,
    proposals: JSON.parse(row.proposals_json) as unknown,
    resolution: row.resolution_json ? (JSON.parse(row.resolution_json) as unknown) : null,
    history: JSON.parse(row.history_json) as unknown,
  };
}
export async function listUnknowns(database: IdentityDatabase, scope: WorkspaceAccess) {
  await recheckWorkspace(scope);
  const row = await database
    .prepare(
      `SELECT json_group_array(json_object('unknownId',unknown_id,'question',question,'version',version,'state',state)) AS items
  FROM (SELECT u.unknown_id,u.question,u.version,u.state FROM thingamajob_unknowns u JOIN thingamajob_unknown_events e
   ON e.workspace_id=u.workspace_id AND e.event_id=u.last_event_id WHERE u.workspace_id=? ORDER BY e.recorded_at DESC,u.unknown_id LIMIT 100)`,
    )
    .bind(scope.workspaceId)
    .first<{ items: string }>();
  await recheckWorkspace(scope);
  return { unknowns: JSON.parse(row?.items ?? '[]') as unknown };
}
export async function createUnknown(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
) {
  await recheckWorkspace(scope);
  const auth = mutationAuthorization(scope, 'owner');
  const input = object(await payload(request), ['question', 'reason', 'context']);
  const question = words(input.question, 3000),
    reason = words(input.reason, 1000),
    context = words(input.context ?? '', 2000, false);
  const key = id(request.headers.get('Idempotency-Key')),
    hash = await fingerprint({ question, reason, context });
  const existing = await replay(database, scope, 'opened', key, hash);
  if (existing) return existing;
  const unknownId = crypto.randomUUID(),
    eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_unknowns(workspace_id,unknown_id,question,reason,context,version,state,last_event_id)
    SELECT ?,?,?,?,?,1,'open',? WHERE ${auth.sql}`,
        )
        .bind(scope.workspaceId, unknownId, question, reason, context, eventId, ...auth.bindings),
      database
        .prepare(
          `INSERT INTO thingamajob_unknown_events(workspace_id,unknown_id,event_id,version,operation,request_key,fingerprint,actor_id)
    VALUES (?,?,?,1,'opened',?,?,?)`,
        )
        .bind(scope.workspaceId, unknownId, eventId, key, hash, scope.actorId),
    ]);
  } catch {
    const winner = await replay(database, scope, 'opened', key, hash);
    if (winner) return winner;
    throw new Error('UNKNOWN unavailable');
  }
  return { ...(await getUnknown(database, scope, unknownId)), replayed: false };
}
export async function answerUnknown(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownId: string,
) {
  await recheckWorkspace(scope);
  const auth = mutationAuthorization(scope, 'owner'),
    row = await unknown(database, scope, unknownId);
  const input = object(await payload(request), [
    'answer',
    'attribution',
    'evidence',
    'expectedVersion',
  ]);
  const answer = words(input.answer, 4000),
    attribution = words(input.attribution, 1000),
    expected = version(input.expectedVersion);
  const sources = input.evidence ?? [];
  if (!Array.isArray(sources) || sources.length > 8) throw new UnknownInputError();
  const evidence = sources
    .map((value) => {
      const s = object(value, ['sourceId', 'locator']);
      return { sourceId: id(s.sourceId), locator: words(s.locator ?? '', 2000, false) };
    })
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  if (new Set(evidence.map((s) => s.sourceId)).size !== evidence.length)
    throw new UnknownInputError();
  for (const source of evidence) await evidenceMetadata(database, scope, source.sourceId);
  const key = id(request.headers.get('Idempotency-Key')),
    hash = await fingerprint({ unknownId, answer, attribution, evidence, expected });
  const existing = await replay(database, scope, 'answered', key, hash);
  if (existing) return existing;
  requireOpen(row, expected);
  const answerId = crypto.randomUUID(),
    eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `UPDATE thingamajob_unknowns SET version=version+1,last_event_id=? WHERE workspace_id=? AND unknown_id=? AND state='open' AND version=? AND ${auth.sql}`,
        )
        .bind(eventId, scope.workspaceId, unknownId, expected, ...auth.bindings),
      database
        .prepare(
          `INSERT INTO thingamajob_unknown_events(workspace_id,unknown_id,event_id,version,operation,request_key,fingerprint,actor_id,answer_id)
    SELECT workspace_id,unknown_id,?,version,'answered',?,?,?,? FROM thingamajob_unknowns WHERE workspace_id=? AND unknown_id=? AND last_event_id=? AND state='open'`,
        )
        .bind(eventId, key, hash, scope.actorId, answerId, scope.workspaceId, unknownId, eventId),
      database
        .prepare('INSERT INTO thingamajob_unknown_answers VALUES (?,?,?,?,?,?)')
        .bind(scope.workspaceId, unknownId, answerId, eventId, answer, attribution),
      ...evidence.map((s) =>
        database
          .prepare('INSERT INTO thingamajob_unknown_answer_sources VALUES (?,?,?,?)')
          .bind(scope.workspaceId, answerId, s.sourceId, s.locator),
      ),
    ]);
  } catch {
    const winner = await replay(database, scope, 'answered', key, hash);
    if (winner) return winner;
    requireOpen(await unknown(database, scope, unknownId), expected);
    throw new Error('Answer unavailable');
  }
  return { ...(await getUnknown(database, scope, unknownId)), replayed: false };
}
export async function proposeUnknownAnswer(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownId: string,
  answerId: string,
) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  await unknown(database, scope, unknownId);
  const answer = await database
    .prepare(
      'SELECT answer_id FROM thingamajob_unknown_answers WHERE workspace_id=? AND unknown_id=? AND answer_id=?',
    )
    .bind(scope.workspaceId, unknownId, id(answerId))
    .first<{ answer_id: string }>();
  if (!answer) throw new AccessDenied();
  const sources = await database
    .prepare(
      `SELECT json_group_array(json_object('sourceId',source_id,'locator',locator)) AS items FROM thingamajob_unknown_answer_sources WHERE workspace_id=? AND answer_id=?`,
    )
    .bind(scope.workspaceId, answerId)
    .first<{ items: string }>();
  const evidence = JSON.parse(sources?.items ?? '[]') as unknown[];
  if (!evidence.length) throw new UnknownConflict();
  const input = object(await payload(request), [
    'statement',
    'proposerAttribution',
    'expectedVersion',
  ]);
  const expected = version(input.expectedVersion);
  const internal = new Request(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': id(request.headers.get('Idempotency-Key')),
    },
    body: JSON.stringify({
      statement: words(input.statement, 4000),
      proposerAttribution: words(input.proposerAttribution, 1000),
      evidence,
    }),
  });
  try {
    await createProposal(internal, database, scope, {
      unknownId,
      answerId,
      expectedVersion: expected,
    });
  } catch (error) {
    requireOpen(await unknown(database, scope, unknownId), expected);
    const linked = await database
      .prepare(
        'SELECT proposal_id FROM thingamajob_unknown_proposals WHERE workspace_id=? AND unknown_id=? AND answer_id=?',
      )
      .bind(scope.workspaceId, unknownId, answerId)
      .first();
    if (linked) throw new UnknownConflict();
    throw error;
  }
  return getUnknown(database, scope, unknownId);
}
export async function resolveUnknown(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  unknownId: string,
) {
  await recheckWorkspace(scope);
  const auth = mutationAuthorization(scope, 'owner'),
    row = await unknown(database, scope, unknownId);
  const input = object(await payload(request), ['claimId', 'explanation', 'expectedVersion']);
  const claimId = id(input.claimId),
    explanation = words(input.explanation, 4000),
    expected = version(input.expectedVersion);
  const key = id(request.headers.get('Idempotency-Key')),
    hash = await fingerprint({ unknownId, claimId, explanation, expected });
  const existing = await replay(database, scope, 'resolved', key, hash);
  if (existing) return existing;
  requireOpen(row, expected);
  const ownClaim = await database
    .prepare('SELECT claim_id FROM thingamajob_claims WHERE workspace_id=? AND claim_id=?')
    .bind(scope.workspaceId, claimId)
    .first();
  if (!ownClaim) throw new AccessDenied();
  const qualificationSql = `SELECT l.answer_id,l.proposal_id FROM thingamajob_unknown_proposals l JOIN thingamajob_claims c ON c.workspace_id=l.workspace_id AND c.proposal_id=l.proposal_id
    JOIN thingamajob_reviews r ON r.workspace_id=c.workspace_id AND r.review_id=c.review_id AND r.decision=c.disposition
    WHERE l.workspace_id=? AND l.unknown_id=? AND c.claim_id=? AND c.disposition IN ('accepted','corrected')`;
  const qualifying = await database
    .prepare(qualificationSql)
    .bind(scope.workspaceId, unknownId, claimId)
    .first<{ answer_id: string; proposal_id: string }>();
  if (!qualifying) throw new UnknownConflict();
  const resolutionId = crypto.randomUUID(),
    eventId = crypto.randomUUID();
  try {
    await database.batch([
      database
        .prepare(
          `UPDATE thingamajob_unknowns SET version=version+1,state='resolved',resolution_id=?,last_event_id=?
    WHERE workspace_id=? AND unknown_id=? AND version=? AND state='open' AND ${auth.sql} AND EXISTS (${qualificationSql})`,
        )
        .bind(
          resolutionId,
          eventId,
          scope.workspaceId,
          unknownId,
          expected,
          ...auth.bindings,
          scope.workspaceId,
          unknownId,
          claimId,
        ),
      database
        .prepare(
          `INSERT INTO thingamajob_unknown_events(workspace_id,unknown_id,event_id,version,operation,request_key,fingerprint,actor_id,answer_id,proposal_id,claim_id)
    SELECT workspace_id,unknown_id,?,version,'resolved',?,?,?,?,?,? FROM thingamajob_unknowns WHERE workspace_id=? AND unknown_id=? AND last_event_id=? AND state='resolved' AND resolution_id=?`,
        )
        .bind(
          eventId,
          key,
          hash,
          scope.actorId,
          qualifying.answer_id,
          qualifying.proposal_id,
          claimId,
          scope.workspaceId,
          unknownId,
          eventId,
          resolutionId,
        ),
      database
        .prepare('INSERT INTO thingamajob_unknown_resolutions VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(
          scope.workspaceId,
          unknownId,
          resolutionId,
          qualifying.answer_id,
          qualifying.proposal_id,
          claimId,
          eventId,
          explanation,
          expected,
          expected + 1,
        ),
    ]);
  } catch {
    const winner = await replay(database, scope, 'resolved', key, hash);
    if (winner) return winner;
    requireOpen(await unknown(database, scope, unknownId), expected);
    throw new Error('Resolution unavailable');
  }
  return { ...(await getUnknown(database, scope, unknownId)), replayed: false };
}
