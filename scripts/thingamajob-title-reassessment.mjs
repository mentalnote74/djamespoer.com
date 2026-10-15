import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { APPROVED_TEMPLATE, classifyBaseline } from '../server/thingamajob/baseline-policy.ts';
import { approvedTitleGroups, TITLE_POLICY } from '../server/thingamajob/title-policy.ts';
const hash = (v) => createHash('sha256').update(v).digest('hex'),
  q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const directory = 'career-source/proof-staging/1f96a7ab-1567-4678-bcef-15b840439cc7/';
const raw = readFileSync(directory + 'import-template.json');
if (hash(raw) !== APPROVED_TEMPLATE) throw Error('Approved package changed');
const template = JSON.parse(raw);
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=OFF');
db.exec(readFileSync('career-source/title-variants-before.sql', 'utf8'));
const runs = db
  .prepare('SELECT * FROM thingamajob_extraction_runs WHERE run_id=?')
  .all(template.extractionRunId);
if (runs.length !== 1) throw Error('Ambiguous run');
const run = runs[0],
  document = JSON.parse(run.document_json);
const normalized = structuredClone(document);
for (const s of normalized.sources) s.sourceId = 'UNBOUND_' + s.key;
if (JSON.stringify(normalized) !== JSON.stringify(template)) throw Error('Pinned run changed');
for (const s of document.sources) {
  const o = db
    .prepare('SELECT sha256 FROM thingamajob_originals WHERE workspace_id=? AND source_id=?')
    .get(run.workspace_id, s.sourceId);
  if (o?.sha256 !== s.sha256 || hash(readFileSync(directory + s.key + '.txt')) !== s.sha256)
    throw Error('Source integrity failed');
}
const w = q(run.workspace_id),
  r = q(run.run_id),
  policy = q(TITLE_POLICY),
  fp = q(run.fingerprint);
const guard = `EXISTS (SELECT 1 FROM thingamajob_extraction_runs r JOIN thingamajob_workspaces w ON w.workspace_id=r.workspace_id JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id WHERE r.workspace_id=${w} AND r.run_id=${r} AND r.fingerprint=${fp} AND r.created_by=w.owner_actor_id AND w.active=1 AND a.active=1 AND m.active=1) AND (SELECT count(*) FROM thingamajob_baseline_evaluations WHERE workspace_id=${w} AND run_id=${r})=65`;
const reason =
  'Title wording is source-specific presentation metadata. Employer, compatible dates and corroborating responsibilities support the same role. No canonical title or promotion is inferred; wording alone is not a material conflict.';
const sql = [
  `INSERT INTO thingamajob_baseline_jobs(workspace_id,run_id,policy_version,input_fingerprint,authorization_reference,guard) VALUES (${w},${r},${policy},${fp},'James directed source-specific title handling; no automatic title conflict',CASE WHEN ${guard} THEN 1 ELSE 0 END) ON CONFLICT DO NOTHING;`,
];
for (const group of approvedTitleGroups(run.run_id)) {
  for (const id of group.claimIds) {
    const c = document.claims.find((c) => c.id === id),
      source = document.sources.find((s) => s.key === c.sourceKey),
      citation = c.citations[0];
    if (
      !source.units.some(
        (u) => u.locationKey === citation.locationKey && u.text.includes(citation.quote),
      )
    )
      throw Error('Title citation invalid');
    const title = citation.quote.split(/\u00b7/)[0].trim();
    sql.push(
      `INSERT INTO thingamajob_baseline_reassessments(workspace_id,run_id,candidate_id,revision,category,reasons_json,policy_version) SELECT ${w},${r},${q(id)},2,'qualified',${q(JSON.stringify([reason]))},${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
    );
    sql.push(
      `INSERT INTO thingamajob_role_presentations(workspace_id,run_id,candidate_id,role_key,source_id,presented_title,citation_json,association_basis,canonical_title,policy_version) SELECT ${w},${r},${q(id)},${q(group.roleKey)},${q(source.sourceId)},${q(title)},${q(JSON.stringify(citation))},${q(reason)},NULL,${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
    );
  }
  sql.push(
    `INSERT INTO thingamajob_issue_reassessments(workspace_id,run_id,issue_id,revision,disposition,reason,policy_version) SELECT ${w},${r},${q(group.issueId)},2,'informational',${q(reason)},${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
  );
}
mkdirSync('career-source/title-reassessment', { recursive: true });
writeFileSync('career-source/title-reassessment/apply.sql', sql.join('\n'));
const result = classifyBaseline(document),
  counts = {};
for (const c of result.rows) counts[c.category] = (counts[c.category] ?? 0) + 1;
console.log(
  JSON.stringify({
    counts,
    questions: result.issues.length,
    sourceTitlePresentations: 4,
    canonicalTitlesSelected: 0,
    sqlSha256: hash(sql.join('\n')),
    state: 'prepared-only',
  }),
);
