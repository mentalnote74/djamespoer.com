import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  classifyBaseline,
  APPROVED_TEMPLATE,
  POLICY_VERSION,
} from '../server/thingamajob/baseline-policy.ts';
const hash = (v) => createHash('sha256').update(v).digest('hex');
const quote = (v) => "'" + String(v).replaceAll("'", "''") + "'";
// Explicit operator backfill, not a browser-controlled trust grant. Only the pinned approved proof.
const directory = 'career-source/proof-staging/1f96a7ab-1567-4678-bcef-15b840439cc7/';
const raw = readFileSync(directory + 'import-template.json');
if (hash(raw) !== APPROVED_TEMPLATE) throw Error('Approved package changed');
const template = JSON.parse(raw);
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=OFF');
db.exec(readFileSync('career-source/baseline-before.sql', 'utf8'));
const runs = db
  .prepare('SELECT * FROM thingamajob_extraction_runs WHERE run_id=?')
  .all(template.extractionRunId);
if (runs.length !== 1 || runs[0].state !== 'staged') throw Error('Expected one complete owner run');
const run = runs[0],
  document = JSON.parse(run.document_json);
const normalized = structuredClone(document);
for (const source of normalized.sources) source.sourceId = 'UNBOUND_' + source.key;
if (JSON.stringify(normalized) !== JSON.stringify(template))
  throw Error('Remote input differs from pinned package');
const owner = db
  .prepare('SELECT owner_actor_id FROM thingamajob_workspaces WHERE workspace_id=? AND active=1')
  .get(run.workspace_id);
if (!owner || run.created_by !== owner.owner_actor_id) throw Error('Owner-supplied run required');
for (const source of document.sources) {
  const original = db
    .prepare('SELECT * FROM thingamajob_originals WHERE workspace_id=? AND source_id=?')
    .get(run.workspace_id, source.sourceId);
  if (original?.sha256 !== source.sha256) throw Error('Remote source hash differs');
  const local = readFileSync(directory + source.key + '.txt');
  if (hash(local) !== source.sha256) throw Error('Source changed');
  if (source.units.some((u) => !local.toString('utf8').includes(u.text)))
    throw Error('Unit mismatch');
}
const classified = classifyBaseline(document),
  w = quote(run.workspace_id),
  r = quote(run.run_id),
  policy = quote(POLICY_VERSION),
  fp = quote(run.fingerprint);
const guard =
  `EXISTS (SELECT 1 FROM thingamajob_extraction_runs r JOIN thingamajob_workspaces w ON w.workspace_id=r.workspace_id JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id WHERE r.workspace_id=${w} AND r.run_id=${r} AND r.fingerprint=${fp} AND r.state='staged' AND r.created_by=w.owner_actor_id AND w.active=1 AND a.active=1 AND m.active=1) AND (SELECT count(*) FROM thingamajob_extraction_candidates WHERE workspace_id=${w} AND run_id=${r})=65 AND ` +
  document.sources
    .map(
      (s) =>
        `EXISTS (SELECT 1 FROM thingamajob_originals WHERE workspace_id=${w} AND source_id=${quote(s.sourceId)} AND sha256=${quote(s.sha256)})`,
    )
    .join(' AND ');
const sql = [
  `INSERT INTO thingamajob_baseline_jobs(workspace_id,run_id,policy_version,input_fingerprint,authorization_reference,guard) VALUES (${w},${r},${policy},${fp},'Explicit TEST baseline/hot-seat rollout authorized by James',CASE WHEN ${guard} THEN 1 ELSE 0 END) ON CONFLICT DO NOTHING;`,
];
for (const row of classified.rows) {
  const claim = document.claims.find((c) => c.id === row.candidateId);
  sql.push(
    `INSERT INTO thingamajob_baseline_evaluations(workspace_id,run_id,candidate_id,proposal_id,category,reasons_json,policy_version,evidence_digest,execution_context) SELECT c.workspace_id,c.run_id,c.candidate_id,c.proposal_id,${quote(row.category)},${quote(JSON.stringify(row.reasons))},${policy},${quote(hash(JSON.stringify(claim)))},'authorized_test_policy' FROM thingamajob_extraction_candidates c WHERE c.workspace_id=${w} AND c.run_id=${r} AND c.candidate_id=${quote(row.candidateId)} AND ${guard} ON CONFLICT DO NOTHING;`,
  );
}
for (const issue of classified.issues)
  sql.push(
    `INSERT INTO thingamajob_baseline_issues(workspace_id,run_id,issue_id,question,candidate_ids_json) SELECT ${w},${r},${quote(issue.id)},${quote(issue.question)},${quote(JSON.stringify(issue.claimIds))} WHERE ${guard} ON CONFLICT DO NOTHING;`,
  );
mkdirSync('career-source/baseline-vetting', { recursive: true });
writeFileSync('career-source/baseline-vetting/apply.sql', sql.join('\n'));
writeFileSync('career-source/baseline-vetting/report.json', JSON.stringify(classified, null, 2));
const counts = {};
for (const c of classified.rows) counts[c.category] = (counts[c.category] ?? 0) + 1;
console.log(
  JSON.stringify({
    counts,
    questions: classified.issues.length,
    sqlSha256: hash(sql.join('\n')),
    state: 'prepared-not-applied',
  }),
);
