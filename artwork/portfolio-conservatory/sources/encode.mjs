import{execFileSync}from'node:child_process';import{stat,writeFile,readFile}from'node:fs/promises';import{createHash}from'node:crypto';
import{fileURLToPath}from'node:url';
const dir=fileURLToPath(new URL('../',import.meta.url));
const magick=process.env.MAGICK_BIN||'magick';
const layers=[
 {name:'background',source:'background-master.png',widths:[480,960],crop:[],avif:13,webp:28},
 {name:'foreground',source:'foreground-master.png',widths:[768,1440],crop:[],avif:48,webp:72},
 {name:'interior',source:'approved-master.png',widths:[384,768],crop:['-crop','900x520+1100+40','+repage'],avif:30,webp:48},
 {name:'reflections',source:'approved-master.png',widths:[480],crop:['-crop','2173x270+0+454','+repage'],avif:10,webp:25},
];const outputs=[];
for(const l of layers)for(const width of l.widths)for(const format of ['avif','webp']){
 const file=`${l.name}-${width}.${format}`;
 execFileSync(magick,[dir+'sources/'+l.source,...l.crop,'-resize',`${width}x`,'-strip','-quality',String(l[format]),dir+'assets/'+file]);
 outputs.push({file,bytes:(await stat(dir+'assets/'+file)).size,sha256:createHash('sha256').update(await readFile(dir+'assets/'+file)).digest('hex')});
}
const sources=[];for(const name of ['approved-master.png','foreground-master.png','background-master.png'])sources.push({file:'sources/'+name,sha256:createHash('sha256').update(await readFile(dir+'sources/'+name)).digest('hex'),geometry:execFileSync(magick,['identify','-format','%wx%h %[channels]',dir+'sources/'+name],{encoding:'utf8'})});
await writeFile(dir+'manifest.json',JSON.stringify({sourceSpace:[2172,724],sources,layers,outputs,backgroundOverscan:1.16,mobileViewport:{x:680,y:100,width:1440,height:480},interiorPlacement:{x:1100,y:40,width:900,height:520},reflectionsPlacement:{x:0,y:454,width:2172,height:270},generation:'Built-in imagegen. Approved scene and two registered layer edits. Original masters archival only.',qualityTarget:'assembled scene'},null,2));console.log(JSON.stringify(outputs));
