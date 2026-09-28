const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Win/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome',env:{...process.env,TEMP:process.cwd()+'/temp',TMP:process.cwd()+'/temp'}});try{
 const page=await browser.newPage({viewport:{width:924,height:416},hasTouch:true,isMobile:true});
 await page.setContent('<dialog id="modal" style="max-height:250px;overflow:auto"></dialog>');
 const source=fs.readFileSync('android/web/mobile.js','utf8');
 const functions=source.slice(source.indexOf('let inspectParent=null;'),source.indexOf('function setPreview'));
 await page.evaluate(code=>{
  window.modal=document.querySelector('#modal');window.esc=String;window.btn=(label)=>`<button data-close>${label}</button>`;window.removeActions=()=>{};
  window.image=()=>'';window.card=id=>({id,name:'Card '+id,data:{type:1},type:'Normal Monster',race:'Warrior',level:4,atk:1700,defense:1000,desc:'Test effect text'});window.state={run:{artifacts:[]}};window.screen='shop';
  window.eval(code+';window.ui={dialog,inspect,closeDialog};');
  ui.dialog('Booster 1 / 2','<div style="height:350px">First pack</div><button id="next">Next pack</button>');
  document.querySelector('#next').onclick=()=>ui.dialog('Booster 2 / 2','Second pack');
  window.savedNext=document.querySelector('#next');modal.scrollTop=40;window.savedScroll=modal.scrollTop;
  ui.inspect(1);
 },functions);
 assert.equal(await page.locator('.inspect').count(),1);
 await page.evaluate(()=>ui.closeDialog());
 assert.equal(await page.locator('h2').innerText(),'Booster 1 / 2');
 assert(await page.evaluate(()=>savedNext===document.querySelector('#next')),'original button and handler preserved');
 assert.equal(await page.evaluate(()=>modal.scrollTop),await page.evaluate(()=>savedScroll));
 await page.locator('#next').click();assert.equal(await page.locator('h2').innerText(),'Booster 2 / 2');
 await page.evaluate(()=>ui.inspect(2));await page.keyboard.press('Escape');assert.equal(await page.locator('h2').innerText(),'Booster 2 / 2');
 await page.evaluate(()=>ui.closeDialog());assert.equal(await page.locator('dialog[open]').count(),0);
 console.log('PASS 924x416 browser: inspection restores pack, scroll, button handler; second pack works; Escape returns; final close works');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
