// A web start that crashes applies a waiting update by itself (2026-11-14); a normal start never restarts on its own.
const {chromium}=require('../require-module.cjs').requireModule('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=__dirname;
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});
for(const scenario of ['waiting-then-fail','fail-then-installed','no-fail']){
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://game.test/**',route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
  if(name==='index.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><body><script type="module" src="pwa.js"></script></body>'});
  const file=path.join(dir,name);if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
  route.fulfill({contentType:name.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)});});
 await page.addInitScript(scenario=>{
  const listeners={};const mk=state=>({state,posted:[],postMessage(m){this.posted.push(m)},addEventListener(t,f){(listeners['w'+t]??=[]).push(f)},removeEventListener(){}});
  const reg={active:mk('activated'),waiting:scenario==='waiting-then-fail'?mk('installed'):null,installing:null,updates:0,update(){this.updates++;return Promise.resolve()},addEventListener(t,f){(listeners['r'+t]??=[]).push(f)}};
  window.__reg=reg;window.__fire=(t)=>{for(const f of listeners[t]||[])f()};
  Object.defineProperty(navigator,'serviceWorker',{value:{getRegistration:()=>Promise.resolve(reg),register:()=>Promise.resolve(reg),addEventListener(){},controller:reg.active}});
  window.confirm=()=>true;
 },scenario);
 await page.goto('https://game.test/');await page.waitForTimeout(300);
 if(scenario!=='no-fail'){await page.evaluate(()=>{document.documentElement.dataset.bootFailed='true';window.dispatchEvent(new Event('ygo-boot-failed'))});}
 if(scenario==='fail-then-installed'){
  assert.equal(await page.evaluate(()=>__reg.updates),1,'asks for an update');
  await page.evaluate(()=>{const w={state:'installing',posted:[],ls:[],postMessage(m){this.posted.push(m)},addEventListener(t,f){this.ls.push(f)},removeEventListener(){}};__reg.installing=w;__fire('rupdatefound');w.state='installed';__reg.installing=null;__reg.waiting=w;w.ls.forEach(f=>f())});
 }
 await page.waitForTimeout(100);
 const posted=await page.evaluate(()=>(__reg.waiting?.posted||[]).map(m=>m.type));
 if(scenario==='no-fail')assert.deepEqual(posted,[],'normal start never restarts by itself');else assert.deepEqual(posted,['SKIP_WAITING'],scenario);
 assert.deepEqual(errors,[]);console.log('ok',scenario);await page.close();
}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
