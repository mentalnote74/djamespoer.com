import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evidenceFixture, signedEvidenceRequest, uploadForm } from './evidence-fixtures.mjs';
import { classifyBaseline, QA_SOURCE_RUN, QA_DIRECT_CANDIDATES } from './baseline-policy.ts';

async function fixture() {
  const f=evidenceFixture();
  for (const file of ['assertions.sql','claim-lifecycle.sql','unknowns.sql','extraction-staging.sql','baseline.sql','title-presentations.sql','source-contexts.sql','canonical-truth.sql']) f.db.exec(readFileSync(new URL(file,import.meta.url),'utf8'));
  const root='/api/thingamajob/workspaces/workspace-one';
  const post=async(path,body,key)=>f.worker.fetch(await signedEvidenceRequest(path,'one',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)}),f.env);
  const upload=await f.worker.fetch(await signedEvidenceRequest(root+'/evidence','one',{method:'POST',headers:{'Idempotency-Key':'source'},body:uploadForm()}),f.env);
  assert.equal(upload.status,200);
  const source=await upload.json();
  const ids=[];
  for(const text of ['Fictional automatic fact.','Fictional job with PRIVATE DEPARTURE.','Fictional duplicate.','Fictional historical summary.','Fictional rejected assertion.']) {
    const response=await post(root+'/assertions',{statement:text,proposerAttribution:'Fictional archive',evidence:[{sourceId:source.sourceId,locator:'fictional:p1'}]},'p'+ids.length);
    assert.equal(response.status,200);ids.push((await response.json()).proposalId);
  }
  f.db.prepare("INSERT INTO thingamajob_extraction_runs VALUES('workspace-one','run','fp','{}','actor-one','staged',unixepoch())").run();
  for(let i=0;i<ids.length;i++) {
    f.db.prepare("INSERT INTO thingamajob_extraction_candidates VALUES('workspace-one','run',?,?)").run('c'+i,ids[i]);
    f.db.prepare("INSERT INTO thingamajob_baseline_evaluations VALUES('workspace-one','run',?,?,'baseline','[]','policy','digest','authorized_test_policy',unixepoch())").run('c'+i,ids[i]);
  }
  const usage=(i,kind,override=null,target=null)=>f.db.prepare("INSERT INTO thingamajob_truth_usage VALUES('workspace-one',?,1,?,?,?,'Fictional QA','Fictional owner authorization',unixepoch())").run(ids[i],kind,override,target);
  usage(1,'usable','Fictional job.');usage(2,'duplicate',null,ids[0]);usage(3,'historical_only');
  const rejected=await post(root+'/assertions/'+ids[4]+'/review',{expectedVersion:1,decision:'rejected'},'reject');
  assert.equal(rejected.status,200);
  const unknown=await post(root+'/unknowns',{question:'Fictional test UNKNOWN?',reason:'Lifecycle-test residue',context:'Preserve original audit state'},'unknown');
  assert.equal(unknown.status,200);const u=await unknown.json();
  f.db.prepare("INSERT INTO thingamajob_unknown_retirements VALUES('workspace-one',?,'Test residue','Owner authorization',unixepoch())").run(u.unknownId);
  return {...f,ids,root,post,unknownId:u.unknownId};
}
test('canonical API preserves automatic truth, hides private/excluded/rejected/duplicate statements and retains duplicate provenance',async()=>{
  const f=await fixture();try {
    const response=await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth'),f.env);
    assert.equal(response.status,200);const body=await response.json();
    assert.equal(body.claims.length,2);assert.deepEqual(body.unknowns,[]);
    assert.ok(body.claims.every(c=>c.state==='source_established'));
    assert.equal(body.claims.find(c=>c.truthId===f.ids[0]).evidence.length,2);
    const wire=JSON.stringify(body);
    for(const forbidden of ['PRIVATE DEPARTURE','Fictional duplicate.','Fictional historical summary.','Fictional rejected assertion.','Fictional test UNKNOWN?']) assert.equal(wire.includes(forbidden),false);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_reviews').get().n,1);
    assert.equal(f.db.prepare("SELECT disposition FROM thingamajob_proposals WHERE proposal_id=?").get(f.ids[0]).disposition,'proposed');
    const overview=await(await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/workflow'),f.env)).json();
    assert.equal(JSON.stringify(overview).includes('PRIVATE DEPARTURE'),false);
    assert.equal(overview.baselineClaims.length,2);assert.deepEqual(overview.unknowns,[]);
    assert.equal(f.db.prepare('SELECT state FROM thingamajob_unknowns WHERE unknown_id=?').get(f.unknownId).state,'open');
    const audit=await f.worker.fetch(await signedEvidenceRequest(f.root+'/unknowns/'+f.unknownId),f.env);
    assert.equal(audit.status,200);const auditBody=await audit.json();assert.equal(auditBody.state,'open');assert.equal(auditBody.careerState,'retired_test');
    const other=await(await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth','two'),f.env)).json();
    assert.deepEqual(other.claims,[]);
    f.db.exec("UPDATE thingamajob_memberships SET active=0 WHERE actor_id='actor-one'");
    assert.equal((await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth'),f.env)).status,403);
  }finally{f.db.close();}
});
test('later rejection removes automatic fact and never resurrects duplicate support',async()=>{
  const f=await fixture();try {
    const result=await f.post(f.root+'/assertions/'+f.ids[0]+'/review',{expectedVersion:1,decision:'rejected'},'later-reject');
    assert.equal(result.status,200);
    const body=await(await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth'),f.env)).json();
    assert.equal(body.claims.length,1);assert.equal(body.claims[0].statement,'Fictional job.');
    f.db.prepare("INSERT INTO thingamajob_truth_usage VALUES('workspace-one',?,2,'private_only',NULL,NULL,'Private-only correction','Owner authorization',unixepoch())").run(f.ids[1]);
    const privateBody=await(await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth'),f.env)).json();
    assert.deepEqual(privateBody.claims,[]);
    assert.throws(()=>f.db.exec('DELETE FROM thingamajob_truth_usage'),/Immutable/);
    assert.throws(()=>f.db.exec('DELETE FROM thingamajob_unknown_retirements'),/Immutable/);
  }finally{f.db.close();}
});
test('source testimony approval is run-bound and still rejects missing citations',()=>{
  const c={id:QA_DIRECT_CANDIDATES[0],sourceKey:'resume',text:'Fictional team result.',extractionConfidence:'high',uncertainties:['Collective attribution.'],conflictIds:[],citations:[{locationKey:'p1',quote:'We built a fictional result.'}]};
  const doc={extractionRunId:QA_SOURCE_RUN,sources:[{key:'resume',sourceId:'source',sha256:'hash',units:[{locationKey:'p1',text:'We built a fictional result.'}]}],claims:[c],questions:[],conflicts:[]};
  assert.equal(classifyBaseline(doc).rows[0].category,'baseline');
  assert.equal(classifyBaseline({...doc,extractionRunId:'unapproved-run'}).rows[0].category,'qualified');
  assert.equal(classifyBaseline({...doc,claims:[{...c,citations:[{locationKey:'p1',quote:'Not in source.'}]}]}).rows[0].category,'invalid');
});
test('canonical consumer excludes explicitly superseded reviewed truth while audit remains intact',async()=>{
  const f=await fixture();try {
    const approved=await f.post(f.root+'/assertions/'+f.ids[0]+'/review',{expectedVersion:1,decision:'accepted'},'approve-old');
    assert.equal(approved.status,200);const old=(await approved.json()).claim;
    const source=f.db.prepare('SELECT source_id FROM thingamajob_evidence LIMIT 1').get().source_id;
    const proposed=await f.post(f.root+'/assertions',{statement:'Fictional accurate replacement.',proposerAttribution:'Fictional owner correction',evidence:[{sourceId:source,locator:'fictional:p2'}]},'replacement');
    assert.equal(proposed.status,200);const replacementProposal=(await proposed.json()).proposalId;
    const reviewed=await f.post(f.root+'/assertions/'+replacementProposal+'/review',{expectedVersion:1,decision:'accepted'},'approve-replacement');
    assert.equal(reviewed.status,200);const replacement=(await reviewed.json()).claim;
    const superseded=await f.post(f.root+'/claims/'+old.claimId+'/supersede',{replacementClaimId:replacement.claimId,expectedObsoleteVersion:1,expectedReplacementVersion:1,reason:'Fictional explicit correction'},'supersede');
    assert.equal(superseded.status,200);
    const body=await(await f.worker.fetch(await signedEvidenceRequest('/api/thingamajob/test/truth'),f.env)).json();
    assert.equal(body.claims.some(c=>c.claimId===old.claimId),false);
    assert.equal(body.claims.some(c=>c.claimId===replacement.claimId),true);
    assert.equal(f.db.prepare('SELECT count(*) n FROM thingamajob_claims').get().n,2);
  }finally{f.db.close();}
});

