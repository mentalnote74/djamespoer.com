import { canonicalTruth } from './canonical-truth.ts';
import { recheckWorkspace, mutationAuthorization } from './workspace-access.ts';
import type { IdentityDatabase, WorkspaceAccess } from './workspace-access.ts';
import { boundedBytes } from './evidence-validation.ts';
import {
  JD_POLICY,
  EvaluationInputError,
  EvaluationConflict,
  EvaluationUnavailable,
  validateEvaluation,
} from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';
import type { JdReasoner } from './jd-provider.ts';
import { providerMetadata } from './jd-provider.ts';
import { normalizeJd } from './jd-intake.ts';
import { AccessDenied } from './access-identity.ts';
import { evaluationContext } from './jd-policy.ts';
import type { CompletenessConfiguration } from './jd-policy.ts';
type Row = {
  evaluation_id: string;
  fingerprint: string;
  truth_digest: string;
  state: string;
  result_json: string | null;
  model: string;
  created_at: number;
  policy_version: string;
};
const digest = async (v: unknown) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(v))),
    ),
  )
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
async function currentTruth(db: IdentityDatabase, scope: WorkspaceAccess) {
  const canonical = await canonicalTruth(db, scope);
  const truths = canonical.claims
    .map((v) => {
      const c = v as EvaluationTruth;
      if (
        typeof c.truthId !== 'string' ||
        typeof c.statement !== 'string' ||
        !['source_established', 'accepted', 'corrected'].includes(c.state)
      )
        throw new EvaluationUnavailable();
      return {
        truthId: c.truthId,
        statement: c.statement,
        state: c.state,
        qualifications: Array.isArray(c.qualifications) ? c.qualifications : [],
      };
    })
    .sort((a, b) => a.truthId.localeCompare(b.truthId));
  if (!truths.length || truths.length > 2000 || JSON.stringify(truths).length > 500000)
    throw new EvaluationUnavailable();
  return { truths, hash: await digest(truths) };
}
async function row(db: IdentityDatabase, scope: WorkspaceAccess, id: string, byKey = false) {
  return db
    .prepare(
      `SELECT evaluation_id,fingerprint,truth_digest,state,result_json,model,created_at,policy_version FROM thingamajob_jd_evaluations WHERE workspace_id=? AND ${byKey ? 'request_key' : 'evaluation_id'}=?`,
    )
    .bind(scope.workspaceId, id)
    .first<Row>();
}
async function present(
  db: IdentityDatabase,
  scope: WorkspaceAccess,
  r: Row,
  completeness: CompletenessConfiguration = {},
) {
  await recheckWorkspace(scope);
  if (r.state === 'complete') {
    if (r.policy_version !== JD_POLICY)
      throw new EvaluationConflict(
        'This evaluation used a superseded policy and is retained as history. Evaluate again under the current policy.',
      );
    const snapshot = await currentTruth(db, scope);
    if (snapshot.hash !== r.truth_digest)
      throw new EvaluationConflict('LoT changed; evaluate again.');
    const body = JSON.parse(r.result_json!);
    if (
      JSON.stringify(body.evaluationContext) !==
      JSON.stringify(await evaluationContext(scope.workspaceId, snapshot.truths, completeness))
    )
      throw new EvaluationConflict(
        'Evaluation completeness policy changed; the previous result is retained as history. Evaluate again.',
      );
    return { status: 200, body: body as object };
  }
  return {
    status: r.state === 'pending' ? 202 : 503,
    body: {
      evaluationId: r.evaluation_id,
      state: r.state,
      error:
        r.state === 'pending'
          ? 'Evaluation is still running.'
          : 'Evaluation did not complete. Submit again to explicitly retry.',
    },
  };
}
export async function readEvaluation(
  db: IdentityDatabase,
  scope: WorkspaceAccess,
  id: string,
  completeness: CompletenessConfiguration = {},
) {
  mutationAuthorization(scope, 'owner');
  await recheckWorkspace(scope);
  const r = await row(db, scope, id);
  if (!r) return { status: 404, body: { error: 'Evaluation not found' } };
  return present(db, scope, r, completeness);
}
export async function evaluateJob(
  request: Request,
  db: IdentityDatabase,
  scope: WorkspaceAccess,
  reasoner: JdReasoner,
  model: string,
  completeness: CompletenessConfiguration = {},
) {
  mutationAuthorization(scope, 'owner');
  await recheckWorkspace(scope);
  const key = request.headers.get('Idempotency-Key');
  if (
    !key ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(key) ||
    !request.headers.get('Content-Type')?.startsWith('application/json')
  )
    throw new EvaluationInputError();
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 100000)),
    );
  } catch {
    throw new EvaluationInputError();
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).join(',') !== 'jobDescription'
  )
    throw new EvaluationInputError();
  const rawJd = (value as { jobDescription: unknown }).jobDescription;
  if (typeof rawJd !== 'string' || rawJd.trim().length < 20) throw new EvaluationInputError();
  const jd = normalizeJd(rawJd).jobDescription;
  const snapshot = await currentTruth(db, scope);
  const context = await evaluationContext(scope.workspaceId, snapshot.truths, completeness);
  const fingerprint = await digest({ jd, policy: JD_POLICY, context });
  const old = await row(db, scope, key, true);
  if (old) {
    if (old.fingerprint !== fingerprint) throw new EvaluationConflict();
    return present(db, scope, old, completeness);
  }
  const id = crypto.randomUUID();
  // A pending reservation prevents duplicate/concurrent paid calls; no implicit retry.
  try {
    await db.batch([
      db
        .prepare(
          "UPDATE thingamajob_jd_evaluations SET state='failed',completed_at=unixepoch() WHERE workspace_id=? AND state='pending' AND created_at<unixepoch()-180",
        )
        .bind(scope.workspaceId),
      db
        .prepare(
          `INSERT INTO thingamajob_jd_evaluations(workspace_id,evaluation_id,request_key,fingerprint,jd_text,truth_digest,truth_snapshot_json,state,model,policy_version,created_by) VALUES(?,?,?,?,?,?,?,'pending',?,?,?)`,
        )
        .bind(
          scope.workspaceId,
          id,
          key,
          fingerprint,
          jd,
          snapshot.hash,
          JSON.stringify(snapshot.truths),
          model,
          JD_POLICY,
          scope.actorId,
        ),
    ]);
  } catch {
    const raced = await row(db, scope, key, true);
    if (raced && raced.fingerprint === fingerprint) return present(db, scope, raced, completeness);
    throw new EvaluationConflict('An evaluation is already running.');
  }
  let stage = 'provider';
  let metadata: Record<string, string | number | null> = {};
  try {
    await recheckWorkspace(scope);
    const raw = await reasoner.evaluate(jd, snapshot.truths, context);
    metadata = providerMetadata(raw);
    stage = 'validation';
    const result = validateEvaluation(raw, jd, snapshot.truths, context);
    await recheckWorkspace(scope);
    if ((await currentTruth(db, scope)).hash !== snapshot.hash)
      throw new EvaluationConflict('LoT changed; evaluate again.');
    const body = {
      evaluationId: id,
      state: 'complete',
      evaluatedAt: new Date().toISOString(),
      policyVersion: JD_POLICY,
      evaluationContext: context,
      model,
      canonicalTruthCount: snapshot.truths.length,
      truthDigest: snapshot.hash,
      jobDescription: jd,
      requirements: result.requirements.map((r) => ({
        ...r,
        evidence: r.evidence.map((e) => ({
          ...e,
          ...snapshot.truths.find((t) => t.truthId === e.truthId)!,
        })),
      })),
    };
    stage = 'persistence';
    await db.batch([
      db
        .prepare(
          "UPDATE thingamajob_jd_evaluations SET state='complete',result_json=?,completed_at=unixepoch() WHERE workspace_id=? AND evaluation_id=? AND state='pending'",
        )
        .bind(JSON.stringify(body), scope.workspaceId, id),
    ]);
    await recheckWorkspace(scope);
    return { status: 200, body };
  } catch (error) {
    const code =
      error instanceof EvaluationUnavailable
        ? error.code
        : error instanceof EvaluationConflict
          ? 'truth_changed'
          : error instanceof Error && error.name === 'TimeoutError'
            ? 'provider_timeout'
            : 'evaluation_failed';
    const details = {
      ...metadata,
      ...(error instanceof EvaluationUnavailable ? error.details : {}),
    };
    await db.batch([
      db
        .prepare(
          "UPDATE thingamajob_jd_evaluations SET state='failed',completed_at=unixepoch() WHERE workspace_id=? AND evaluation_id=? AND state='pending'",
        )
        .bind(scope.workspaceId, id),
      db
        .prepare(
          'INSERT INTO thingamajob_jd_diagnostics(workspace_id,evaluation_id,stage,code,details_json) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING',
        )
        .bind(scope.workspaceId, id, stage, code, JSON.stringify(details)),
    ]);
    if (error instanceof AccessDenied || error instanceof EvaluationConflict) throw error;
    throw new EvaluationUnavailable(code, { ...details, evaluationId: id, stage });
  }
}
