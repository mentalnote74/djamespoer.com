import type { IdentityDatabase } from './workspace-access.ts';
import { boundedBytes } from './evidence-validation.ts';
import { intakeJd, normalizeJd, JdIntakeError } from './jd-intake.ts';
import { openAiReasoner } from './jd-provider.ts';
import type { JdReasoner } from './jd-provider.ts';
import { validateEvaluation, EvaluationUnavailable, JD_POLICY } from './jd-contract.ts';
import type { EvaluationTruth } from './jd-contract.ts';

export interface JdHarnessEnvironment {
  IDENTITY_DB: IdentityDatabase;
  TEST_REFERENCE_WORKSPACE?: string;
  OPENAI_API_KEY?: string;
  JD_EVALUATION_MODEL?: string;
  JD_HARNESS_ENABLED?: string;
  JD_HARNESS_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  TEST_UI?: { fetch(request: Request): Promise<Response> };
}
const root = '/test/thingamajob';
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
    headers.set('Cache-Control', 'no-store');
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
  if (
    !env.TEST_REFERENCE_WORKSPACE ||
    !env.JD_HARNESS_LIMIT ||
    (!reasoner && (!env.OPENAI_API_KEY || !env.JD_EVALUATION_MODEL))
  )
    return reply(503, { error: 'The evaluator is not available.' });
  try {
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
    const truths = await snapshot(env);
    const raw = await (
      reasoner ?? openAiReasoner(env.OPENAI_API_KEY!, env.JD_EVALUATION_MODEL!)
    ).evaluate(jd, truths);
    const result = validateEvaluation(raw, jd, truths);
    if (JSON.stringify(await snapshot(env)) !== JSON.stringify(truths))
      return reply(409, { error: 'The Library of Truth changed during evaluation. Submit again.' });
    return reply(200, {
      evaluationId: crypto.randomUUID(),
      evaluatedAt: new Date().toISOString(),
      state: 'complete',
      policyVersion: JD_POLICY,
      canonicalTruthCount: truths.length,
      requirements: result.requirements.map((r) => ({
        ...r,
        evidence: r.evidence.map((e) => ({
          ...e,
          ...truths.find((t) => t.truthId === e.truthId)!,
        })),
      })),
    });
  } catch (error) {
    if (error instanceof JdIntakeError) return reply(error.status, { error: error.message });
    // Codes only: never log the pasted JD, canonical truth or provider payloads.
    console.error(
      'jd-harness',
      error instanceof EvaluationUnavailable ? error.code : 'unavailable',
    );
    return reply(503, {
      error: 'The evaluation did not complete. The Library of Truth was not changed.',
    });
  }
}
