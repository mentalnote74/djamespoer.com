import { baselineSummary } from './baseline-service.ts';
import { AccessDenied } from './access-identity.ts';
import { mutationAuthorization, recheckWorkspace } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { boundedBytes } from './evidence-validation.ts';
import { evidenceMetadata } from './evidence-service.ts';
import { loadOriginal } from './original-storage.ts';
import type { OriginalBucket } from './original-storage.ts';
import { createProposal, AssertionInputError, ReviewConflict } from './assertion-service.ts';

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AssertionInputError();
  return value as RecordValue;
}
function words(value: unknown, max = 4000): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)
  )
    throw new AssertionInputError();
  return value;
}
function identifier(value: unknown): string {
  const text = words(value, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(text)) throw new AssertionInputError();
  return text;
}
async function hash(value: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(value))),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
}
type Candidate = {
  id: string;
  text: string;
  sourceKey: string;
  citations: { locationKey: string; quote: string }[];
};
type Source = {
  key: string;
  sourceId: string;
  sha256: string;
  units: { locationKey: string; text: string }[];
};

export async function getExtractionRun(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  runId: string,
) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  identifier(runId);
  const row = await database
    .prepare(
      `SELECT document_json,state,
    (SELECT json_group_array(json_object('candidateId',c.candidate_id,'proposalId',c.proposal_id,'reviewDisposition',p.disposition))
    FROM thingamajob_extraction_candidates c JOIN thingamajob_proposals p ON p.workspace_id=c.workspace_id AND p.proposal_id=c.proposal_id
    WHERE c.workspace_id=r.workspace_id AND c.run_id=r.run_id) items
    FROM thingamajob_extraction_runs r WHERE workspace_id=? AND run_id=?`,
    )
    .bind(scope.workspaceId, runId)
    .first<{ document_json: string; state: string; items: string }>();
  if (!row) throw new AccessDenied();
  await recheckWorkspace(scope);
  return {
    runId,
    state: row.state,
    baseline: await baselineSummary(database, scope, runId),
    document: JSON.parse(row.document_json) as unknown,
    proposals: JSON.parse(row.items) as unknown,
  };
}

/** Existing human JWT + fresh owner grant are mandatory. Import metadata grants no authority. */
export async function stageExtractionRun(
  request: Request,
  database: IdentityDatabase,
  bucket: OriginalBucket,
  scope: WorkspaceAccess,
  runId: string,
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  identifier(runId);
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json')
    throw new AssertionInputError();
  let input: RecordValue;
  try {
    input = record(
      JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await boundedBytes(request.body, 1_000_000),
        ),
      ),
    );
  } catch {
    throw new AssertionInputError();
  }
  if (
    Object.keys(input).some(
      (key) =>
        ![
          'extractionRunId',
          'baselineRunId',
          'modelActuallyUsed',
          'claims',
          'conflicts',
          'questions',
          'sources',
        ].includes(key),
    ) ||
    input.extractionRunId !== runId
  )
    throw new AssertionInputError();
  identifier(input.baselineRunId);
  words(input.modelActuallyUsed, 100);
  if (
    !Array.isArray(input.claims) ||
    !input.claims.length ||
    input.claims.length > 150 ||
    !Array.isArray(input.sources) ||
    !input.sources.length ||
    input.sources.length > 8 ||
    !Array.isArray(input.conflicts) ||
    !Array.isArray(input.questions)
  )
    throw new AssertionInputError();
  const sources: Source[] = input.sources.map((value) => {
    const source = record(value);
    if (
      Object.keys(source).some((k) => !['key', 'sourceId', 'sha256', 'units'].includes(k)) ||
      !Array.isArray(source.units) ||
      source.units.length > 300
    )
      throw new AssertionInputError();
    const units = source.units.map((value) => {
      const unit = record(value);
      return { locationKey: words(unit.locationKey, 200), text: words(unit.text, 100_000) };
    });
    if (new Set(units.map((u) => u.locationKey)).size !== units.length)
      throw new AssertionInputError();
    const sha256 = words(source.sha256, 64);
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new AssertionInputError();
    return { key: identifier(source.key), sourceId: identifier(source.sourceId), sha256, units };
  });
  if (
    new Set(sources.map((s) => s.key)).size !== sources.length ||
    new Set(sources.map((s) => s.sourceId)).size !== sources.length
  )
    throw new AssertionInputError();
  const claims: Candidate[] = input.claims.map((value) => {
    const claim = record(value);
    if (
      claim.extractionRunId !== runId ||
      claim.baselineRunId !== input.baselineRunId ||
      claim.modelActuallyUsed !== input.modelActuallyUsed ||
      claim.reviewState !== 'candidate-only' ||
      !Array.isArray(claim.citations) ||
      !claim.citations.length ||
      !Array.isArray(claim.uncertainties) ||
      !Array.isArray(claim.conflictIds) ||
      !['high', 'medium', 'low'].includes(String(claim.extractionConfidence))
    )
      throw new AssertionInputError();
    const sourceKey = identifier(claim.sourceKey);
    const source = sources.find((s) => s.key === sourceKey);
    if (!source) throw new AssertionInputError();
    const citations = claim.citations.map((value) => {
      const citation = record(value),
        locationKey = words(citation.locationKey, 200),
        quote = words(citation.quote, 100_000);
      if (!source.units.some((u) => u.locationKey === locationKey && u.text.includes(quote)))
        throw new AssertionInputError();
      return { locationKey, quote };
    });
    return { id: identifier(claim.id), text: words(claim.text), sourceKey, citations };
  });
  const ids = new Set(claims.map((c) => c.id));
  if (ids.size !== claims.length) throw new AssertionInputError();
  const conflictIds = new Set<string>();
  for (const value of input.conflicts) {
    const conflict = record(value),
      id = identifier(conflict.id);
    if (
      conflictIds.has(id) ||
      !Array.isArray(conflict.claimIds) ||
      conflict.claimIds.length < 2 ||
      conflict.claimIds.some((id) => typeof id !== 'string' || !ids.has(id))
    )
      throw new AssertionInputError();
    words(conflict.explanation);
    conflictIds.add(id);
  }
  for (const value of input.claims) {
    const claim = record(value);
    if (
      (claim.conflictIds as unknown[]).some((id) => typeof id !== 'string' || !conflictIds.has(id))
    )
      throw new AssertionInputError();
  }
  for (const value of input.questions) {
    const question = record(value);
    words(question.question);
    if (
      !Array.isArray(question.claimIds) ||
      question.claimIds.some((id) => typeof id !== 'string' || !ids.has(id))
    )
      throw new AssertionInputError();
  }
  // Validate every registered original and citation before any proposal/run write.
  for (const source of sources) {
    const metadata = await evidenceMetadata(database, scope, source.sourceId);
    if (metadata.sha256 !== source.sha256) throw new AccessDenied();
    const original = await loadOriginal(database, bucket, scope, source.sourceId);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(original.bytes);
    if (source.units.some((u) => !text.includes(u.text))) throw new AssertionInputError();
  }
  const serialized = JSON.stringify(input),
    fingerprint = await hash(new TextEncoder().encode(serialized));
  const existing = await database
    .prepare(
      'SELECT fingerprint FROM thingamajob_extraction_runs WHERE workspace_id=? AND run_id=?',
    )
    .bind(scope.workspaceId, runId)
    .first<{ fingerprint: string }>();
  if (existing && existing.fingerprint !== fingerprint) throw new ReviewConflict();
  if (!existing) {
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_extraction_runs(workspace_id,run_id,fingerprint,document_json,created_by,state)
      SELECT ?,?,?,?,?,'staging' WHERE ${authorization.sql}`,
        )
        .bind(
          scope.workspaceId,
          runId,
          fingerprint,
          serialized,
          scope.actorId,
          ...authorization.bindings,
        ),
    ]);
  }
  await getExtractionRun(database, scope, runId);
  const linked = await database
    .prepare(
      'SELECT json_group_array(candidate_id) ids FROM thingamajob_extraction_candidates WHERE workspace_id=? AND run_id=?',
    )
    .bind(scope.workspaceId, runId)
    .first<{ ids: string }>();
  const completed = new Set(JSON.parse(linked?.ids ?? '[]') as string[]);
  // One existing atomic proposal transaction per candidate. Interrupted runs remain staging;
  // deterministic request keys replay exact proposals and preserve already completed decisions.
  // Bounded continuation avoids exceeding Worker/D1 request budgets on large runs.
  for (const claim of claims.filter((c) => !completed.has(c.id)).slice(0, 5)) {
    const source = sources.find((s) => s.key === claim.sourceKey)!;
    const locator = `run:${runId}; candidate:${claim.id}; ${claim.citations[0].locationKey}`;
    const proposal = await createProposal(
      new Request('https://staging.internal/assertions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `extract-${await hash(new TextEncoder().encode(`${runId}:${claim.id}`))}`,
        },
        body: JSON.stringify({
          statement: claim.text,
          proposerAttribution: `Model-extracted candidate; ${String(input.modelActuallyUsed)}; run ${runId}`,
          evidence: [{ sourceId: source.sourceId, locator }],
        }),
      }),
      database,
      scope,
    );
    await database.batch([
      database
        .prepare(
          `INSERT INTO thingamajob_extraction_candidates(workspace_id,run_id,candidate_id,proposal_id)
      SELECT ?,?,?,? WHERE ${authorization.sql} ON CONFLICT(workspace_id,run_id,candidate_id) DO NOTHING`,
        )
        .bind(scope.workspaceId, runId, claim.id, proposal.proposalId, ...authorization.bindings),
    ]);
  }
  await database.batch([
    database
      .prepare(
        `UPDATE thingamajob_extraction_runs SET state='staged' WHERE workspace_id=? AND run_id=?
    AND (SELECT count(*) FROM thingamajob_extraction_candidates WHERE workspace_id=? AND run_id=?)=? AND ${authorization.sql}`,
      )
      .bind(
        scope.workspaceId,
        runId,
        scope.workspaceId,
        runId,
        claims.length,
        ...authorization.bindings,
      ),
  ]);
  return getExtractionRun(database, scope, runId);
}
