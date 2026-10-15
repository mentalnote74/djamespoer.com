import { boundedBytes } from './evidence-validation.ts';
import { AccessDenied } from './access-identity.ts';
import { recheckWorkspace, mutationAuthorization } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { AssertionInputError, ReviewConflict, reviewProposal } from './assertion-service.ts';
async function titlePolicyAvailable(database: IdentityDatabase) {
  return !!(await database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='view' AND name='thingamajob_current_evaluations'",
    )
    .first());
}
async function sourceContexts(database: IdentityDatabase, scope: WorkspaceAccess, runId: string) {
  if (
    !(await database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='thingamajob_source_contexts'",
      )
      .first())
  )
    return [];
  const row = await database
    .prepare(
      "SELECT json_group_array(json_object('candidateId',s.candidate_id,'sourceId',s.source_id,'kind',s.kind,'display',s.display_text,'citations',json(s.citation_json),'documentDate',s.document_date,'dateBasis',s.date_basis,'policyVersion',s.policy_version,'ownerAnswer',json(a.response_json))) items FROM thingamajob_source_contexts s LEFT JOIN thingamajob_baseline_answers a ON a.workspace_id=s.workspace_id AND a.run_id=s.run_id AND a.issue_id=s.issue_id WHERE s.workspace_id=? AND s.run_id=?",
    )
    .bind(scope.workspaceId, runId)
    .first<{ items: string }>();
  return JSON.parse(row?.items ?? '[]') as unknown[];
}
export async function baselineAvailable(database: IdentityDatabase) {
  return !!(await database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='thingamajob_baseline_evaluations'",
    )
    .first());
}
export async function baselineSummary(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  runId: string,
) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  if (!(await baselineAvailable(database))) return undefined;
  const titles = await titlePolicyAvailable(database);
  const evaluations = titles
    ? 'thingamajob_current_evaluations'
    : 'thingamajob_baseline_evaluations';
  const issues = titles ? 'thingamajob_current_issues' : 'thingamajob_baseline_issues';
  const row = await database
    .prepare(
      `SELECT
 (SELECT json_group_array(json_object('candidateId',candidate_id,'category',category,'reasons',json(reasons_json),'policyVersion',policy_version,'recordedAt',recorded_at)) FROM ${evaluations} WHERE workspace_id=? AND run_id=?) evaluations,
 (SELECT json_group_array(json_object('id',i.issue_id,'question',i.question,'claimIds',json(i.candidate_ids_json),'answer',json(a.response_json),'answeredAt',a.recorded_at)) FROM ${issues} i LEFT JOIN thingamajob_baseline_answers a ON a.workspace_id=i.workspace_id AND a.run_id=i.run_id AND a.issue_id=i.issue_id WHERE i.workspace_id=? AND i.run_id=? ${titles ? "AND i.current_disposition='attention'" : ''}) issues`,
    )
    .bind(scope.workspaceId, runId, scope.workspaceId, runId)
    .first<{ evaluations: string; issues: string }>();
  await recheckWorkspace(scope);
  const result = {
    evaluations: JSON.parse(row?.evaluations ?? '[]') as unknown,
    sourceContexts: await sourceContexts(database, scope, runId),
    issues: JSON.parse(row?.issues ?? '[]') as unknown,
    ...(titles
      ? {
          titleHistory: await database
            .prepare(
              "SELECT json_group_array(json_object('issueId',issue_id,'question',question,'reason',reason,'policyVersion',policy_version)) items FROM thingamajob_current_issues WHERE workspace_id=? AND run_id=? AND current_disposition='informational'",
            )
            .bind(scope.workspaceId, runId)
            .first<{ items: string }>()
            .then((r) => JSON.parse(r?.items ?? '[]') as unknown),
          rolePresentations: await database
            .prepare(
              "SELECT json_group_array(json_object('candidateId',candidate_id,'roleKey',role_key,'sourceId',source_id,'presentedTitle',presented_title,'citation',json(citation_json),'associationBasis',association_basis,'canonicalTitle',canonical_title)) items FROM thingamajob_role_presentations WHERE workspace_id=? AND run_id=?",
            )
            .bind(scope.workspaceId, runId)
            .first<{ items: string }>()
            .then((r) => JSON.parse(r?.items ?? '[]') as unknown),
        }
      : {}),
  };
  await recheckWorkspace(scope);
  return result;
}
export async function baselineForProposal(
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  proposalId: string,
) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  if (!(await baselineAvailable(database))) return undefined;
  const evaluations = (await titlePolicyAvailable(database))
    ? 'thingamajob_current_evaluations'
    : 'thingamajob_baseline_evaluations';
  const row = await database
    .prepare(
      `SELECT e.run_id,e.candidate_id,e.category,e.policy_version,e.recorded_at,e.reasons_json,p.disposition FROM ${evaluations} e JOIN thingamajob_proposals p ON p.workspace_id=e.workspace_id AND p.proposal_id=e.proposal_id WHERE e.workspace_id=? AND e.proposal_id=?`,
    )
    .bind(scope.workspaceId, proposalId)
    .first<{
      run_id: string;
      candidate_id: string;
      category: string;
      policy_version: string;
      recorded_at: number;
      reasons_json: string;
      disposition: string;
    }>();
  if (!row) return undefined;
  const context = (
    (await sourceContexts(database, scope, row.run_id)) as { candidateId: string; kind: string }[]
  ).find((c) => c.candidateId === row.candidate_id);
  await recheckWorkspace(scope);
  return {
    runId: row.run_id,
    candidateId: row.candidate_id,
    category: row.category,
    canonicalUsage: context?.kind === 'duration_summary' ? 'source_presentation' : 'career_fact',
    policyVersion: row.policy_version,
    recordedAt: row.recorded_at,
    reasons: JSON.parse(row.reasons_json) as unknown,
    active: row.category === 'baseline' && row.disposition === 'proposed',
    transition: row.disposition === 'proposed' ? 'source_established' : 'replaced_by_owner_review',
  };
}
export async function activeBaseline(database: IdentityDatabase, scope: WorkspaceAccess) {
  await recheckWorkspace(scope);
  mutationAuthorization(scope, 'owner');
  if (!(await baselineAvailable(database))) return [];
  const row = await database
    .prepare(
      `SELECT json_group_array(json_object('candidateId',candidate_id,'proposalId',proposal_id,'statement',statement,'runId',run_id,'establishedAt',recorded_at,'basis','source_baseline','policyVersion',policy_version)) items FROM thingamajob_active_baseline WHERE workspace_id=?`,
    )
    .bind(scope.workspaceId)
    .first<{ items: string }>();
  await recheckWorkspace(scope);
  return JSON.parse(row?.items ?? '[]') as unknown[];
}
export async function resolveBaselineIssue(
  request: Request,
  database: IdentityDatabase,
  scope: WorkspaceAccess,
  runId: string,
) {
  await recheckWorkspace(scope);
  const authorization = mutationAuthorization(scope, 'owner');
  if (Number(request.headers.get('Content-Length')) > 60000) throw new AssertionInputError();
  const text = new TextDecoder().decode(await boundedBytes(request.body, 60000));
  if (text.length > 60000) throw new AssertionInputError();
  const input = JSON.parse(text) as {
    issueId: string;
    answer: string;
    decisions: { candidateId: string; statement: string; reject: boolean }[];
  };
  if (
    typeof input.issueId !== 'string' ||
    Object.keys(input).some((k) => !['issueId', 'answer', 'decisions'].includes(k)) ||
    typeof input.answer !== 'string' ||
    !input.answer.trim() ||
    input.answer.length > 4000 ||
    !Array.isArray(input.decisions)
  )
    throw new AssertionInputError();
  const issueTable = (await titlePolicyAvailable(database))
    ? 'thingamajob_current_issues'
    : 'thingamajob_baseline_issues';
  const issue = await database
    .prepare(
      `SELECT candidate_ids_json FROM ${issueTable} WHERE workspace_id=? AND run_id=? AND issue_id=? ${issueTable === 'thingamajob_current_issues' ? "AND current_disposition='attention'" : ''}`,
    )
    .bind(scope.workspaceId, runId, input.issueId)
    .first<{ candidate_ids_json: string }>();
  if (!issue) throw new AccessDenied();
  const ids = JSON.parse(issue.candidate_ids_json) as string[];
  if (
    input.decisions.length !== ids.length ||
    new Set(input.decisions.map((d) => d.candidateId)).size !== ids.length ||
    input.decisions.some(
      (d) =>
        !ids.includes(d.candidateId) ||
        typeof d.statement !== 'string' ||
        !d.statement.trim() ||
        d.statement.length > 4000 ||
        typeof d.reject !== 'boolean' ||
        Object.keys(d).some((k) => !['candidateId', 'statement', 'reject'].includes(k)),
    )
  )
    throw new AssertionInputError();
  const fingerprint = Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(input))),
    ),
    (v) => v.toString(16).padStart(2, '0'),
  ).join('');
  const old = await database
    .prepare(
      'SELECT fingerprint FROM thingamajob_baseline_answers WHERE workspace_id=? AND run_id=? AND issue_id=?',
    )
    .bind(scope.workspaceId, runId, input.issueId)
    .first<{ fingerprint: string }>();
  if (old) {
    if (old.fingerprint !== fingerprint) throw new ReviewConflict();
    return { saved: true, replayed: true };
  }
  // Individual existing review transactions are atomic. Interrupted groups can resume the exact answer;
  // never overwrite concurrent review decisions or silently invent a changed answer.
  for (const decision of input.decisions) {
    const candidate = await database
      .prepare(
        `SELECT p.proposal_id,p.statement,p.disposition,p.current_version,(SELECT corrected_statement FROM thingamajob_reviews r WHERE r.workspace_id=p.workspace_id AND r.proposal_id=p.proposal_id) corrected_statement FROM thingamajob_extraction_candidates c JOIN thingamajob_proposals p ON p.workspace_id=c.workspace_id AND p.proposal_id=c.proposal_id WHERE c.workspace_id=? AND c.run_id=? AND c.candidate_id=?`,
      )
      .bind(scope.workspaceId, runId, decision.candidateId)
      .first<{
        proposal_id: string;
        statement: string;
        disposition: string;
        current_version: number;
        corrected_statement: string | null;
      }>();
    if (!candidate) throw new AccessDenied();
    if (candidate.current_version === 2) {
      const finalStatement =
        candidate.disposition === 'corrected' ? candidate.corrected_statement : candidate.statement;
      if (
        (candidate.disposition === 'rejected') !== decision.reject ||
        (!decision.reject && decision.statement !== finalStatement)
      )
        throw new ReviewConflict();
      continue; // Explicit question answer acknowledges the already-recorded identical owner decision.
    }
    const kind = decision.reject
      ? 'rejected'
      : decision.statement === candidate.statement
        ? 'accepted'
        : 'corrected';
    const key = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(runId + input.issueId + decision.candidateId + fingerprint),
        ),
      ),
      (v) => v.toString(16).padStart(2, '0'),
    ).join('');
    await reviewProposal(
      new Request('https://issue.internal/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'issue-' + key },
        body: JSON.stringify({
          decision: kind,
          expectedVersion: 1,
          ...(kind === 'corrected' ? { correctedStatement: decision.statement } : {}),
        }),
      }),
      database,
      scope,
      candidate.proposal_id,
    );
  }
  await database.batch([
    database
      .prepare(
        `INSERT INTO thingamajob_baseline_answers(workspace_id,run_id,issue_id,response_json,fingerprint,owner_actor_id) SELECT ?,?,?,?,?,? WHERE ${authorization.sql} ON CONFLICT(workspace_id,run_id,issue_id) DO NOTHING`,
      )
      .bind(
        scope.workspaceId,
        runId,
        input.issueId,
        JSON.stringify(input),
        fingerprint,
        scope.actorId,
        ...authorization.bindings,
      ),
  ]);
  const saved = await database
    .prepare(
      'SELECT fingerprint FROM thingamajob_baseline_answers WHERE workspace_id=? AND run_id=? AND issue_id=?',
    )
    .bind(scope.workspaceId, runId, input.issueId)
    .first<{ fingerprint: string }>();
  if (saved?.fingerprint !== fingerprint) throw new ReviewConflict();
  await recheckWorkspace(scope);
  return { saved: true, replayed: false };
}
