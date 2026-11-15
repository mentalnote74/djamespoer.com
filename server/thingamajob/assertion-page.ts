export function assertionPage(workspaceId: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thingamajob TEST owner review</title><style>body{font:1rem/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:45rem}label{display:block;margin-block:1rem}input,textarea,select{font:inherit;width:100%;max-width:100%;box-sizing:border-box}textarea{min-height:7rem}button{font:inherit;padding:.6rem 1rem;margin:.25rem}:focus-visible{outline:3px solid #005fcc;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
</head><body><main data-workspace="${workspaceId}"><h1>TEST owner assertion review</h1>
<p>A proposal is not career truth. Only your explicit owner review can create a reviewed claim. No evidence-strength or job-evaluation rating is assigned.</p>
<form id="proposal"><label>Proposed statement <textarea name="statement" maxlength="4000" required></textarea></label>
<label>Proposer attribution <input name="attribution" maxlength="1000" required aria-describedby="attribution-help"></label><p id="attribution-help">Describe who supplied the wording. Attribution does not give another person or AI review authority.</p>
<label>Supporting evidence <select name="source" required><option value="">Loading your evidence...</option></select></label>
<label>Supporting locator (optional) <input name="locator" maxlength="2000"></label>
<button type="submit" id="create" disabled>Create proposal only</button></form>
<section id="review" hidden><h2>Explicit owner decision</h2><pre id="original"></pre>
<label>Corrected statement (required for Correct) <textarea id="correction" maxlength="4000"></textarea></label>
<button type="button" data-decision="accepted">Accept</button><button type="button" data-decision="rejected">Reject</button><button type="button" data-decision="corrected">Correct</button></section>
<pre id="result" role="status" aria-live="polite"></pre></main><script>
const form=document.getElementById('proposal'),result=document.getElementById('result'),review=document.getElementById('review'),create=document.getElementById('create');
const base='/api/thingamajob/workspaces/'+encodeURIComponent(document.querySelector('main').dataset.workspace);
let proposal=null,proposalKey=crypto.randomUUID(),decisionKey=null,decisionBody=null;
form.addEventListener('input',()=>{proposalKey=crypto.randomUUID();});
(async()=>{try{const response=await fetch(base+'/evidence',{credentials:'same-origin',redirect:'error'});if(!response.ok)throw new Error();const data=await response.json();
form.elements.source.replaceChildren(new Option('Choose your source',''));for(const source of data.sources)form.elements.source.add(new Option(source.filename,source.sourceId));
create.disabled=data.sources.length===0;if(!data.sources.length)result.textContent='Upload an authorized source through the TEST evidence page first.';}catch{result.textContent='Your evidence list is unavailable.';}})();
form.addEventListener('submit',async(event)=>{event.preventDefault();if(!form.reportValidity())return;create.disabled=true;
try{const body={statement:form.elements.statement.value,proposerAttribution:form.elements.attribution.value,evidence:[{sourceId:form.elements.source.value,locator:form.elements.locator.value}]};
const response=await fetch(base+'/assertions',{method:'POST',credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json','Idempotency-Key':proposalKey},body:JSON.stringify(body)});
const data=await response.json();result.textContent='HTTP '+response.status+' '+JSON.stringify(data);if(!response.ok)return;
proposal=data;decisionKey=null;decisionBody=null;document.getElementById('original').textContent=data.statement;review.hidden=data.reviewDisposition!=='proposed';}
catch{result.textContent='Proposal request failed; retry without changing the form.';}finally{create.disabled=false;}});
for(const button of review.querySelectorAll('button'))button.addEventListener('click',async()=>{
if(!proposal)return;const body={decision:button.dataset.decision,expectedVersion:proposal.version};
if(body.decision==='corrected'){body.correctedStatement=document.getElementById('correction').value;if(!body.correctedStatement.trim()){result.textContent='Enter corrected wording before selecting Correct.';document.getElementById('correction').focus();return;}}
const serialized=JSON.stringify(body);if(serialized!==decisionBody){decisionKey=crypto.randomUUID();decisionBody=serialized;}
for(const item of review.querySelectorAll('button'))item.disabled=true;
try{const response=await fetch(base+'/assertions/'+encodeURIComponent(proposal.proposalId)+'/review',{method:'POST',credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json','Idempotency-Key':decisionKey},body:serialized});
const data=await response.json();result.textContent='HTTP '+response.status+' '+JSON.stringify(data);if(response.ok){proposal=data;review.hidden=true;}}
catch{result.textContent='Review request failed; retry the same decision to recover its result.';}finally{for(const item of review.querySelectorAll('button'))item.disabled=false;}});
</script></body></html>`;
}
