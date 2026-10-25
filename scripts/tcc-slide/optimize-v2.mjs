import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const master=root+'artwork/tcc/v2/sculpture/master.png';
const target=root+'public/assets/tcc-slide/v2/';
const magick='C:/Program Files/ImageMagick-7.1.2-Q16-HDRI/magick.exe';
await mkdir(target,{recursive:true});
const layers=[
 {name:'sculpture',widths:[768,1440,2172],crop:[],avif:48,webp:76},
 {name:'sculpture-mobile',widths:[384,768],crop:['-crop','1440x480+620+145','+repage'],avif:46,webp:74},
 {name:'depth',widths:[480],crop:['-crop','1030x340+880+180','+repage','-background','#10161f','-alpha','remove','-alpha','off'],avif:12,webp:25},
];
const outputs=[];
for(const layer of layers) for(const width of layer.widths) for(const format of ['avif','webp']) {
 const name=`${layer.name}-${width}.${format}`;
 execFileSync(magick,[master,...layer.crop,'-resize',`${width}x`,'-strip','-quality',String(layer[format]),target+name]);
 outputs.push({file:name,bytes:(await stat(target+name)).size});
}
await writeFile(root+'artwork/tcc/v2/sculpture/source.json',JSON.stringify({master:'master.png',sha256:createHash('sha256').update(await readFile(master)).digest('hex'),dimensions:[2172,724],generation:'built-in imagegen',layers,outputs,qualityTarget:'assembled desktop/mobile scene; sharp alpha foreground, severely compressed obscured moving depth, native CSS atmosphere',regenerate:'node scripts/tcc-slide/optimize-v2.mjs'},null,2)+'\n');
console.log(JSON.stringify(outputs));
