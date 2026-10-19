// Offline, operator-authorized data preparation only. No network/model calls.
// Career content is supplied in a private manifest, never embedded in source code.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { QA_DIRECT_CANDIDATES, QA_SOURCE_RUN, POLICY_VERSION } from '../server/thingamajob/baseline-policy.ts';
const [snapshotPath, manifestPath, directory] = process.argv.slice(2);
if (!snapshotPath || !manifestPath || !directory) throw Error('Expected private snapshot, approved manifest and private output directory');
const tables = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const rows = (name) => tables['thingamajob_' + name] ?? [];
const hash = (v) => createHash('sha256').update(v).digest('hex');
const q = (v) => v === null ? 'NULL' : "'" + String(v).replaceAll("'", "''") + "'";
const uuid = (s) => { const h=hash(s); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; };
const run = rows('extraction_runs').find(r => r.run_id === QA_SOURCE_RUN);
if (!run || manifest.workspaceId !== run.workspace_id || !manifest.authorizationReference?.trim()) throw Error('Invalid approval scope');
const document = JSON.parse(run.document_json);
const policy = 'client-one-truth-qa-20261019';
const manifestHash = hash(JSON.stringify(manifest));
const w=q(run.workspace_id), r=q(run.run_id), owner=q(run.created_by);
const sourceGuards = document.sources.map(s => `EXISTS(SELECT 1 FROM thingamajob_originals WHERE workspace_id=${w} AND source_id=${q(s.sourceId)} AND sha256=${q(s.sha256)})`);
const proposalGuards = rows('proposals').map(p => `EXISTS(SELECT 1 FROM thingamajob_proposals WHERE workspace_id=${w} AND proposal_id=${q(p.proposal_id)} AND fingerprint=${q(p.fingerprint)} AND disposition=${q(p.disposition)} AND current_version=${p.current_version})`);
const guard = `EXISTS(SELECT 1 FROM thingamajob_extraction_runs x JOIN thingamajob_workspaces w ON w.workspace_id=x.workspace_id JOIN thingamajob_actors a ON a.actor_id=w.owner_actor_id JOIN thingamajob_memberships m ON m.workspace_id=w.workspace_id AND m.actor_id=a.actor_id WHERE x.workspace_id=${w} AND x.run_id=${r} AND x.fingerprint=${q(run.fingerprint)} AND w.owner_actor_id=${owner} AND a.active=1 AND w.active=1 AND m.active=1) AND ${[...sourceGuards,...proposalGuards].join(' AND ')}`;
const job = `EXISTS(SELECT 1 FROM thingamajob_baseline_jobs WHERE workspace_id=${w} AND run_id=${r} AND policy_version=${q(policy)} AND input_fingerprint=${q(manifestHash)} AND guard=1)`;
const sql = [
  `INSERT INTO thingamajob_baseline_jobs(workspace_id,run_id,policy_version,input_fingerprint,authorization_reference,guard) VALUES(${w},${r},${q(policy)},${q(manifestHash)},${q(manifest.authorizationReference)},CASE WHEN ${guard} THEN 1 ELSE 0 END) ON CONFLICT DO NOTHING;`,
];
for (const id of QA_DIRECT_CANDIDATES) {
  const c=document.claims.find(c=>c.id===id), e=rows('current_evaluations').find(e=>e.candidate_id===id && e.run_id===run.run_id);
  const s=document.sources.find(s=>s.key===c?.sourceKey);
  if (!c || !e || !c.citations.every(q=>s.units.some(u=>u.locationKey===q.locationKey && u.text.includes(q.quote)))) throw Error('Invalid candidate support');
  sql.push(`INSERT INTO thingamajob_baseline_reassessments(workspace_id,run_id,candidate_id,revision,category,reasons_json,policy_version) SELECT ${w},${r},${q(id)},4,'baseline',${q(JSON.stringify(['Approved truthful-source testimony; collaboration, approximation and source-specific title wording preserved. No individual reconfirmation required.']))},${q(POLICY_VERSION)} WHERE ${job} ON CONFLICT DO NOTHING;`);
}
for (const usage of manifest.usage) {
  const p=rows('proposals').find(p=>p.proposal_id===usage.proposalId);
  if (!p || p.statement!==usage.expectedOriginal) throw Error('Usage target drift');
  sql.push(`INSERT INTO thingamajob_truth_usage(workspace_id,proposal_id,revision,usage,statement_override,canonical_proposal_id,reason,authorization_reference) SELECT ${w},${q(p.proposal_id)},1,${q(usage.usage)},${q(usage.statementOverride??null)},${q(usage.canonicalProposalId??null)},${q(usage.reason)},${q(manifest.authorizationReference)} WHERE ${job} ON CONFLICT DO NOTHING;`);
}
for (const u of manifest.retireUnknowns) {
  const row=rows('unknowns').find(x=>x.unknown_id===u.unknownId);
  if (!row || row.state!=='open' || !row.context.includes(u.expectedContext)) throw Error('UNKNOWN target drift');
  sql.push(`INSERT INTO thingamajob_unknown_retirements(workspace_id,unknown_id,reason,authorization_reference) SELECT ${w},${q(u.unknownId)},${q(u.reason)},${q(manifest.authorizationReference)} WHERE ${job} ON CONFLICT DO NOTHING;`);
}
const supplementalRun='qa-source-coverage-20261019';
const claims=manifest.additionalFacts.map((fact,i)=>{
  const s=document.sources.find(s=>s.key===fact.sourceKey);
  if (!s || !fact.citations.length || !fact.citations.every(c=>s.units.some(u=>u.locationKey===c.locationKey && u.text.includes(c.quote)))) throw Error(`Additional fact ${i+1} lacks exact source support`);
  return { id:`qa-${String(i+1).padStart(3,'0')}`, text:fact.statement, sourceKey:s.key, citations:fact.citations, extractionConfidence:'high', uncertainties:fact.qualifications??[], conflictIds:[], reviewState:'candidate-only', extractionRunId:supplementalRun, baselineRunId:run.run_id, modelActuallyUsed:'none-deterministic-approved-source-qa', sourceReference:{priorExtractionRunId:run.run_id, sourceId:s.sourceId, sha256:s.sha256, method:'Source coverage QA of existing captured evidence; no model call or new ingestion'} };
});
const supplementalDocument={extractionRunId:supplementalRun,baselineRunId:run.run_id,modelActuallyUsed:'none-deterministic-approved-source-qa',claims,sources:document.sources,questions:[],conflicts:[]};
sql.push(`INSERT INTO thingamajob_extraction_runs(workspace_id,run_id,fingerprint,document_json,created_by,state) SELECT ${w},${q(supplementalRun)},${q(hash(JSON.stringify(supplementalDocument)))},${q(JSON.stringify(supplementalDocument))},${owner},'staged' WHERE ${job} ON CONFLICT DO NOTHING;`);
for (const c of claims) {
  const source=document.sources.find(s=>s.key===c.sourceKey), proposalId=uuid(run.workspace_id+supplementalRun+c.id), id=q(proposalId);
  const locator=`run:${supplementalRun}; candidate:${c.id}; ${c.citations[0].locationKey}`;
  sql.push(`INSERT INTO thingamajob_proposals(workspace_id,proposal_id,request_key,fingerprint,statement,proposer_attribution,proposer_actor_id) SELECT ${w},${id},${q('qa-'+supplementalRun+'-'+c.id)},${q(hash(JSON.stringify(c)))},${q(c.text)},'Approved archived-source coverage QA; deterministic; no model call',${owner} WHERE ${job} ON CONFLICT DO NOTHING;`);
  sql.push(`INSERT INTO thingamajob_proposal_sources(workspace_id,proposal_id,source_id,locator) SELECT ${w},${id},${q(source.sourceId)},${q(locator)} WHERE ${job} ON CONFLICT DO NOTHING;`);
  sql.push(`INSERT INTO thingamajob_assertion_history(workspace_id,proposal_id,version,operation,actor_id,statement) SELECT ${w},${id},1,'proposed',${owner},${q(c.text)} WHERE ${job} ON CONFLICT DO NOTHING;`);
  sql.push(`INSERT INTO thingamajob_extraction_candidates(workspace_id,run_id,candidate_id,proposal_id) SELECT ${w},${q(supplementalRun)},${q(c.id)},${id} WHERE ${job} ON CONFLICT DO NOTHING;`);
  sql.push(`INSERT INTO thingamajob_baseline_evaluations(workspace_id,run_id,candidate_id,proposal_id,category,reasons_json,policy_version,evidence_digest,execution_context) SELECT ${w},${q(supplementalRun)},${q(c.id)},${id},'baseline',${q(JSON.stringify(['Direct faithful approved-source fact; source scope, wording and historical qualifiers retained; no owner reconfirmation.']))},${q(policy)},${q(hash(JSON.stringify(c.citations)))},'authorized_test_policy' WHERE ${job} ON CONFLICT DO NOTHING;`);
}
mkdirSync(directory,{recursive:true});
writeFileSync(directory+'/apply.sql',sql.join('\n'));
writeFileSync(directory+'/supplemental-source-claims.json',JSON.stringify(supplementalDocument,null,2));
writeFileSync(directory+'/plan.json',JSON.stringify({workspaceId:run.workspace_id,runId:run.run_id,policy,manifestHash,sqlSha256:hash(sql.join('\n')),promoted:QA_DIRECT_CANDIDATES.length,usage:manifest.usage.length,retiredUnknowns:manifest.retireUnknowns.length,additionalFacts:claims.length,supplementalRun},null,2));
console.log(JSON.stringify({preparedOnly:true,promoted:QA_DIRECT_CANDIDATES.length,additionalFacts:claims.length,sqlSha256:hash(sql.join('\n'))}));
