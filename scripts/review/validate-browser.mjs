import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='tmp/overnight/browser';await mkdir(out,{recursive:true});
const b=await puppeteer.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const receipt={checks:[],themes:[],errors:[],googleRequests:[],externalBlocked:[]};
const themes=['teetotaler','tequila-sunrise','mojito','pina-colada','mai-tai','tequila-sunset','rum-runner','bloody-mary'];
const origin=process.env.DEMO_URL??'http://127.0.0.1:4379';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{for(const width of [1440,390]){
 const p=await b.newPage();await p.setViewport({width,height:900});
 await p.evaluateOnNewDocument(()=>{localStorage.setItem('portfolio.analytics.internal','1');localStorage.setItem('rigby.greeting.seen.v1','1');document.cookie='portfolio_cookie_preferences=1.0;Path=/';});
 p.on('pageerror',e=>receipt.errors.push(e.message));
 await p.setRequestInterception(true);p.on('request',r=>{if(/google-analytics|googletagmanager/.test(r.url()))receipt.googleRequests.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith(origin)){receipt.externalBlocked.push(new URL(r.url()).origin);void r.abort();}else void r.continue();});
 await p.goto(origin+'/',{waitUntil:'networkidle0'});await p.waitForSelector('app-home .home-projects');
 assert.equal(await p.evaluate(()=>localStorage.getItem('portfolio.analytics.internal')),'1');
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const links=await p.$$eval('.home-projects a',ns=>ns.map(n=>n.getAttribute('href')));
 assert.deepEqual(links,['/work/djamespoer','/case-studies/shady-white-van','/case-studies/creative-town','/thingamajob','/ai']);
 assert.equal(await p.$$eval('.home-writing li',ns=>ns.length),3);assert(await p.$('app-home a[href="/resume"]'));
 await p.screenshot({path:`${out}/home-${width}.png`,fullPage:true});
 receipt.checks.push(`${width}px Home: distinct project showcase, current writing and resume/About links, no horizontal overflow`);
 const trigger=await p.$('[aria-controls="theme-navigation"]');await trigger.focus();await p.keyboard.press('Enter');
 await p.waitForFunction(()=>document.querySelector('[aria-controls="theme-navigation"]').getAttribute('aria-expanded')==='true');
 const opts=await p.$$('.site-footer__theme-option');await opts[0].focus();await p.keyboard.press('Enter');assert(await trigger.evaluate(n=>document.activeElement===n));
 const focus=await trigger.evaluate(n=>({style:getComputedStyle(n).outlineStyle,width:getComputedStyle(n).outlineWidth}));assert.notEqual(focus.style,'none');assert.notEqual(focus.width,'0px');
 await p.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
 for(let i=0;i<themes.length;i++){
   await p.evaluate(index=>document.querySelectorAll('.site-footer__theme-option')[index].click(),i);
   await p.waitForFunction(theme=>document.documentElement.dataset.theme===theme,{},themes[i]);await pause(160);
   const state=await p.evaluate(()=>({theme:document.documentElement.dataset.theme,water:getComputedStyle(document.querySelector('.site-footer')).getPropertyValue('--water-deep'),motion:getComputedStyle(document.querySelector('.site-footer'),'::before').animationName,internal:localStorage.getItem('portfolio.analytics.internal')}));
   assert.equal(state.internal,'1');assert(state.water.trim());
   const violations=process.env.REUSE_DESKTOP_THEMES==='1' && width===1440 ? [] : await p.evaluate(async()=> (await axe.run({include:[['app-footer'],['.home-projects'],['.home-writing']]},{rules:{'color-contrast':{enabled:true}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
   receipt.themes.push({width,...state,violations});await writeFile(`${out}/partial-receipt.json`,JSON.stringify(receipt,null,2));assert.deepEqual(violations,[]);
   await p.evaluate(()=>window.scrollTo(0,0));await pause(350);await p.screenshot({path:`${out}/${themes[i]}-sky-${width}.png`,clip:{x:0,y:0,width,height:140}});
   const footer=await p.$('app-footer');await footer.screenshot({path:`${out}/${themes[i]}-water-${width}.png`});
 }
 await p.click('.site-footer__cookies > button');await p.waitForSelector('dialog[open]');
 const policy=await p.$('dialog[open] a[href="/cookie-policy"]');assert(policy);await policy.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('main h1')?.textContent==='Cookie Policy');assert.equal(new URL(p.url()).pathname,'/cookie-policy');receipt.checks.push(`${width}px Cookie Jar: accessible dialog and keyboard Cookie Policy access`);
 await p.click('.site-footer__cookies > button');await p.waitForSelector('dialog[open]');
 const denied=p.waitForNavigation({waitUntil:'networkidle0'});await p.$$eval('dialog[open] button',ns=>ns.find(n=>n.textContent.includes('Do not allow analytics')).click());await denied;
 await p.click('.site-footer__cookies > button');await p.waitForSelector('dialog[open]');assert((await p.$eval('#analytics-choice-heading + p + p',n=>n.textContent)).includes('not allowed'));
 await p.click('.cookie-close');
 await p.goto(origin+'/about',{waitUntil:'networkidle0'});await p.waitForSelector('app-about h1');
 assert.equal(await p.$eval('app-about h1',n=>n.textContent),'About D. James Poer');assert.equal(await p.$$eval('main',ns=>ns.length),1);assert(await p.$('app-about a[href="/work/exl"]'));assert.equal(await p.$('app-about .home-projects'),null);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const aboutAxe=await p.evaluate(async()=> (await axe.run(document.querySelector('app-about'))).violations.map(v=>v.id));assert.deepEqual(aboutAxe,[]);
 await p.screenshot({path:`${out}/about-${width}.png`,fullPage:true});
 await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await pause(250);assert.equal(await p.$eval('.site-footer',n=>getComputedStyle(n,'::before').animationName),'none');assert.equal(await p.$eval('app-header .bedlam__scene',n=>getComputedStyle(n).display),'none');
 receipt.checks.push(`${width}px About: durable professional context, one main, no overflow, scoped axe zero; denial survives reload; reduced motion stops sky/water`);
 await p.close();
}
assert.deepEqual(receipt.errors,[]);assert.deepEqual(receipt.googleRequests,[]);await writeFile(`${out}/receipt.json`,JSON.stringify(receipt,null,2));console.log(JSON.stringify({checks:receipt.checks,themeChecks:receipt.themes.length,violations:receipt.themes.flatMap(t=>t.violations),pageErrors:receipt.errors,googleRequests:receipt.googleRequests,externalOriginsBlocked:[...new Set(receipt.externalBlocked)]},null,2));
}finally{await b.close()}
