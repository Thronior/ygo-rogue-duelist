const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');process.env.TEMP=process.env.TMP=path.resolve('temp');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const pages=await Promise.all([0,1].map(async()=>{const p=await browser.newPage({viewport:{width:924,height:416},hasTouch:true,isMobile:true});await p.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){this.muted=true;return Promise.resolve()}});await p.goto('http://127.0.0.1:4197/?tagtest=1');await p.locator('[data-menu="0"]').waitFor({timeout:120000});await p.locator('[data-menu="0"]').dispatchEvent('click');await p.locator('[data-tag="host"]').waitFor();return p}));
 const [host,guest]=pages;assert.equal(await host.locator('#tag-endpoint').count(),0);
 await host.waitForFunction(()=>[...document.images].every(i=>i.complete));await host.screenshot({path:path.resolve('temp/tag-simple-select.png')});
 const tiles=await host.locator('.tag-character-grid button').evaluateAll(xs=>xs.map(x=>{const r=x.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));assert(tiles.every(x=>x.bottom<=416));assert.equal(new Set(tiles.map(x=>Math.round(x.top))).size,6);
 await guest.locator('[data-tag="character"][data-id="1"]').click();await guest.locator('[data-tag="join"]').click();await guest.locator('#tag-code').fill('A');await guest.locator('[data-tag="join-room"]').click();await guest.getByText('Enter the five-character room code.').waitFor();
 await guest.screenshot({path:path.resolve('temp/tag-simple-join.png')});
 await guest.getByRole('button',{name:'Back',exact:true}).click();await guest.locator('[data-tag=host]').waitFor();await guest.locator('[data-tag=join]').click();
 await host.getByRole('button',{name:'Exit',exact:true}).waitFor();
 await host.locator('[data-tag="host"]').click();await host.getByText('1 / 2 players').waitFor();assert(await host.locator('[data-tag="start"]').isDisabled());await host.screenshot({path:path.resolve('temp/tag-simple-waiting.png')});
 await host.getByRole('button',{name:'Back',exact:true}).click();await host.locator('[data-tag=host]').waitFor();assert.equal(await host.getByRole('button',{name:'Back',exact:true}).count(),0);
 await host.locator('[data-tag=host]').click();await host.getByText('1 / 2 players').waitFor();
 const code=await host.evaluate(()=>tagTest.ui.session.code);await guest.locator('#tag-code').fill(code);await guest.locator('[data-tag="join-room"]').click();
 for(const p of pages)await p.getByText('2 / 2 players').waitFor({timeout:30000});
 assert.equal(await guest.locator('[data-tag="start"]').count(),0);await host.screenshot({path:path.resolve('temp/tag-simple-lobby.png')});
 for(const p of pages){const bounds=await p.locator('.tag-room').boundingBox();assert(bounds.y+bounds.height<=417);assert.equal(await p.locator('.tag-room-players img').count(),2)}
 await host.locator('[data-tag="start"]').click();for(const p of pages)await p.waitForFunction(()=>tagTest.ui.view.phase==='draft');
 for(const p of pages)assert.equal(await p.getByRole('button',{name:'Back',exact:true}).count(),0);
 console.log('PASS Back in hosting lobby and Join only, returns to character selection; Exit labels; simple room flow at 924x416: no URL field, validation, 1/2 waiting, 2/2 portraits, host-only start, synchronized draft');
 for(const p of pages)await p.evaluate(()=>tagTest.ui.session?.pause());
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
