const {chromium,webkit}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const kind=process.argv[2]||'chromium';const browser=await (kind==='webkit'?webkit:chromium).launch({headless:true,...(kind==='chromium'?{channel:'chrome',args:['--mute-audio']}:{} )});
const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true,acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
try{
 await page.goto(process.env.PWA_URL||'http://127.0.0.1:4320/');await page.waitForFunction(()=>window.shadowTest,null,{timeout:180000});
 console.log(kind,'BOOT',await page.evaluate(()=>shadowTest.screen()));
 await page.screenshot({path:`pwa-${kind}-title.png`});
 const checks=await page.evaluate(async()=>{
  const {webStorage,validateSave}=await import('./pwa-storage.js');const original=await webStorage.load();
  const test=JSON.stringify({'run-2.json':'{"test":2}','run-3.json':'{"test":3}'});await webStorage.store(test);if(await webStorage.load()!==test)throw Error('Save roundtrip');
  let invalid=false;try{validateSave('{"../bad.json":"{}"}')}catch{invalid=true}if(!invalid)throw Error('Invalid import accepted');await webStorage.store(original);
  const meta=await fetch('content.json').then(r=>r.json());const {MobileDuel}=await import('./duel.js');const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init();
  const id=name=>meta.cards.find(c=>c.name===name).id;
  e.start(Array(40).fill(id('Wave-Motion Cannon')),Array(40).fill(id('Sparks')),8000,8000,5,777);
  let steps=0;while(!e.finished&&steps++<2000)e.respond(e.auto());
  if(!e.finished||e.errors.length)throw Error('Duel did not finish cleanly: '+e.errors);
  const result={steps,turns:e.turn,winner:e.finished,scriptCount:Object.keys(e.scripts).length};e.destroy();return result;
 });console.log(kind,'DUEL/SAVES',JSON.stringify(checks));
 await page.evaluate(async()=>{await shadowTest.command('settings',{music:0,sound:0});for(const slot of [1,2,3])await shadowTest.command('new',{character:0,slot});shadowTest.go('settings')});await page.locator('#web-app-options').click();
 await page.screenshot({path:`pwa-${kind}-settings.png`});
 const downloadPromise=page.waitForEvent('download');await page.locator('#web-export').click();const download=await downloadPromise;await download.saveAs(`pwa-${kind}-backup.json`);
 await page.locator('#web-offline').click();
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration('./'))?.active,null,{timeout:180000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:10000});
 console.log(kind,'OFFLINE CACHED',await page.evaluate(async()=>{const names=await caches.keys();return (await (await caches.open(names[0])).keys()).length}));
 // Exercise import through the real file picker handler and its overwrite confirmation.
 page.once('dialog',dialog=>dialog.accept());await page.locator('#web-file').setInputFiles(`pwa-${kind}-backup.json`);
 await page.waitForEvent('load');await page.waitForFunction(()=>window.shadowTest,null,{timeout:180000});
 assert.equal(await page.evaluate(()=>shadowTest.state().settings.music),0);
 const slots=await page.evaluate(async()=>{const {webStorage}=await import('./pwa-storage.js');const files=JSON.parse(await webStorage.load());return ['run.json','run-2.json','run-3.json'].every(name=>!!files[name]);});assert(slots);
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.shadowTest,null,{timeout:180000});
 console.log(kind,'OFFLINE BOOT',await page.evaluate(()=>shadowTest.screen()));
 const offlineDuel=await page.evaluate(async()=>{const m=await fetch('content.json').then(r=>r.json());const {MobileDuel}=await import('./duel.js');const e=await new MobileDuel(m.cards).init();e.start(Array(40).fill(m.cards.find(c=>c.name==='Sparks').id),Array(40).fill(m.cards.find(c=>c.name==='Sparks').id),8000,8000,5,123);let n=0;while(!e.finished&&n++<2000)e.respond(e.auto());const ok=!!e.finished&&!e.errors.length;e.destroy();return ok;});assert(offlineDuel);
 const range=await page.evaluate(async()=>{const r=await fetch('assets/music/champion-world.mp3',{headers:{Range:'bytes=0-99'}});return {status:r.status,size:(await r.arrayBuffer()).byteLength}});assert.deepEqual(range,{status:206,size:100});
 assert.deepEqual(errors,[]);console.log('PASS',kind);fs.writeFileSync(`pwa-${kind}-test.json`,JSON.stringify({kind,checks,offlineDuel,range,errors},null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
