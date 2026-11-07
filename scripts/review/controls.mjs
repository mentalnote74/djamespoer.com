// Served by the loopback review server only. Never copied to public or imported by Angular.
const host = document.createElement('aside');
host.id = 'local-review';
host.setAttribute('aria-label','Local review controls');
const shadow = host.attachShadow({mode:'open'});
shadow.innerHTML = `<style>
:host{position:sticky;display:block;top:0;z-index:10000;font:14px/1.4 system-ui;color:#172d34;max-width:min(360px,calc(100vw - 24px))}details{max-height:60vh;overflow:auto;background:#fff;border:2px solid #254c5c;border-radius:8px;padding:8px;box-shadow:0 3px 15px #0003}summary{cursor:pointer;font-weight:700}label{display:block;margin-top:8px}select,button{font:inherit;padding:7px;margin:4px 3px 0 0;max-width:100%;background:#fff;color:#172d34;border:1px solid #254c5c;border-radius:4px}input{width:100%}button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #064daf;outline-offset:2px}p{margin:8px 0 0}nav{display:flex;gap:14px}a{color:#064daf}output{display:block}</style>
<details><summary>INTERNAL · Morning review</summary>
<nav><a href="/">Home</a><a href="/about">About</a><a href="#waterfront">Waterfront</a></nav>
<label>Living Theme<select id="theme"><option value="Dusk-to-Dusk">Natural cycle</option><option>Teetotaler</option><option>Tequila Sunrise</option><option>Mojito</option><option>Piña Colada</option><option>Mai Tai</option><option>Tequila Sunset</option><option>Rum Runner</option><option>Bloody Mary</option></select></label>
<button id="dawn">Dawn evolution</button><button id="dusk">Dusk evolution</button><button id="night">Night passage</button><button id="natural">Resume natural sky</button>
<label>Seek effect<input id="seek" type="range" min="0" max="100" value="0"></label>
<output id="status">Natural sky. Controls exist only on this local server.</output>
<p>Dawn/dusk: 39.6 seconds each; day: 24 seconds. Night: faint 21-second comet; opposite 1.4-second shooting star near its end. Seek or play to inspect.</p><button id="play">Play selected effect</button>
</details>`;
document.body.prepend(host);
document.querySelector('app-footer')?.setAttribute('id','waterfront');
const root=document.documentElement, $=s=>shadow.querySelector(s);
let mode='natural', start=0, duration=1, animation=0;
function selectTheme(label) {
 const option=Array.from(document.querySelectorAll('.site-footer__theme-option')).find(n=>n.textContent.trim()===label);
 if(!option) throw Error('Theme controls not ready; reload after startup');
 option.click();
 $('#theme').value=label;
}
function seek(fraction) {
 $('#seek').value=String(fraction*100);
 if(mode==='night') root.dataset.demoSkySeconds=String(fraction*25);
 else if(mode==='dawn'||mode==='dusk') root.dataset.demoLivingElapsed=String(start+fraction*duration);
 $('#status').textContent=mode==='natural'?'Natural sky.':`${mode}: ${(fraction*duration/1000).toFixed(1)} seconds · INTERNAL`;
}
function reset(){cancelAnimationFrame(animation);delete root.dataset.demoSkySeconds;delete root.dataset.demoLivingElapsed;mode='natural';}
$('#theme').addEventListener('change',()=>{reset();selectTheme($('#theme').value);$('#status').textContent='Static palette, continuously evolving sky · INTERNAL';});
for(const key of ['dawn','dusk','night']) $('#'+key).onclick=()=>{reset();mode=key;duration=key==='night'?25000:39600;start=key==='dawn'?24800:112400;selectTheme(key==='night'?'Rum Runner':'Dusk-to-Dusk');seek(0);};
$('#seek').oninput=()=>{cancelAnimationFrame(animation);seek(Number($('#seek').value)/100);};
$('#play').onclick=()=>{cancelAnimationFrame(animation);if(mode==='natural')return;const began=performance.now();function tick(now){const f=Math.min(.999,(now-began)/duration);seek(f);if(f<.999)animation=requestAnimationFrame(tick);}animation=requestAnimationFrame(tick);};
$('#natural').onclick=()=>{reset();selectTheme('Dusk-to-Dusk');$('#status').textContent='Natural sky resumed · INTERNAL';};
