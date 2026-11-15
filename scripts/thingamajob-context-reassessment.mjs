import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { APPROVED_TEMPLATE, classifyBaseline } from '../server/thingamajob/baseline-policy.ts';
import { approvedSourceContexts, CONTEXT_POLICY } from '../server/thingamajob/context-policy.ts';
const hash = (v) => createHash('sha256').update(v).digest('hex'),
  q = (v) => "'" + String(v).replaceAll("'", "''") + "'";
const directory = 'career-source/proof-staging/1f96a7ab-1567-4678-bcef-15b840439cc7/';
const raw = readFileSync(directory + 'import-template.json');
if (hash(raw) !== APPROVED_TEMPLATE) throw Error('Approved package changed');
const template = JSON.parse(raw);
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=OFF');
db.exec(readFileSync('career-source/duration-before.sql', 'utf8'));
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
  policy = q(CONTEXT_POLICY),
  fp = q(run.fingerprint);
const guard = `EXISTS (SELECT 1 FROM thingamajob_extraction_runs r JOIN thingamajob_workspaces w ON w.workspace_id=r.workspace_id JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id WHERE r.workspace_id=${w} AND r.run_id=${r} AND r.fingerprint=${fp} AND r.created_by=w.owner_actor_id AND w.active=1 AND a.active=1 AND m.active=1) AND (SELECT count(*) FROM thingamajob_baseline_evaluations WHERE workspace_id=${w} AND run_id=${r})=65`;

const contexts = approvedSourceContexts(run.run_id);
const sql = [
  `INSERT INTO thingamajob_baseline_jobs(workspace_id,run_id,policy_version,input_fingerprint,authorization_reference,guard) VALUES (${w},${r},${policy},${fp},'James directed deterministic document-context handling; no summary-aging questions',CASE WHEN ${guard} THEN 1 ELSE 0 END) ON CONFLICT DO NOTHING;`,
];
const appliedCategories = new Map();
for (const context of contexts) {
  const c = document.claims.find((c) => c.id === context.candidateId),
    source = document.sources.find((s) => s.key === c.sourceKey);
  if (
    !c.citations.every((citation) =>
      source.units.some(
        (u) => u.locationKey === citation.locationKey && u.text.includes(citation.quote),
      ),
    )
  )
    throw Error('Source context citation invalid');
  const ownerAnswer = db
    .prepare(
      'SELECT response_json FROM thingamajob_baseline_answers WHERE workspace_id=? AND run_id=? AND issue_id=?',
    )
    .get(run.workspace_id, run.run_id, context.issueId);
  const establishedCategory =
    context.kind === 'elapsed_budget' && ownerAnswer ? 'baseline' : context.category;
  appliedCategories.set(c.id, establishedCategory);
  const reason = ownerAnswer
    ? context.reason +
      ' Separate existing owner confirmation is preserved and linked; this reassessment does not overwrite that confirmation.'
    : context.reason;
  sql.push(
    `INSERT INTO thingamajob_baseline_reassessments(workspace_id,run_id,candidate_id,revision,category,reasons_json,policy_version) SELECT ${w},${r},${q(c.id)},3,${q(establishedCategory)},${q(JSON.stringify([reason]))},${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
  );
  sql.push(
    `INSERT INTO thingamajob_source_contexts(workspace_id,run_id,candidate_id,source_id,issue_id,kind,display_text,citation_json,document_date,date_basis,policy_version) SELECT ${w},${r},${q(c.id)},${q(source.sourceId)},${q(context.issueId)},${q(context.kind)},${q(context.display)},${q(JSON.stringify(c.citations))},NULL,'Authored date not established; capture timestamp is preserved separately in source provenance',${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
  );
}
for (const issueId of [...new Set(contexts.map((c) => c.issueId))]) {
  const reason = contexts
    .filter((c) => c.issueId === issueId)
    .map((c) => c.reason)
    .join(' ');
  sql.push(
    `INSERT INTO thingamajob_issue_reassessments(workspace_id,run_id,issue_id,revision,disposition,reason,policy_version) SELECT ${w},${r},${q(issueId)},3,'informational',${q(reason)},${policy} WHERE ${guard} ON CONFLICT DO NOTHING;`,
  );
}
mkdirSync('career-source/context-reassessment', { recursive: true });
writeFileSync('career-source/context-reassessment/apply.sql', sql.join('\n'));
const result = classifyBaseline(document),
  counts = {};
for (const row of result.rows) {
  const category = appliedCategories.get(row.candidateId) ?? row.category;
  counts[category] = (counts[category] ?? 0) + 1;
}
console.log(
  JSON.stringify({
    counts,
    questions: result.issues.length,
    sourceContexts: contexts.length,
    inventedDocumentDates: 0,
    state: 'prepared-only',
    sqlSha256: hash(sql.join('\n')),
  }),
);
