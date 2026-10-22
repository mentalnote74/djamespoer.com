import{execFileSync}from'node:child_process';import{readFile,writeFile,stat}from'node:fs/promises';import{createHash}from'node:crypto';import{resolve}from'node:path';
const root=resolve(process.argv[2]||new URL('../',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const magick=process.env.MAGICK_BIN||'magick';
const config=JSON.parse(await readFile(root+'/sources/layers.json','utf8'));
const outputs=[];
for(const l of config.layers)for(const width of l.widths)for(const format of['avif','webp']){
 const file=`${l.name}-${width}.${format}`;
 execFileSync(magick,[root+'/sources/'+l.source,...(l.crop||[]),'-resize',`${width}x`,'-strip','-quality',String(l[format]),root+'/assets/'+file]);
 outputs.push({file,bytes:(await stat(root+'/assets/'+file)).size,sha256:createHash('sha256').update(await readFile(root+'/assets/'+file)).digest('hex')});
}
const sources=[];for(const name of[...new Set(config.layers.map(l=>l.source))])sources.push({file:'sources/'+name,sha256:createHash('sha256').update(await readFile(root+'/sources/'+name)).digest('hex'),geometry:execFileSync(magick,['identify','-format','%wx%h %[channels]',root+'/sources/'+name],{encoding:'utf8'})});
await writeFile(root+'/manifest.json',JSON.stringify({...config,sources,outputs},null,2));console.log(JSON.stringify(outputs.map(({file,bytes})=>({file,bytes}))));
