// Boot and memory profile of the web client (2026-11-09): where the loading screen spends its time.
// Serves android/web itself (like measure_idle_load.cjs), boots headless Chrome to the title screen and records:
//   steps     time from navigation to each "Step N of 6" loading message, and to the title screen
//   bytes     bytes fetched by kind (json, script, css, card art, other images, audio, wasm)
//   heap      JS heap in use at the title screen, after the duel data is loaded, and after one duel renders
//   duel      time to load the duel resources (engine-data.json + scripts.json) the first time
// Usage: runtime/ai/node.exe tools/measure_boot.cjs [--throttle 4] [--runs 1] [--android] [--no-duel] [--out file.json]
//        [--overlay <dir>] [--root <web build dir>] (default android/web)
// --android serves files the way the APK's WebView does, with no Content-Length header.
// --warm reuses one browser profile across runs, so later runs boot like a returning web player (art cached).
// --throttle slows the CPU (4 is a rough low-end phone). Compare runs, not devices.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('./require-module.cjs').requireModule('playwright');
const args=process.argv.slice(2),flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1]};
const WARM=args.includes('--warm'),THROTTLE=Number(flag('throttle',1)),RUNS=Number(flag('runs',1)),ANDROID=args.includes('--android'),DUEL=!args.includes('--no-duel'),OUT=flag('out','');
const WEB=flag('root','')?path.resolve(flag('root','')):path.resolve(__dirname,'..','android','web'),OVERLAY=flag('overlay','')?path.resolve(flag('overlay','')):'';
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.m4a':'audio/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.ttf':'font/ttf','.zip':'application/zip','.whl':'application/zip','.data':'application/octet-stream'};
function serve(){
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://x').pathname);
  let file=path.join(WEB,relative);if(!file.startsWith(WEB)){res.writeHead(403).end();return}
  if(OVERLAY){const r=path.join(OVERLAY,relative);if(r.startsWith(OVERLAY)&&fs.existsSync(r)&&fs.statSync(r).isFile())file=r}
  fs.stat(file,(error,stat)=>{
   if(!error&&stat.isDirectory()){file=path.join(file,'index.html');stat=fs.existsSync(file)?fs.statSync(file):null}
   if(error||!stat){res.writeHead(404).end();return}
   const headers={'Content-Type':TYPES[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'};
   if(!ANDROID)headers['Content-Length']=stat.size;
   res.writeHead(200,headers);fs.createReadStream(file).pipe(res);
  });
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}
const kind=url=>{const p=new URL(url).pathname;if(/\/assets\/cards\//.test(p))return 'card art';if(/\.json$/.test(p))return 'json';if(/\.m?js$/.test(p))return 'script';if(/\.css$/.test(p))return 'css';if(/\.wasm$/.test(p))return 'wasm';if(/\.(png|jpe?g|webp|svg|gif)$/.test(p))return 'image';if(/\.(m4a|mp3|wav|ogg)$/.test(p))return 'audio';if(/\.(mp4|webm)$/.test(p))return 'video';return 'other'};
async function heap(cdp){await cdp.send('HeapProfiler.collectGarbage');const {metrics}=await cdp.send('Performance.getMetrics');return Math.round(metrics.find(m=>m.name==='JSHeapUsedSize').value/1048576)}
(async()=>{
 const server=await serve(),port=server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--autoplay-policy=no-user-gesture-required']});
 const results=[];
 let shared=null;
 try{for(let run=0;run<RUNS;run++){
  const context=WARM&&shared?shared:await browser.newContext({viewport:{width:915,height:412},deviceScaleFactor:2,hasTouch:true,isMobile:true,serviceWorkers:'block'});if(WARM)shared=context;
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const bytes={},counts={};
  page.on('requestfinished',async request=>{try{const s=await request.sizes();const k=kind(request.url());bytes[k]=(bytes[k]||0)+s.responseBodySize;counts[k]=(counts[k]||0)+1}catch{}});
  await page.addInitScript(android=>{
   try{localStorage.setItem('ygo-preload-visuals','sounds')}catch{}
   window.__boot=[];const t0=performance.now();
   const watch=()=>{const el=document.querySelector('#loading-status');if(!el){requestAnimationFrame(watch);return}
    let last='';new MutationObserver(()=>{const text=el.textContent;if(text!==last){last=text;window.__boot.push([Math.round(performance.now()-t0),text.slice(0,60)])}}).observe(el,{childList:true,characterData:true,subtree:true})};
   document.addEventListener('DOMContentLoaded',watch);
   document.addEventListener('game-startup-ready',()=>window.__boot.push([Math.round(performance.now()-t0),'title']));
  },ANDROID);
  const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
  if(THROTTLE>1)await cdp.send('Emulation.setCPUThrottlingRate',{rate:THROTTLE});
  const start=Date.now();
  await page.goto(`http://127.0.0.1:${port}/`,{timeout:600000});
  await page.waitForFunction(()=>window.shadowTest?.screen()==='title',null,{timeout:600000});
  const wall=Date.now()-start;
  const steps=await page.evaluate(()=>window.__boot);
  await page.waitForTimeout(1500);
  const result={run,throttle:THROTTLE,android:ANDROID,wallMs:wall,steps,bytesMB:Object.fromEntries(Object.entries(bytes).map(([k,v])=>[k,+(v/1048576).toFixed(2)])),requests:counts,heapTitleMB:await heap(cdp)};
  if(DUEL){
   result.duelLoadMs=await page.evaluate(async()=>{const {loadDuelResources}=await import('./engine.js');const s=performance.now();await loadDuelResources();return Math.round(performance.now()-s)});
   result.heapDuelDataMB=await heap(cdp);
  }
  result.errors=errors;results.push(result);console.log(JSON.stringify(result));
  if(WARM)await page.close();else await context.close();
 }}finally{await browser.close();server.close()}
 if(OUT)fs.writeFileSync(OUT,JSON.stringify(results,null,1));
})().catch(e=>{console.error(e);process.exit(1)});
