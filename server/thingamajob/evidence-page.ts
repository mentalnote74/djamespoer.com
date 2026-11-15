export function evidencePage(workspaceId: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thingamajob TEST private evidence</title>
<style>body{font:1rem/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:45rem}label{display:block;margin-block:1rem}input{font:inherit;max-width:100%;box-sizing:border-box}input[type=text]{display:block;width:100%}button{font:inherit;padding:.6rem 1rem}:focus-visible{outline:3px solid #005fcc;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
</head><body><main data-workspace="${workspaceId}"><h1>TEST private evidence</h1>
<p>Select only a source you authorize for your private TEST workspace. PDF, DOCX, UTF-8 TXT or Markdown; maximum 10 MB. No career truth is promoted by uploading a document.</p>
<form id="intake"><label>Source file <input type="file" name="file" accept=".pdf,.docx,.txt,.md,.markdown" required></label>
<label>Attribution <input type="text" name="attribution" maxlength="1000" required aria-describedby="attribution-help"></label>
<p id="attribution-help">State who authored or supplied the source. This is your supplied provenance, not an external verification claim.</p>
<label>Source locator (optional) <input type="text" name="sourceLocator" maxlength="2000" aria-describedby="locator-help"></label>
<p id="locator-help">For example, a source reference or page range. This is recorded as text; links are not fetched.</p>
<label><input type="checkbox" required> I authorize storing this selected source privately in my TEST workspace.</label>
<button type="submit">Store private evidence</button></form>
<pre id="result" role="status" aria-live="polite"></pre><a id="download" hidden>Download unchanged original</a>
</main><script>
const form=document.getElementById('intake'),result=document.getElementById('result'),download=document.getElementById('download'),button=form.querySelector('button');
const base='/api/thingamajob/workspaces/'+encodeURIComponent(document.querySelector('main').dataset.workspace)+'/evidence';
let key=crypto.randomUUID();form.addEventListener('input',()=>{key=crypto.randomUUID();download.hidden=true;});
form.addEventListener('submit',async(event)=>{event.preventDefault();if(!form.reportValidity())return;
const file=form.elements.file.files[0];if(!file||file.size>10000000){result.textContent='Choose an allowed file no larger than 10 MB.';return;}
button.disabled=true;download.hidden=true;result.textContent='Storing your selected private source...';
try{const response=await fetch(base,{method:'POST',credentials:'same-origin',redirect:'error',headers:{'Idempotency-Key':key},body:new FormData(form)});
const data=await response.json();result.textContent='HTTP '+response.status+' '+JSON.stringify(data);
if(response.ok){download.href=base+'/'+encodeURIComponent(data.sourceId)+'/original';download.hidden=false;}}
catch{result.textContent='Evidence request failed. You may retry without changing the selected source.';}
finally{button.disabled=false;}});
</script></body></html>`;
}
