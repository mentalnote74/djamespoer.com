/** Disposable direct-URL harness. No client truth data, credentials, storage, or product UI. */
export const jdHarnessPage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Thingamajob evaluator test</title>
  <link rel="stylesheet" href="/test/thingamajob/style.css">
  <script src="/test/thingamajob/harness.js" defer></script>
</head>
<body><main>
  <h1>Thingamajob evaluator test</h1>
  <p>Paste a job description to evaluate it against James's canonical Library of Truth. Evaluation does not change the Library of Truth.</p>
  <form id="evaluation-form">
    <label for="job-description">Job description</label>
    <textarea id="job-description" name="jobDescription" rows="14" minlength="20" maxlength="90000" required></textarea>
    <button type="submit">Evaluate job description</button>
  </form>
  <p id="status" role="status" aria-live="polite"></p>
  <section id="result" aria-labelledby="result-heading" hidden>
    <h2 id="result-heading" tabindex="-1">Evaluation</h2>
    <p>MET: established by canonical evidence. NOT MET: explicitly incompatible canonical evidence. UNKNOWN: not established by the available evidence.</p>
    <p id="summary"></p>
    <div id="requirements"></div>
  </section>
</main></body></html>`;

export const jdHarnessStyles = `
html{color-scheme:light dark;font-family:system-ui,sans-serif;line-height:1.6}
body{margin:0;background:Canvas;color:CanvasText}
main{max-width:56rem;margin:auto;padding:clamp(1rem,4vw,2rem)}
label{display:block;font-weight:600}
textarea{display:block;box-sizing:border-box;width:100%;resize:vertical;padding:.75rem;margin:.4rem 0 1rem;font:inherit;background:Field;color:FieldText;border:1px solid GrayText;border-radius:.25rem}
button{min-height:44px;padding:.6rem 1rem;font:inherit;cursor:pointer}
:is(button,textarea,h2):focus-visible{outline:3px solid Highlight;outline-offset:3px}
button:disabled{cursor:wait}
p,li,h3,blockquote{overflow-wrap:anywhere}
blockquote{margin:1rem 0;padding-inline-start:1rem;border-inline-start:2px solid GrayText}
.requirement{margin-block:2rem;padding-block-start:1rem;border-block-start:1px solid GrayText}
[hidden]{display:none!important}
`;

export const jdHarnessScript = `
'use strict';
const form=document.getElementById('evaluation-form');
const input=document.getElementById('job-description');
const button=form.querySelector('button');
const status=document.getElementById('status');
const result=document.getElementById('result');
const requirements=document.getElementById('requirements');
function text(parent,tag,value){const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(button.disabled||!form.reportValidity())return;
  button.disabled=true;result.hidden=true;requirements.replaceChildren();
  status.textContent='Evaluating against the canonical Library of Truth. This may take a minute.';
  try{
    const response=await fetch('/test/thingamajob/evaluate',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({jobDescription:input.value})
    });
    const data=await response.json();
    if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Evaluation could not complete.');
    if(data.state!=='complete'||!Array.isArray(data.requirements))throw new Error('The evaluation response could not be read.');
    const counts={MET:0,'NOT MET':0,UNKNOWN:0};
    for(const item of data.requirements){
      if(Object.hasOwn(counts,item.outcome))counts[item.outcome]++;
      const section=document.createElement('section');section.className='requirement';
      text(section,'h3',item.requirement);
      text(section,'p',item.outcome+' · '+(item.importance==='unspecified'?'Priority not stated':item.importance));
      text(section,'blockquote',item.jdQuote);
      text(section,'p',item.reasoning);
      if(Array.isArray(item.evidence)&&item.evidence.length){
        text(section,'h4','Supporting canonical evidence');
        const list=document.createElement('ul');
        for(const fact of item.evidence){const li=text(list,'li',fact.statement);for(const qualification of fact.qualifications||[])text(li,'p',qualification);}
        section.append(list);
      }
      if(item.question)text(section,'p','Needs clarification: '+item.question);
      requirements.append(section);
    }
    document.getElementById('summary').textContent='Compared with '+data.canonicalTruthCount+' canonical truths. MET: '+counts.MET+' · NOT MET: '+counts['NOT MET']+' · UNKNOWN: '+counts.UNKNOWN;
    result.hidden=false;status.textContent='Evaluation complete. The Library of Truth was not changed.';
    document.getElementById('result-heading').focus();
  }catch(error){status.textContent=(error instanceof Error?error.message:'Evaluation could not complete.')+' Your description is retained; try again.';}
  finally{button.disabled=false;}
});
`;
