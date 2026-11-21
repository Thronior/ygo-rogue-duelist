// Tag trade requests (Nemu on Discord, user 2026-11-20), drawn by the real game from real TagCampaign views: the
// Teammate's cards tab shows their collection and deck, a tap sends a request, and the owner sees Requested labels.
// Start the web server first: PORT=4298 python -B tools/serve_qa.py ; then node android/test_tag_trade_requests.cjs [--web=...]
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const web=process.argv.find(a=>a.startsWith('--web='))?.slice(6)||'http://127.0.0.1:4298';
const shot=process.argv.find(a=>a.startsWith('--shot='))?.slice(7);
const fixtures=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'tag-trade-')),'views.json');
execFileSync(path.resolve('python/python.exe'),['tools/tag_trade_fixtures.py',fixtures],{stdio:'inherit'});
const views=JSON.parse(fs.readFileSync(fixtures,'utf8'));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:412,height:860}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('ygo-preload-visuals','sounds');HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});
 for(let attempt=0;;attempt++){await page.goto(web+'/?tagtest=1');try{await page.waitForFunction(()=>window.shadowTest,null,{timeout:90000});break}catch(error){if(attempt>=3)throw error}}
 await page.evaluate(()=>{document.querySelector('#modal')?.close();const b=document.createElement('button');b.dataset.do='tag';document.body.append(b);b.click();b.remove()});await page.waitForFunction(()=>window.tagTest?.ui);
 const show=view=>page.evaluate(view=>{const ui=tagTest.ui;window.sent=[];ui.session={code:'TEST2',seat:view.seat,peer:{seat:view.seat},connected:true,request:async(action,value)=>{window.sent.push([action,value])},stats:()=>null};ui.tab='deck';ui.tradeId=null;ui.update(structuredClone(view));const m=document.querySelector('#modal');if(m?.open)m.close()},view);
 const req=views.requester,own=views.owner,theirPool=req.trade.partner.pool;
 // Requester: two tabs; the teammate's tab lists their whole collection, their deck copies and the two requests.
 await show(req);
 assert.equal(await page.locator('.trade-sides button').count(),2,'Your cards / Teammate’s cards tabs');
 assert.equal(await page.locator('[data-tag="trade-card"]').count(),req.run.pool.length,'Your cards first');
 await page.click('[data-tag="trade-side"][data-side="theirs"]');
 assert.equal(await page.locator('[data-tag="trade-request"]').count(),theirPool.length,'teammate collection');
 assert.equal(await page.locator('[data-tag="trade-request"] small:text-is("In their deck")').count(),new Set(req.trade.partner.deck).size,'their deck copies marked');
 assert.equal(await page.locator('[data-tag="trade-request"].selected').count(),2,'the two requests are selected');
 assert.match(await page.locator('.tag-lock-in>span').innerText(),/^2 cards requested/);
 await page.click('[data-tag="trade-filter"][data-filter="Deck"]');
 assert.equal(await page.locator('[data-tag="trade-request"]').count(),new Set(req.trade.partner.deck).size,'In their deck filter');
 await page.click('[data-tag="trade-filter"][data-filter="All"]');
 await page.click('[data-tag="trade-request"][data-index="2"]');
 assert.deepEqual(await page.evaluate(()=>window.sent.map(([a,v])=>[a,v.cards])),[['trade-request',[0,1,2]]],'a tap sends the whole request list');
 assert.equal(await page.locator('[data-tag="trade-request"].selected').count(),3);
 await page.click('[data-tag="trade-request"][data-index="0"]');
 assert.deepEqual(await page.evaluate(()=>window.sent.at(-1)[1].cards),[1,2],'a second tap withdraws it');
 if(shot)await page.screenshot({path:shot+'-requester.png'});
 // Owner: Requested labels on its own copies and a Requested filter; tapping still only selects for Send.
 await show(own);
 assert.equal(await page.locator('[data-tag="trade-card"] small.trade-requested').count(),2,'owner sees 2 Requested labels');
 await page.click('[data-tag="trade-filter"][data-filter="Requested"]');
 assert.equal(await page.locator('[data-tag="trade-card"]').count(),2,'Requested filter');
 if(shot)await page.screenshot({path:shot+'-owner.png'});
 assert.deepEqual(errors,[]);console.log('PASS Tag trade requests UI: teammate tab, deck marks, request taps, owner labels and filter');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
