// Focused regression: footer disclosure must reveal its content, not open below the viewport.
import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  for (const width of [1440,390]) {
    const page = await browser.newPage();
    await page.setViewport({width,height:600});
    await page.evaluateOnNewDocument(()=>localStorage.setItem('portfolio.analytics.internal','1'));
    await page.goto((process.env.DEMO_URL ?? 'http://127.0.0.1:4371')+'/about',{waitUntil:'networkidle0'});
    const trigger = await page.waitForSelector('.site-footer__accessibility');
    for (const input of ['pointer','Enter','Space']) {
      await trigger.focus();
      if (input==='pointer') await trigger.click(); else await page.keyboard.press(input);
      await page.waitForFunction(()=>{const h=document.querySelector('#accessibility-statement-heading'),r=h?.getBoundingClientRect();return document.activeElement===h && r.top>=0 && r.bottom<=innerHeight;});
      const result=await page.evaluate(()=>{
        const heading=document.querySelector('#accessibility-statement-heading'),rect=heading.getBoundingClientRect();
        return {expanded:document.querySelector('.site-footer__accessibility').getAttribute('aria-expanded'),visible:rect.top>=0 && rect.bottom<=innerHeight,internal:localStorage.getItem('portfolio.analytics.internal')};
      });
      assert.deepEqual(result,{expanded:'true',visible:true,internal:'1'});
      if(input==='pointer') await page.click('#accessibility-statement button'); else await page.keyboard.press('Escape');
      await page.waitForFunction(()=>!document.querySelector('#accessibility-statement'));
      assert(await trigger.evaluate(n=>n===document.activeElement));
      assert.equal(await trigger.evaluate(n=>n.getAttribute('aria-expanded')),'false');
    }
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    await trigger.click();
    await page.waitForFunction(()=>{const h=document.querySelector('#accessibility-statement-heading'),r=h?.getBoundingClientRect();return document.activeElement===h && r.top>=0 && r.bottom<=innerHeight;});
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('app-footer'))).violations.map(x=>x.id));
    assert.deepEqual(violations,[]);
    console.log(`${width}px: pointer/Enter/Space reveal focused heading in viewport; Close/Escape return focus; scoped axe zero; INTERNAL`);
    await page.close();
  }
} finally {await browser.close();}
