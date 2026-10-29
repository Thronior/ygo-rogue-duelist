// Animated backgrounds follow scene changes (pages and dialogs) but ignore effect elements
// such as LP floats that duels append to <body> during animations.
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const web=path.join(__dirname,'web');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.join(web,decodeURIComponent(req.url.split('?')[0]));if(req.url==='/test'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><main id="app"></main><dialog id="modal"></dialog>');return}if(!file.startsWith(web)||!fs.existsSync(file)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/test`);
  const result=await page.evaluate(async()=>{
   const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const {installVectorBackgrounds}=await import('/vector-backgrounds.js');
   const app=document.querySelector('#app'),modal=document.querySelector('#modal');
   app.innerHTML='<section class="title"></section>';
   installVectorBackgrounds(app,modal,()=>({simpleBackgrounds:true}));await frame();
   const scene=()=>document.querySelector('.game-vector-background .bg-stage')?.dataset.scene;
   const host=()=>document.querySelector('.game-vector-background')?.parentElement;
   const steps={title:scene()};
   // Count refreshes through the background stage's layout read.
   let reads=0;const original=Document.prototype.querySelectorAll;
   Document.prototype.querySelectorAll=function(selector){if(selector==='dialog[open]')reads++;return original.call(this,selector)};
   for(let i=0;i<20;i++){const fx=document.createElement('div');fx.className='lp-float';document.body.append(fx);await frame();fx.remove();await frame()}
   steps.readsFromEffects=reads;Document.prototype.querySelectorAll=original;
   const reward=document.createElement('dialog');reward.className='pack-theatre';document.body.append(reward);reward.show();await frame();
   steps.reward=scene();steps.rewardHost=host()===reward;
   reward.close();reward.remove();await frame();
   steps.after=scene();steps.afterHost=host()===app.firstElementChild;
   return steps;
  });
  assert.equal(result.title,'hex','title page gets its scene');
  assert.equal(result.readsFromEffects,0,'effect elements on <body> do not trigger background refreshes');
  assert.equal(result.reward,'gold','a reward dialog added to <body> switches the background');
  assert.ok(result.rewardHost,'the reward dialog hosts the background');
  assert.equal(result.after,'hex','closing the dialog restores the page scene');
  assert.ok(result.afterHost,'the page hosts the background again');
  console.log('PASS vector backgrounds: scene follows pages and dialogs; 40 effect insertions/removals caused no refreshes');
 }finally{await browser.close();server.close()}
})().catch(error=>{console.error(error);process.exit(1)});
