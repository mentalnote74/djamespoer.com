export const storageRoundtripPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thingamajob TEST synthetic storage check</title>
<style>body{font:1rem/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:45rem}button{font:inherit;padding:.6rem 1rem}button:focus-visible{outline:3px solid #005fcc;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
</head><body><main><h1>TEST synthetic storage check</h1>
<p>This stores one tiny fictional fixture in your existing TEST workspace, commits its metadata/history, and verifies the private original. No career evidence is uploaded.</p>
<p>Repeat the check in this page to verify the same request is safely replayed.</p>
<button type="button" id="run">Run synthetic check</button><pre id="result" role="status" aria-live="polite"></pre>
</main><script>
const button=document.getElementById('run'),result=document.getElementById('result'),key=crypto.randomUUID();
button.addEventListener('click',async()=>{button.disabled=true;result.textContent='Checking storage...';
try{const response=await fetch('/api/thingamajob/test/storage-roundtrip',{method:'POST',credentials:'same-origin',redirect:'error',headers:{'Idempotency-Key':key}});
result.textContent='HTTP '+response.status+' '+JSON.stringify(await response.json());}
catch{result.textContent='TEST check failed.';}finally{button.disabled=false;}});
</script></body></html>`;
