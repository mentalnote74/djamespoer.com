import type { IdentityDatabase } from './workspace-access.ts';
import type { OriginalBucket } from './original-storage.ts';
import { JD_POLICY, EvaluationUnavailable } from './jd-contract.ts';

export const PUBLIC_RETENTION_SECONDS = 90 * 86400;
export const PUBLIC_PREFIX = 'public-evaluations/v1/';
export interface PublicEvaluationEnvironment {
  IDENTITY_DB: IdentityDatabase;
  PRIVATE_ORIGINALS?: Partial<OriginalBucket> & { delete?(keys: string[]): Promise<void> };
}
export const uuid = (value: string | null): value is string =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export function attemptIdentity(request: Request) {
  const supplied = request.headers.get('Idempotency-Key');
  const session = request.headers.get('X-TAMJ-Session');
  const method = request.headers.get('X-TAMJ-Method');
  return {
    id: uuid(supplied) ? supplied : crypto.randomUUID(),
    session: uuid(session) ? session : null,
    method: ['text', 'url', 'file'].includes(method ?? '') ? method! : 'unknown',
  };
}
export type AttemptIdentity = ReturnType<typeof attemptIdentity>;
export async function beginAttempt(env: PublicEvaluationEnvironment, identity: AttemptIdentity) {
  const now = Math.floor(Date.now() / 1000);
  await env.IDENTITY_DB.batch([
    env.IDENTITY_DB.prepare(
      `INSERT OR IGNORE INTO thingamajob_public_attempts
      (attempt_id,session_id,input_method,status,stage,policy_version,created_at,updated_at,expires_at)
      VALUES(?,?,?,'preparing','input',?,?,?,?)`,
    ).bind(
      identity.id,
      identity.session ?? '',
      identity.method,
      JD_POLICY,
      now,
      now,
      now + PUBLIC_RETENTION_SECONDS,
    ),
  ]);
  const row = await env.IDENTITY_DB.prepare(
    'SELECT status,session_id,expires_at FROM thingamajob_public_attempts WHERE attempt_id=?',
  )
    .bind(identity.id)
    .first<{ status: string; session_id: string; expires_at: number }>();
  if (!row || row.expires_at <= now || row.session_id !== (identity.session ?? ''))
    throw new EvaluationUnavailable('attempt_conflict');
  return row.status;
}
export async function updateAttempt(
  env: PublicEvaluationEnvironment,
  id: string,
  status: string,
  stage: string,
  metadata: object = {},
  code = '',
) {
  await env.IDENTITY_DB.batch([
    env.IDENTITY_DB.prepare(
      `UPDATE thingamajob_public_attempts SET status=?,stage=?,code=?,
      metadata_json=json_patch(metadata_json,?),updated_at=unixepoch() WHERE attempt_id=?`,
    ).bind(status, stage, code, JSON.stringify(metadata), id),
  ]);
}
export async function claimAttempt(env: PublicEvaluationEnvironment, id: string) {
  return env.IDENTITY_DB.prepare(
    `UPDATE thingamajob_public_attempts SET status='evaluating',stage='canonical',updated_at=unixepoch()
     WHERE attempt_id=? AND status IN ('preparing','prepared') AND expires_at>unixepoch() RETURNING attempt_id`,
  )
    .bind(id)
    .first();
}
export async function retainPublicContent(
  env: PublicEvaluationEnvironment,
  id: string,
  part: 'input' | 'submitted' | 'evaluated' | 'provider' | 'result' | 'unvalidated',
  value: unknown,
) {
  const stored = await env.PRIVATE_ORIGINALS?.put?.(
    PUBLIC_PREFIX + id + '/' + part + '.json',
    new TextEncoder().encode(JSON.stringify(value)),
    { onlyIf: { etagDoesNotMatch: '*' } },
  );
  if (!stored) throw new EvaluationUnavailable('audit_store');
}
// Strict finite vocabulary, never caller-supplied URLs, filenames, text or arbitrary GA parameters.
const events: Record<string, readonly string[]> = {
  evaluation_submitted: ['text', 'url', 'file', 'unknown'],
  evaluation_completed: ['text', 'url', 'file', 'unknown'],
  evaluation_failed: ['text', 'url', 'file', 'unknown'],
  evaluation_result_viewed: ['text', 'url', 'file', 'unknown'],
  case_study_open: ['djamespoer', 'exl', 'ips', 'tcc', 'dr'],
  case_study_view: ['djamespoer', 'exl', 'ips', 'tcc', 'dr'],
  work_open: ['djamespoer', 'exl', 'ips', 'tcc', 'dr'],
  evidence_view: ['engineering', 'ux-product', 'accessibility', 'ai', 'impact', 'buildometer'],
  resume_download: ['public-current'],
  contact_click: ['email'],
  external_profile_click: ['linkedin', 'github'],
};
export async function publicEvent(
  env: PublicEvaluationEnvironment,
  identity: AttemptIdentity,
  event: string,
  context: string,
) {
  if (!events[event]?.includes(context)) return false;
  await env.IDENTITY_DB.batch([
    env.IDENTITY_DB.prepare(
      `INSERT OR IGNORE INTO thingamajob_public_events(attempt_id,event,context,recorded_at)
     SELECT attempt_id,?,?,unixepoch() FROM thingamajob_public_attempts
     WHERE attempt_id=? AND session_id=? AND expires_at>unixepoch()
       AND created_at>unixepoch()-1800
       AND (?!='evaluation_result_viewed' OR status='complete')`,
    ).bind(event, context, identity.id, identity.session ?? '', event),
  ]);
  return true;
}
/** Daily bounded cleanup. R2 first; retry leaves D1 identity available if deletion fails.
 * Only this new table/prefix is eligible. No workspaces/, LoT, archives or legacy evaluations.
 */
export async function expirePublicEvaluations(env: PublicEvaluationEnvironment) {
  if (!env.PRIVATE_ORIGINALS?.delete) throw new Error('Public retention storage unavailable');
  let deleted = 0;
  for (let batch = 0; batch < 10; batch++) {
    const row = await env.IDENTITY_DB.prepare(
      `SELECT json_group_array(attempt_id) ids FROM
       (SELECT attempt_id FROM thingamajob_public_attempts WHERE expires_at<=unixepoch() ORDER BY expires_at LIMIT 100)`,
    ).first<{ ids: string }>();
    const ids: string[] = JSON.parse(row?.ids ?? '[]');
    if (!ids.length) break;
    for (const id of ids) {
      if (!uuid(id)) throw new Error('Invalid public retention identity');
      await env.PRIVATE_ORIGINALS.delete(
        ['input', 'submitted', 'evaluated', 'provider', 'result', 'unvalidated'].map(
          (part) => PUBLIC_PREFIX + id + '/' + part + '.json',
        ),
      );
      await env.IDENTITY_DB.batch([
        env.IDENTITY_DB.prepare('DELETE FROM thingamajob_public_events WHERE attempt_id=?').bind(
          id,
        ),
        env.IDENTITY_DB.prepare(
          'DELETE FROM thingamajob_public_attempts WHERE attempt_id=? AND expires_at<=unixepoch()',
        ).bind(id),
        env.IDENTITY_DB.prepare(
          'DELETE FROM thingamajob_jd_harness_diagnostics WHERE reference_id=?',
        ).bind('jd-' + id),
      ]);
      deleted++;
    }
  }
  // Intentionally content-free operational receipt.
  console.info('public-evaluation-retention', JSON.stringify({ deleted }));
  return deleted;
}
