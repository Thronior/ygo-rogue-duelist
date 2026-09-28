const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome',args:['--mute-audio']});try{
 const page=await browser.newPage({viewport:{width:924,height:416}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4198/mobile.css');await page.setContent('<link rel="stylesheet" href="/mobile.css"><button id="under">Underlying shop</button>');
 await page.evaluate(async()=>{window.finale=await import('/exodia-finale.js');await finale.playExodiaFinale({player:0,reason:1})});assert.equal(await page.locator('.exodia-finale').count(),0);
 for(const [player,text,size,reason] of [[0,'You win',[924,416],16],[1,'You lose',[416,924],16],[0,'You win',[924,416],21],[1,'You lose',[416,924],21]]){
  await page.setViewportSize({width:size[0],height:size[1]});await page.evaluate(({player,reason})=>{window.started=performance.now();window.done=false;window.task=finale.playCardWin({player,reason}).then(()=>{window.elapsed=performance.now()-started;window.done=true})},{player,reason});
  await page.waitForSelector('.exodia-finale[open]');assert.equal(await page.locator('.exodia-finale-cards img').count(),5);assert.equal(await page.locator('.exodia-finale-result').textContent(),text);
  if(reason===21)assert.equal(await page.locator('.exodia-finale-cards img').evaluateAll(imgs=>imgs.map(i=>i.alt).join('')),'FINAL');
  assert.deepEqual(await page.evaluate(()=>{const a=document.querySelector('.exodia-finale-result').getAnimations()[0];return {duration:a.effect.getTiming().duration,frames:a.effect.getKeyframes().map(f=>[f.offset,Number(f.opacity)])}}),{duration:5000,frames:[[0,0],[.6,0],[.7,1],[1,1]]});
  await page.waitForTimeout(3650);
  assert(await page.evaluate(()=>[...document.querySelectorAll('.exodia-finale-cards img')].every(img=>{const r=img.getBoundingClientRect();return img.complete&&img.naturalWidth>0&&Number(getComputedStyle(img).opacity)===1&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})));
  assert.equal(await page.locator('.exodia-finale-result').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.evaluate(()=>done),false);
  await page.screenshot({path:'temp/finale-'+reason+'-'+player+'.png'});await page.evaluate(()=>task);const elapsed=await page.evaluate(()=>elapsed);assert(elapsed>=4900&&elapsed<6500,elapsed);assert.equal(await page.locator('.exodia-finale').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS five-card Exodia win/loss animation, five-second duration, final 1.5-second text hold, portrait/landscape fit and cleanup');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
