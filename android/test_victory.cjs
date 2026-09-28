const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const p=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));try{
 await p.goto('http://127.0.0.1:4181');await p.waitForFunction(()=>window.shadowTest,{timeout:90000});
 await p.evaluate(async()=>{await shadowTest.command('new',0);await shadowTest.startDuel(false,shadowTest.state().run.routes[0]);});
 const result=await p.evaluate(async()=>{for(let i=0;i<1500&&shadowTest.state().run.stage==='duel';i++)await shadowTest.respond(shadowTest.engine().auto());return {stage:shadowTest.state().run.stage,gold:shadowTest.state().run.last_gold,reasons:shadowTest.state().run.last_rewards}});
 if(result.stage!=='shop')throw Error('Tutorial did not reach shop: '+result.stage);
 await p.waitForSelector('dialog[open]');if(!(await p.locator('dialog').innerText()).includes('COINS'))throw Error('No automatic victory receipt');
 if(Object.values(result.reasons).reduce((a,b)=>a+b,0)!==result.gold)throw Error('Receipt does not add up');
 await p.locator('[data-do="close"]').click();await p.screenshot({path:'android/build/shop.png'});
 const missing=await p.locator('.shop-product img').evaluateAll(images=>images.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));if(missing.length)throw Error('Missing item images '+missing);
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS real mobile duel -> victory receipt -> shop; exact earned gold and all item art');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
