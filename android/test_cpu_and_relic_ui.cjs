const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');process.env.TEMP=process.env.TMP=path.resolve('temp');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});try{
 const page=await browser.newPage({viewport:{width:924,height:416}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4198/mobile.css');await page.setContent('<link rel="stylesheet" href="/mobile.css"><main id="app"></main>');
 await page.evaluate(async()=>{window.meta=await fetch('/content.json').then(r=>r.json());const {CPUViewer}=await import('/cpu-viewer.js');window.viewer=new CPUViewer({root:document.querySelector('#app'),content:meta,inspect:id=>window.inspected=id,dialog:()=>{},onExit:()=>window.exited=true})});

 for(const [w,h] of [[924,416],[1600,720],[1024,600]]){await page.setViewportSize({width:w,height:h});await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});assert(await page.locator('[data-cpu=start]').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));await page.screenshot({path:path.resolve(`temp/cpu-picker-${w}.png`)})}
 await page.locator('[data-cpu=side][data-side="1"]').click();await page.locator('[data-cpu=tier][data-tier="2"]').click();assert.equal(await page.evaluate(()=>viewer.tiers[1]),2);
 await page.locator('[data-cpu=character][data-id="0"]').click();assert.equal(await page.evaluate(()=>viewer.characters[1]),0);assert.notEqual(...await page.evaluate(()=>viewer.characters));
 await page.setViewportSize({width:924,height:416});
 await page.locator('[data-cpu=start]').click();await page.waitForSelector('.cpu-watch');await page.locator('[data-cpu=pause]').click();assert(await page.evaluate(()=>viewer.paused));
 const prior=await page.evaluate(()=>JSON.stringify(viewer.state,(_,v)=>typeof v==='bigint'?String(v):v));
 const before=await page.evaluate(()=>viewer.history.length);await page.locator('[data-cpu=step]').click();assert((await page.evaluate(()=>viewer.history.length))>before);assert(await page.evaluate(()=>viewer.paused));
 const advanced=await page.evaluate(()=>JSON.stringify(viewer.state,(_,v)=>typeof v==='bigint'?String(v):v));
 await page.locator('[data-cpu=back]').click();await page.waitForSelector('.cpu-watch');assert(await page.evaluate(()=>viewer.paused));assert.equal(await page.evaluate(()=>JSON.stringify(viewer.state,(_,v)=>typeof v==='bigint'?String(v):v)),prior);
 await page.locator('[data-cpu=step]').click();assert.equal(await page.evaluate(()=>JSON.stringify(viewer.state,(_,v)=>typeof v==='bigint'?String(v):v)),advanced);
 assert(await page.locator('[data-cpu=back]').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));
 assert.equal(await page.locator('.cpu-watch .lpbar').count(),1);assert.equal(await page.locator('.cpu-watch .mat .zone').count(),30);assert.equal(await page.locator('.cpu-watch .enemy-hand img[src*="card-back"]').count(),0);await page.locator('.cpu-hand [data-cpu=inspect]').first().click();assert(await page.evaluate(()=>inspected>0&&viewer.paused));
 const seed=await page.evaluate(()=>viewer.seed);await page.locator('[data-cpu=restart]').click();await page.waitForSelector('.cpu-watch');assert.equal(await page.evaluate(()=>viewer.seed),seed);await page.locator('[data-cpu=pause]').click();

 await page.evaluate(()=>{for(let i=0;i<80&&!viewer.state.finished&&viewer.state.players.reduce((n,p)=>n+p.monsters.filter(Boolean).length,0)<3;i++)viewer.step()});
 assert(await page.locator('.mat .zone[data-cpu=inspect]').count()>0);assert.equal(await page.locator('.mat .zone[data-cpu=inspect] img[src*="card-back"]').count(),0);
 await page.locator('[data-cpu=reveal]').click();assert(await page.locator('.enemy-hand img[src*="card-back"]').count()>0);await page.locator('[data-cpu=reveal]').click();
 for(const [w,h] of [[924,416],[1600,720],[1280,720]]){await page.setViewportSize({width:w,height:h});assert(await page.locator('.cpu-field').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight));await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});await page.screenshot({path:path.resolve(`temp/cpu-viewer-${w}.png`)});}
 // Advance both AIs through a complete duel with no UI/user responses.
 const result=await page.evaluate(()=>{for(let i=0;i<2000&&!viewer.state.finished;i++)viewer.step();return {finished:viewer.state.finished,errors:viewer.engine.errors,decisions:viewer.history.filter(x=>x.includes('prompt ')).length}});assert(result.finished,'CPU duel completes');assert.deepEqual(result.errors,[]);
 await page.locator('[data-cpu=exit]').click();assert(await page.evaluate(()=>exited&&viewer.engine===null));
 // Render real tag character/shop UI using the same artwork helper as offline.
 await page.evaluate(async()=>{const {TagUI}=await import('/tag-ui.js');window.tag=new TagUI({root:document.querySelector('#app'),content:meta,profile:{unlocked:meta.playable},backend:async()=>{},image:id=>'assets/cards/'+id+'.jpg',inspect:()=>{},dialog:()=>{},onExit:()=>{}});tag.character=31;tag.render()});
 for(const [w,h] of [[924,416],[1600,720],[1024,600]]){await page.setViewportSize({width:w,height:h});await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img,svg image')].map(e=>{const i=new Image();i.src=e.src||e.getAttribute('href');return i.decode().catch(()=>{})}))});assert(await page.locator('.starting-relic-art>.relic-artwork').isVisible());await page.screenshot({path:path.resolve(`temp/relic-character-crop-${w}.png`)});}
 const fixture=JSON.parse(fs.readFileSync('temp/tag-ui-fixture.json','utf8'))[0];await page.evaluate(v=>{tag.session={code:'TEST2',seat:v.seat,peer:{seat:v.seat},connected:true,request:async()=>{}};tag.update(v)},fixture);
 for(const [w,h] of [[924,416],[1600,720],[1024,600]]){await page.setViewportSize({width:w,height:h});await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img,svg image')].map(e=>{const i=new Image();i.src=e.src||e.getAttribute('href');return i.decode().catch(()=>{})}))});assert.equal(await page.locator('.relics .relic-artwork').count(),3);await page.screenshot({path:path.resolve(`temp/relic-shop-crop-${w}.png`)});}
 assert.deepEqual(errors,[]);console.log('PASS CPU controls, replay seed, complete duel, cleanup and relic crops at phone/desktop sizes');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
