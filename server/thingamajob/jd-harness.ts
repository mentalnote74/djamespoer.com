import type { IdentityDatabase } from './workspace-access.ts';
import { boundedBytes } from './evidence-validation.ts';
import { intakeJd, normalizeJd, JdIntakeError } from './jd-intake.ts';
import { openAiReasoner, providerMetadata } from './jd-provider.ts';
import type { JdReasoner } from './jd-provider.ts';
import { validateEvaluation, EvaluationUnavailable, JD_POLICY } from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';
import { evaluationContext } from './jd-policy.ts';
import type { CompletenessConfiguration } from './jd-policy.ts';
import { evaluationSummary } from './jd-summary.ts';
import type { OriginalBucket } from './original-storage.ts';

export interface JdHarnessEnvironment extends CompletenessConfiguration {
  IDENTITY_DB: IdentityDatabase;
  TEST_REFERENCE_WORKSPACE?: string;
  OPENAI_API_KEY?: string;
  JD_EVALUATION_MODEL?: string;
  JD_HARNESS_ENABLED?: string;
  JD_HARNESS_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  TEST_UI?: { fetch(request: Request): Promise<Response> };
  PRIVATE_ORIGINALS?: Partial<OriginalBucket>;
}
const root = '/test/thingamajob';

// Explicit allowlist: never serialize Error.message, request input or provider bodies.
function safeDetails(details: Record<string, string | number | null>) {
  const safe: Record<string, string | number | null> = {};
  for (const key of [
    'httpStatus',
    'inputTokens',
    'outputTokens',
    'canonicalTruthCount',
    'elapsedMs',
  ]) {
    const value = details[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) safe[key] = value;
  }
  for (const key of ['requestId', 'providerCode', 'status', 'reason', 'professionalInventory']) {
    const value = details[key];
    if (typeof value === 'string' && /^[a-z0-9_-]{1,100}$/i.test(value)) safe[key] = value;
  }
  return safe;
}

async function failure(
  env: JdHarnessEnvironment,
  reference: string,
  stage: string,
  error: unknown,
  metadata: Record<string, string | number | null>,
) {
  const quota = /7500|exceeded.*(?:row.read|daily.*limit)|D1.*quota/i.test(
    error instanceof Error ? error.message : '',
  );
  const code =
    error instanceof EvaluationUnavailable && /^[a-z0-9_]{1,80}$/.test(error.code)
      ? error.code
      : error instanceof Error && error.name === 'TimeoutError'
        ? 'provider_timeout'
        : 'evaluation_failed';
  const details = safeDetails({
    ...metadata,
    ...(error instanceof EvaluationUnavailable ? error.details : {}),
  });
  if (!quota)
    try {
      await env.IDENTITY_DB.batch([
        env.IDENTITY_DB.prepare(
          'INSERT INTO thingamajob_jd_harness_diagnostics(reference_id,stage,code,policy_version,details_json) VALUES(?,?,?,?,?)',
        ).bind(reference, stage, code, JD_POLICY, JSON.stringify(details)),
      ]);
    } catch {
      // A diagnostic-store failure must not replace the safe original response.
      console.error('jd-harness-diagnostic-write-failed', reference);
    }
  console.error('jd-harness-failure', JSON.stringify({ reference, stage, code, ...details }));
  const problem = quota
    ? 'Evaluation is temporarily unavailable because the career-evidence database has reached its daily allowance. Please try again later.'
    : stage === 'canonical'
      ? 'The career evidence could not be loaded.'
      : stage === 'validation'
        ? 'The evaluation response could not be validated.'
        : code === 'provider_timeout'
          ? 'The evaluation service timed out.'
          : 'The evaluation did not complete.';
  return reply(503, {
    error:
      problem +
      ' Your input is retained. Share this support reference if the problem continues. No automatic retry was made. The Library of Truth was not changed.',
    evaluationId: reference,
  });
}
export function isJdHarness(request: Request, env: JdHarnessEnvironment) {
  const url = new URL(request.url);
  return (
    env.JD_HARNESS_ENABLED === 'true' &&
    url.origin === 'https://djamespoer.com' &&
    (url.pathname === root || url.pathname.startsWith(root + '/'))
  );
}
function reply(status: number, body: string | object, type = 'application/json') {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': type + '; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    },
  });
}
async function snapshot(env: JdHarnessEnvironment) {
  // Read only the existing canonical consumer view, fixed to the server-configured
  // reference owner. No raw archives, private-only/history, workspace IDs from clients,
  // fake signed identities, provisioning, or evaluation/LoT writes.
  const row = await env.IDENTITY_DB.prepare(
    `SELECT
    (SELECT json_group_array(json_object('truthId',t.proposal_id,'statement',t.statement,
      'state',t.state,'qualifications',json(coalesce((SELECT json_extract(c.value,'$.uncertainties')
      FROM thingamajob_extraction_runs r,json_each(r.document_json,'$.claims') c
      WHERE r.workspace_id=t.workspace_id AND r.run_id=t.run_id
      AND json_extract(c.value,'$.id')=t.candidate_id),'[]'))))
      FROM (SELECT * FROM thingamajob_canonical_truth WHERE workspace_id=w.workspace_id ORDER BY proposal_id) t) truths
    FROM thingamajob_workspaces w
    JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id
    JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id
    WHERE w.workspace_id=? AND w.active=1 AND a.active=1 AND m.active=1`,
  )
    .bind(env.TEST_REFERENCE_WORKSPACE!)
    .first<{ truths: string }>();
  if (!row || !row.truths || row.truths.length > 500000) throw new EvaluationUnavailable();
  const truths = JSON.parse(row.truths) as EvaluationTruth[];
  if (
    !Array.isArray(truths) ||
    !truths.length ||
    truths.length > 2000 ||
    truths.some(
      (t) =>
        typeof t.truthId !== 'string' ||
        typeof t.statement !== 'string' ||
        !['source_established', 'accepted', 'corrected'].includes(t.state) ||
        !Array.isArray(t.qualifications),
    )
  )
    throw new EvaluationUnavailable();
  return truths;
}

/** Deliberately separate public harness entry; protected TEST endpoints remain unchanged. */
export async function jdHarness(
  request: Request,
  env: JdHarnessEnvironment,
  reasoner?: JdReasoner,
) {
  if (!isJdHarness(request, env)) return reply(404, { error: 'Not found' });
  const path = new URL(request.url).pathname;
  if (request.method === 'GET') {
    const asset = path === root || path === root + '/' ? 'index.html' : path.slice(root.length + 1);
    if (
      !/^[a-zA-Z0-9_-]+\.(?:html|js|css)$/.test(asset) ||
      (asset.endsWith('.html') && asset !== 'index.html')
    )
      return reply(404, { error: 'Not found' });
    if (!env.TEST_UI) return reply(503, { error: 'Sandbox presentation unavailable.' });
    const url = new URL(request.url);
    url.pathname = '/sandbox/' + asset;
    url.search = '';
    const response = await env.TEST_UI.fetch(new Request(url, { method: 'GET' }));
    const headers = new Headers(response.headers);
    // Keep the sandbox payload intact; Cloudflare's injected beacon conflicts
    // with this deliberately self-only script policy.
    headers.set('Cache-Control', 'no-store, no-transform');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    return new Response(response.body, { status: response.status, headers });
  }
  if (path !== root + '/evaluate' && path !== root + '/jd-input')
    return reply(404, { error: 'Not found' });
  if (request.method !== 'POST') return reply(405, { error: 'Use POST.' });
  if (
    request.headers.get('Origin') !== 'https://djamespoer.com' ||
    (request.headers.has('Sec-Fetch-Site') &&
      request.headers.get('Sec-Fetch-Site') !== 'same-origin')
  )
    return reply(403, { error: 'Submit from the test page.' });
  const reference = 'jd-' + crypto.randomUUID();
  const started = Date.now();
  let stage = 'configuration';
  let metadata: Record<string, string | number | null> = {};
  try {
    if (
      !env.TEST_REFERENCE_WORKSPACE ||
      !env.JD_HARNESS_LIMIT ||
      !env.PRIVATE_ORIGINALS?.put ||
      (!reasoner && (!env.OPENAI_API_KEY || !env.JD_EVALUATION_MODEL))
    )
      throw new EvaluationUnavailable('configuration');
    stage = 'input';
    if (path === root + '/jd-input') return reply(200, await intakeJd(request));
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      return reply(400, { error: 'Paste a job description.' });
    let value: unknown;
    try {
      value = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(await boundedBytes(request.body, 100000)),
      );
    } catch {
      return reply(400, { error: 'The job description could not be read or is too large.' });
    }
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).join(',') !== 'jobDescription' ||
      typeof (value as { jobDescription?: unknown }).jobDescription !== 'string'
    )
      return reply(400, { error: 'Paste a job description.' });
    const jd = normalizeJd((value as { jobDescription: string }).jobDescription).jobDescription;
    if (!(await env.JD_HARNESS_LIMIT.limit({ key: 'temporary-jd-harness' })).success)
      return reply(429, { error: 'The test evaluator is busy. Wait a minute and try again.' });
    stage = 'canonical';
    const truths = await snapshot(env);
    const context = await evaluationContext(env.TEST_REFERENCE_WORKSPACE!, truths, env);
    metadata = {
      canonicalTruthCount: truths.length,
      professionalInventory: context.professionalInventory,
    };
    stage = 'provider';
    const raw = await (
      reasoner ?? openAiReasoner(env.OPENAI_API_KEY!, env.JD_EVALUATION_MODEL!)
    ).evaluate(jd, truths, context);
    metadata = { ...metadata, ...providerMetadata(raw) };
    stage = 'validation';
    const result = validateEvaluation(raw, jd, truths, context);
    stage = 'canonical_recheck';
    if (JSON.stringify(await snapshot(env)) !== JSON.stringify(truths))
      return reply(409, { error: 'The Library of Truth changed during evaluation. Submit again.' });
    const evaluationId = crypto.randomUUID();
    const detail = {
      evaluationId,
      evaluatedAt: new Date().toISOString(),
      state: 'complete',
      policyVersion: JD_POLICY,
      evaluationContext: context,
      canonicalTruthCount: truths.length,
      requirements: result.requirements.map((r) => ({
        ...r,
        evidence: r.evidence.map((e) => ({
          ...e,
          ...truths.find((t) => t.truthId === e.truthId)!,
        })),
      })),
    };
    const summary = evaluationSummary(result, context.professionalInventory === 'complete');
    stage = 'persistence';
    const stored = await env.PRIVATE_ORIGINALS!.put!(
      `workspaces/${env.TEST_REFERENCE_WORKSPACE}/evaluations/${evaluationId}.json`,
      new TextEncoder().encode(JSON.stringify({ ...detail, jobDescription: jd, summary })),
      { onlyIf: { etagDoesNotMatch: '*' } },
    );
    if (!stored) throw new EvaluationUnavailable('result_store');
    return reply(200, {
      evaluationId,
      evaluatedAt: detail.evaluatedAt,
      state: 'complete',
      policyVersion: JD_POLICY,
      summary,
    });
  } catch (error) {
    if (error instanceof JdIntakeError) return reply(error.status, { error: error.message });
    return failure(env, reference, stage, error, { ...metadata, elapsedMs: Date.now() - started });
  }
}
