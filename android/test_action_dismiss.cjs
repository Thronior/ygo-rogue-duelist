const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const source=fs.readFileSync('android/web/mobile.js','utf8');
const dismiss=source.slice(source.indexOf('function removeActions()'),source.indexOf('function legalCardActions('));
const show=source.slice(source.indexOf('function showCardActions('),source.indexOf('function selectionEntries('));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:924,height:416},hasTouch:true,isMobile:true});
 await page.setContent(`<style>body{margin:0;height:100vh}#preview{position:absolute;left:0;top:0;width:160px;height:100%}#phases{position:absolute;left:500px;top:160px}#card{position:absolute;left:350px;top:330px}.action-pop{position:fixed;background:#123;padding:8px}.action-pop button{display:block;width:150px;height:44px}</style><aside id="preview">Card details</aside><div id="phases"><button id="phase">Battle phase</button><button id="disabled" disabled>End phase</button></div><button id="card">Card</button>`);
 await page.addScriptTag({content:`let used=0,inspected=0,phases=0;function setPreview(){}function legalCardActions(){return [{label:'Activate',response:{}}]}function respond(){used++}function inspect(){inspected++;removeActions()}${dismiss}\n${show}\ndocument.querySelector('#card').onclick=e=>showCardActions(e.currentTarget,0,0,0,1);document.querySelector('#phase').onclick=()=>phases++;document.querySelector('#preview').addEventListener('pointerdown',e=>e.stopPropagation());`});
 const open=async()=>{await page.locator('#card').tap();assert.equal(await page.locator('.action-pop').count(),1)};
 await open();await page.locator('#preview').tap();assert.equal(await page.locator('.action-pop').count(),0);
 await open();await page.locator('#phase').tap();assert.equal(await page.locator('.action-pop').count(),0);assert.equal(await page.evaluate(()=>phases),1);
 await open();const disabled=await page.locator('#disabled').boundingBox();await page.touchscreen.tap(disabled.x+disabled.width/2,disabled.y+disabled.height/2);assert.equal(await page.locator('.action-pop').count(),0);
 await open();await page.touchscreen.tap(850,350);assert.equal(await page.locator('.action-pop').count(),0);
 await open();await page.getByRole('button',{name:'Activate',exact:true}).tap();assert.equal(await page.evaluate(()=>used),1);assert.equal(await page.locator('.action-pop').count(),0);
 await open();await page.getByRole('button',{name:'Inspect',exact:true}).tap();assert.equal(await page.evaluate(()=>inspected),1);assert.equal(await page.locator('.action-pop').count(),0);
 console.log('PASS 924x416 touch: outside details/phase/disabled phase/blank field dismiss; phase tap continues; Activate and Inspect remain usable.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
