// TEST-only bootstrap/acceptance surface. Browser never reads Access cookies.
export const testStartPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thingamajob TEST workspace setup</title>
<style>body{font:1rem/1.6 system-ui;margin:2rem auto;padding:0 1rem;max-width:45rem}button{font:inherit;padding:.6rem 1rem}button:focus-visible{outline:3px solid #005fcc;outline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>
</head><body><main><h1>Thingamajob TEST workspace setup</h1>
<p>Sign in using your own Cloudflare Access identity. Continue creates or reuses only your own TEST workspace.</p>
<button type="button" id="continue">Continue and check access</button>
<pre id="result" role="status" aria-live="polite"></pre>
</main><script>
const button=document.getElementById('continue'),result=document.getElementById('result');
button.addEventListener('click',async()=>{
button.disabled=true;result.textContent='Checking your TEST workspace…';
try{
const bootstrap=await fetch('/api/thingamajob/bootstrap',{method:'POST',credentials:'same-origin'});
if(!bootstrap.ok)throw new Error('Workspace setup returned HTTP '+bootstrap.status);
const data=await bootstrap.json();
const own=await fetch('/api/thingamajob/workspaces/'+encodeURIComponent(data.workspaceId)+'/access',{credentials:'same-origin',redirect:'error'});
const ownBody=await own.json();
const other=await fetch('/api/thingamajob/test/reference-access',{credentials:'same-origin',redirect:'error'});
const otherBody=await other.json();
result.textContent='Owned workspace: HTTP '+own.status+' — '+JSON.stringify(ownBody)+'\\nReference workspace: HTTP '+other.status+' — '+JSON.stringify(otherBody);
}catch(error){result.textContent=error instanceof Error?error.message:'TEST check failed.';}
finally{button.disabled=false;}
});
</script></body></html>`;
