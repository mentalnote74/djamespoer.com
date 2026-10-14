import type { IdentityDatabase } from './workspace-access.ts';
import type { OriginalBucket } from './original-storage.ts';
import type { PrivateOriginals } from './storage-readiness.ts';
import { proofIssuer, proofSnapshot } from './roundtrip-proof.ts';
import { runProofStep, proofStepCount } from './proof-steps.ts';
import type { ProofState } from './proof-steps.ts';
interface VerificationEnvironment {
  FICTIONAL_DB: IdentityDatabase;
  FICTIONAL_ORIGINALS: OriginalBucket & PrivateOriginals;
  FICTIONAL_VERIFICATION_ONLY: string;
  PROOF_PHASE?: string;
}
function reply(status: number, body: object) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
/** Private service binding only; no public routes, previews or human identity input. */
export default {
  async fetch(request: Request, env: VerificationEnvironment): Promise<Response> {
    if (
      request.method !== 'POST' ||
      new URL(request.url).pathname !== '/run' ||
      request.body !== null
    )
      return reply(404, { error: 'Not found' });
    if (env.FICTIONAL_VERIFICATION_ONLY !== 'scrum85-fictional-only')
      return reply(503, { error: 'Verification unavailable' });
    const phase = env.PROOF_PHASE ?? 'initial';
    if (!['initial', 'restart'].includes(phase))
      return reply(503, { error: 'Verification unavailable' });
    const db = env.FICTIONAL_DB;
    try {
      const row = await db
        .prepare(
          "SELECT state,report FROM scrum85_verification_run WHERE id='scrum85-fictional-only'",
        )
        .first<{ state: string; report: string | null }>();
      const foreign = await db
        .prepare('SELECT count(*) AS n FROM thingamajob_actors WHERE issuer<>?')
        .bind(proofIssuer)
        .first<{ n: number }>();
      if (!row || !foreign || foreign.n !== 0)
        return reply(503, { error: 'Verification unavailable' });
      const state: ProofState & { phase?: string } = row.report
        ? JSON.parse(row.report)
        : { cursor: 0, clients: {}, checks: [] };
      if (row.state === 'passed' && state.phase === phase) {
        const counts = await proofSnapshot(db);
        if (JSON.stringify(counts) !== JSON.stringify(state.counts))
          return reply(503, { error: 'Verification state changed' });
        return reply(200, {
          passed: true,
          complete: true,
          completedSteps: proofStepCount,
          totalSteps: proofStepCount,
          checks: state.checks,
          counts,
          replayed: true,
          phase,
          fixtures: 'fictional only',
          llm: false,
        });
      }
      if (row.state === 'passed' && phase === 'restart' && state.phase === 'initial') {
        state.cursor = proofStepCount - 7;
        state.checks = state.checks.slice(0, state.cursor);
      } else if (row.state !== 'ready')
        return reply(409, { error: 'Verification requires operator inspection' });
      const locked = await db
        .prepare(
          "UPDATE scrum85_verification_run SET state='running',updated_at=unixepoch() WHERE id='scrum85-fictional-only' AND state=? AND COALESCE(report,'')=? RETURNING id",
        )
        .bind(row.state, row.report ?? '')
        .first<{ id: string }>();
      if (!locked) return reply(409, { error: 'Verification already running' });
      try {
        const result = await runProofStep(db, env.FICTIONAL_ORIGINALS, state);
        state.phase = phase;
        await db.batch([
          db
            .prepare(
              "UPDATE scrum85_verification_run SET state=?,report=?,updated_at=unixepoch() WHERE id='scrum85-fictional-only' AND state='running'",
            )
            .bind(result.complete ? 'passed' : 'ready', JSON.stringify(state)),
        ]);
        return reply(200, { ...result, phase, deployment: 'isolated TEST D1/R2', replayed: false });
      } catch {
        await db.batch([
          db.prepare(
            "UPDATE scrum85_verification_run SET state='failed',updated_at=unixepoch() WHERE id='scrum85-fictional-only'",
          ),
        ]);
        return reply(503, { error: 'Verification failed; operator inspection required' });
      }
    } catch {
      return reply(503, { error: 'Verification unavailable' });
    }
  },
};
