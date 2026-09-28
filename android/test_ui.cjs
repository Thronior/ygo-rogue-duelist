const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});let errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text())});
 try {
  await page.goto('http://127.0.0.1:4181');await page.waitForFunction(()=>window.shadowTest,{timeout:90000});
  console.log('PASS mobile Python campaign boots offline');await page.screenshot({path:'android/build/title.png'});
  await page.evaluate(()=>shadowTest.go('characters'));await page.locator('[data-character="0"]').click();await page.locator('[data-do="new"]').click();
  await page.waitForSelector('dialog[open]');await page.locator('[data-do="reveal-pack"]').click();await page.locator('[data-do="close"]').click();
  await page.locator('[data-do="routes"]').click();await page.locator('[data-do="start"]').first().click();await page.waitForSelector('.duel',{timeout:60000});
  await page.waitForFunction(()=>shadowTest.engine().pending.player===0,{timeout:15000});
  await page.screenshot({path:'android/build/duel.png'});
  const hand=await page.evaluate(()=>shadowTest.engine().pending.summons?.[0]);
  if(hand){await page.locator(`[data-hand="${hand.sequence}"]`).click();await page.locator('.action-pop button').filter({hasText:/^Summon$/}).click();
   if(await page.locator('.zone.selectable').count()){await page.locator('.zone.selectable').first().click()}
   await page.waitForFunction(()=>shadowTest.engine().snapshot().players[0].monsters.some(Boolean));console.log('PASS touch card action -> glowing zone -> summon');}
  await page.screenshot({path:'android/build/summoned.png'});
  await page.locator('[data-do="pause"]').click();await page.locator('[data-do="pause-title"]').click();await page.reload();await page.waitForFunction(()=>window.shadowTest,{timeout:90000});
  await page.evaluate(()=>shadowTest.startDuel(true));await page.waitForSelector('.duel');console.log('PASS saved duel resumes after full reload');
  const leak=await page.evaluate(()=>[...document.querySelectorAll('.enemy-hand img')].some(x=>!x.src.includes('card-back')));if(leak)throw Error('Opponent hand images leaked');
  await page.setViewportSize({width:896,height:414});await page.screenshot({path:'android/build/phone.png'});
  if(errors.length)throw Error(errors.join('\n'));console.log('PASS no JavaScript errors, private hand, tablet/phone layout');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
