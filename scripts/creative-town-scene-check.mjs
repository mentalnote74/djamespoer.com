import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('public'),out=path.resolve('tmp/town-evidence');
await fs.mkdir(out,{recursive:true});
const server=process.env.TOWN_URL?null:http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(data);}catch{res.writeHead(404).end();}
});
if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.TOWN_URL||'http://127.0.0.1:'+server.address().port;
const count=Number(process.argv.find(a=>a.startsWith('--seeds='))?.split('=')[1]||process.env.TOWN_DRAWS||24);
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(base)||r.url().startsWith('data:')?r.continue():r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(()=>{
  let seed=Number(new URL(location.href).searchParams.get('seed'))||1;
  const next=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  Math.random=next;crypto.getRandomValues=array=>{for(let i=0;i<array.length;i++)array[i]=Math.floor(next()*4294967296);return array;};
 });
 for(let seed=1;seed<=count;seed++) {
  await page.setViewport({width:seed%2?1440:390,height:1100});
  await page.goto(`${base}/creative-town-hero/?seed=${seed}`,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.documentElement.dataset.placementReady==='true',{timeout:60000});
  const draw=await page.evaluate(()=>{
   const W=1664,H=936,world=document.querySelector('#world'),origin=world.getBoundingClientRect(),scale=origin.width/W;
   const ownership=new Uint8Array(W*H),pairs=new Map(),tables=new Map(),clipped=new Set(),large=[],grid=Array(12).fill(0);
   const zones=townHeroLayout.zones;
   const nodes=[...document.querySelectorAll('#placed-residents [data-actor]')];
   for(let n=0;n<nodes.length;n++) {
    const node=nodes[n],img=node.querySelector('img'),r=img.getBoundingClientRect();
    const box={x:(r.left-origin.left)/scale,y:(r.top-origin.top)/scale,w:r.width/scale,h:r.height/scale};
    const factor=Math.min(box.w/img.naturalWidth,box.h/img.naturalHeight),iw=img.naturalWidth*factor,ih=img.naturalHeight*factor;
    const x=box.x+(box.w-iw)/2,y=box.y+box.h-ih,wx=Math.floor(x),wy=Math.floor(y);
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(iw)+2;canvas.height=Math.ceil(ih)+2;
    const ctx=canvas.getContext('2d');
    if(getComputedStyle(img).transform.startsWith('matrix(-1')){ctx.translate(iw+x-wx,y-wy);ctx.scale(-1,1);ctx.drawImage(img,0,0,iw,ih);}
    else ctx.drawImage(img,x-wx,y-wy,iw,ih);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++) {
     if(pixels[(py*canvas.width+px)*4+3]<=16)continue;
     const gx=wx+px,gy=wy+py;if(gx<0||gy<0||gx>=W||gy>=H){clipped.add(node.dataset.actor);continue;}
     const old=ownership[gy*W+gx];if(old&&old!==n+1){const key=[nodes[old-1].dataset.actor,node.dataset.actor].sort().join('/');pairs.set(key,(pairs.get(key)||0)+1);}
     ownership[gy*W+gx]=n+1;
     for(const z of zones)if(gx>=z[0]&&gx<z[0]+z[2]&&gy>=z[1]&&gy<z[1]+z[3])tables.set(node.dataset.actor,(tables.get(node.dataset.actor)||0)+1);
    }
    const cx=Math.min(3,Math.max(0,Math.floor((x+iw/2)/(W/4)))),cy=Math.min(2,Math.max(0,Math.floor((y+ih/2)/(H/3))));grid[cy*4+cx]++;
    if(['scoob-and-shag','marmaduke'].includes(node.dataset.actor))large.push({id:node.dataset.actor,width:iw,height:ih,foot:y+ih});
   }
   return {layoutMs:townHeroLayout.layoutMs,attempts:townHeroLayout.attempts,selected:townHeroLayout.actors.length,visible:nodes.length,conflicts:townHeroLayout.conflicts,pairs:[...pairs],tables:[...tables],clipped:[...clipped],large,grid,dimensions:[parseFloat(getComputedStyle(world).width),parseFloat(getComputedStyle(world).height)]};
  });
  console.log(seed,JSON.stringify(draw));
  assert.deepEqual(errors,[]);assert.deepEqual(draw.dimensions,[1664,936]);assert.equal(draw.visible,draw.selected,'retain every selected resident');assert.deepEqual(draw.conflicts,[]);
  assert.deepEqual(draw.pairs,[],'native opaque artwork must not overlap');assert.deepEqual(draw.tables,[],'no artwork in table exclusion zones');assert.deepEqual(draw.clipped,[],'whole artwork stays in frame');
  for(const a of draw.large)if(a.foot>=650)assert.ok(a.height>=(a.id==='scoob-and-shag'?150:125),'large characters retain credible scale');
  if(seed<=2)await page.screenshot({fullPage:true,path:path.join(out,'draw-'+seed+'.png')});
 }
}finally{await browser.close();server?.close();}
