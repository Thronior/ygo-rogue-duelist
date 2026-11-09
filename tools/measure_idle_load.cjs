// Idle load per screen (2026-11-07): how much work the web client does while the player is just looking.
// Phones heating up while "nothing happens" means frames, paint or script keep running on an idle screen.
// For each screen this serves android/web from its own static server (no dev server needed), drives headless
// Chrome there (915x412 at DPR 2, touch), waits for entrance animations to settle, then records:
//   cpu %       CPU time of the browser, renderer and GPU processes over an unthrottled window (Chrome's CPU
//               throttler and the tracing service burn CPU of their own, so neither runs during it)
//   frames      renderer compositor frames drawn per second, against the display's vsync rate (144 on this
//               PC; a phone runs 60-120). 0 when nothing on screen changes. A playing video reaches the
//               display on its own path and is not counted here, but its cost shows in cpu %.
//   main ms/s   renderer main-thread busy time per second under CPU throttling (default 4x), split into
//               script, style+layout and paint; raster ms/s is raster and image decoding off the main thread
// plus what is moving: running CSS/WAAPI animations, playing videos and animated images.
// Headless Chrome composites in software, so cpu % overstates a phone GPU's share; compare runs, not devices.
//
// Usage: runtime/ai/node.exe tools/measure_idle_load.cjs [--screens title,routes,shop,duel] [--seconds 20]
//        [--cpu-seconds 10] [--throttle 4] [--out file.json] [--label name] [--portrait]
//        [--settings '{"simpleBackgrounds":true}'] [--look shadow-realm] [--css "<extra css>"] [--layers]
//        [--overlay <dir>] [--trace-dir <dir>] [--max-fps 30] [--max-main 150] [--probe] [--eval "<js>"]
// Screens: title, routes (opponent screen), shop (one ultra item), duel (the player's Main Phase prompt),
// duel-select (five zones pulsing as selectable), duel-flames (a 2000+ ATK monster burning), duel-critical
// (LP under 1000 and a low deck), pack (a booster waiting to open), pack-revealed (all cards out, one ultra).
// --css switches one suspect off to measure its share, --overlay serves frozen copies of changed files (a
// "before" set), --max-fps / --max-main exit 1 when an idle screen draws or works more than that, --probe lists
// each endless loop's start against the ambient clock's 60 ms ticks, --eval prints an expression on each screen.
// Results on 2026-11-07, before -> after the ambient clock (cpu %): idle duel 159 -> 64-70, shop with an ultra item
// 106 -> 31, title 51 -> 22, selection prompt 187 -> 87-93, unopened pack 105 -> 33-39, revealed pack 139 -> 57,
// opponent screen 3.4 -> 3.6. See android/test_idle_animations.mjs and android/web/ambient-clock.js.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('./require-module.cjs').requireModule('playwright');

const args=process.argv.slice(2),flag=(name,fallback)=>{const i=args.indexOf('--'+name);return i<0?fallback:args[i+1]};
const SCREENS=String(flag('screens','title,routes,shop,duel')).split(',').filter(Boolean);
const SECONDS=Number(flag('seconds',20)),THROTTLE=Number(flag('throttle',4)),OUT=flag('out',''),LABEL=flag('label','');
const PORTRAIT=args.includes('--portrait'),EXTRA_SETTINGS=JSON.parse(flag('settings','{}')),TRACE_DIR=flag('trace-dir','');
const CPU_SECONDS=Number(flag('cpu-seconds',10)),INJECT_CSS=flag('css',''),LOOK=flag('look',''),LAYERS=args.includes('--layers');
const MAX_FPS=Number(flag('max-fps',Infinity)),MAX_MAIN=Number(flag('max-main',Infinity)),PROBE=args.includes('--probe'),EVAL=flag('eval','');
const WEB=path.resolve(__dirname,'..','android','web'),OVERLAY=flag('overlay','')?path.resolve(flag('overlay','')):'';

const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2','.ttf':'font/ttf'};
// --overlay <dir> serves any file present there instead of android/web's copy, so a frozen "before" set of
// changed files can be measured against the working tree in the same session.
function serve(){
 const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://x').pathname);
  let file=path.join(WEB,relative);
  if(!file.startsWith(WEB)){res.writeHead(403).end();return}
  if(OVERLAY){const replaced=path.join(OVERLAY,relative);if(replaced.startsWith(OVERLAY)&&fs.existsSync(replaced)&&fs.statSync(replaced).isFile())file=replaced}
  fs.stat(file,(error,stat)=>{
   if(!error&&stat.isDirectory()){file=path.join(file,'index.html');stat=fs.existsSync(file)?fs.statSync(file):null}
   if(error||!stat){res.writeHead(404).end();return}
   res.writeHead(200,{'Content-Type':TYPES[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});
   fs.createReadStream(file).pipe(res);
  });
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}

// A fixed duel so before/after runs see the same board: strong monsters (flames), Spells and Traps.
const DECK=['Dark Magician','Blue-Eyes White Dragon','Summoned Skull','Celtic Guardian','Mystical Elf','Gaia The Fierce Knight','Man-Eater Bug','Kuriboh','Sangan','Dark Hole','Pot of Greed','Mirror Force','Trap Hole','Monster Reborn','Axe of Despair','Swords of Revealing Light'];

async function waitScreen(page,name,timeout=120000){await page.waitForFunction(n=>window.shadowTest?.screen()===n,name,{timeout})}
async function closeModal(page){await page.evaluate(()=>{const m=document.querySelector('#modal');if(m?.open)m.close()})}

const GOTO={
 async title(page){await page.evaluate(()=>shadowTest.go('title'));await waitScreen(page,'title')},
 // Character select and the deck editor (2026-11-09), where players also sit and think.
 async characters(page){await page.evaluate(()=>shadowTest.go('characters'));await waitScreen(page,'characters')},
 async draft(page){
  await page.evaluate(async()=>{if(!shadowTest.state().run?.routes?.length){await shadowTest.command('new',0);await shadowTest.command('auto')}shadowTest.go('draft')});
  await waitScreen(page,'draft');
 },
 async routes(page){
  await page.evaluate(async()=>{if(!shadowTest.state().run?.routes?.length){await shadowTest.command('new',0);await shadowTest.command('auto')}shadowTest.go('routes')});
  await waitScreen(page,'routes');
 },
 async shop(page){
  await page.evaluate(async()=>{
   if(!shadowTest.state().run?.routes?.length){await shadowTest.command('new',0);await shadowTest.command('auto')}
   await shadowTest.command('choose',shadowTest.state().run.routes[0]);await shadowTest.command('begin');
   await shadowTest.command('finish',{winner:0,lp:8000,reason:0,events:{}});
   const run=shadowTest.state().run;if(run.reward_slots)run.reward_slots.pending=false;
   shadowTest.go('shop');
  });
  await waitScreen(page,'shop');await closeModal(page);
  // Stock is random; every measured shop shows exactly one ultra item (its glow and sparkle), as it often does.
  await page.evaluate(()=>{const items=[...document.querySelectorAll('.shop-product')];if(items.length&&!items.some(x=>x.classList.contains('shop-ultra')))items[0].classList.add('shop-ultra')});
 },
 // The player choosing a card on the field: five zones pulse as selectable (the rim animation).
 async 'duel-select'(page){
  await GOTO.duel(page);
  await page.evaluate(()=>{for(const zone of [...document.querySelectorAll('.mat .zone')].slice(0,5))zone.classList.add('selectable')});
 },
 // Later in the duel, with at least one monster of 2000+ ATK burning (the animated flame images).
 async 'duel-flames'(page){await GOTO.duel(page,true)},
 // Your LP under 1000 (the heartbeat over the field) and 5 cards left in your deck (the pile's red pulse).
 async 'duel-critical'(page){
  await GOTO.duel(page);
  // The duel's own renders reset both from the real LP and deck, so they are put back after every render.
  await page.evaluate(()=>{
   const main=document.querySelector('.duel-main');
   const apply=()=>{
    let el=main.querySelector(':scope>.fx-danger.own');if(!el){el=document.createElement('div');el.className='fx-danger own';main.prepend(el)}
    if(!el.classList.contains('critical')){el.classList.add('critical');el.style.opacity='.85';el.style.transform='scaleY(.98)'}
    const pile=main.querySelector('.mat .zone.pile[data-pile="0,deck"]')||main.querySelector('.mat .zone.pile');
    if(pile&&pile.dataset.fxDeck!=='danger')pile.dataset.fxDeck='danger';
    if(pile&&!pile.querySelector(':scope>.fx-pile-glow')){const g=document.createElement('span');g.className='fx-pile-glow';pile.prepend(g)}
   };
   apply();new MutationObserver(apply).observe(main,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-fx-deck']});
  });
 },
 // A booster waiting to be opened (rays, sparks, hovering pack), then all its cards revealed with one ultra.
 async pack(page){await openPack(page,false)},
 async 'pack-revealed'(page){await openPack(page,true)},
 async duel(page,flames=false){
  await page.evaluate(async deck=>{
   const mod=await import('./duel.js'),meta=await fetch('content.json').then(r=>r.json()),id=n=>meta.cards.find(c=>c.name===n).id,ids=deck.map(id);
   const original=mod.MobileDuel.prototype.start;
   mod.MobileDuel.prototype.start=function(...a){a[0]=Array.from({length:40},(_,i)=>ids[i%ids.length]);a[1]=Array.from({length:40},(_,i)=>ids[(i*5)%ids.length]);a[2]=8000;a[3]=8000;a[5]=11;a[8]='';return original.apply(this,a)};
   if(!shadowTest.state().run?.routes?.length){await shadowTest.command('new',0);await shadowTest.command('auto')}
   await shadowTest.startDuel(false,shadowTest.state().run.routes[0]);
  },DECK);
  await waitScreen(page,'duel');
  // Play both seats with the CPU policy until the board has a few cards, then stop on the player's own
  // Main Phase prompt: the moment a real player sits and thinks.
  const deadline=Date.now()+4*60000;
  for(;;){
   const s=await page.evaluate(()=>{const e=shadowTest.engine(),p=e?.pending;return {screen:shadowTest.screen(),player:p?.player,type:p?.type,turn:e?.turn??e?.state?.turn??0,cards:document.querySelectorAll('.mat .zone[data-code]').length,flames:document.querySelectorAll('.fx-blaze').length}});
   if(s.screen!=='duel')throw Error('Duel ended before the idle point');
   if(s.player===0&&s.type===11&&s.cards>=4&&(!flames||s.flames>=1))break;
   if(Date.now()>deadline)throw Error('No idle point reached: '+JSON.stringify(s));
   const moved=s.player===0&&await page.evaluate(async()=>{const e=shadowTest.engine(),p=e.pending;if(p?.player===0)await shadowTest.respond(e.auto());return shadowTest.engine()?.pending!==p});
   if(!moved)await page.waitForTimeout(150);
  }
 },
};

async function openPack(page,reveal){
 await GOTO.shop(page);
 await page.evaluate(async()=>{
  const [{openPacks},{forcedUltra},content]=await Promise.all([import('./pack-opening.js'),import('./ultra-rarity.js'),fetch('content.json').then(r=>r.json())]);
  const known=new Set(content.cards.map(c=>c.id)),pack=content.packs.find(p=>(p.common||[]).filter(id=>known.has(id)).length>=8)||content.packs[0];
  const pool=[...(pack.common||[]),...(pack.rare||[])].filter(id=>known.has(id));
  const ultra=[...forcedUltra].find(id=>known.has(id));
  window.__pack=openPacks({packs:[{id:pack.id,cards:[...pool.slice(0,8),ultra].filter(Boolean)}],content,image:id=>`assets/cards/${id}.jpg`,inspect:()=>{}});
 });
 if(!reveal)return;
 await page.evaluate(()=>document.querySelector('.pack-theatre .pack-open').click());
 await page.waitForSelector('.pack-theatre .pack-skip:not([hidden])',{timeout:10000});
 await page.evaluate(()=>document.querySelector('.pack-theatre .pack-skip').click());
}

// What is moving on screen: running animations, playing videos, animated images.
function census(){
 const visible=el=>{if(!el?.isConnected)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth&&getComputedStyle(el).visibility!=='hidden'};
 const describe=el=>el?(el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.classList?.length?'.'+[...el.classList].slice(0,3).join('.'):'')):'?';
 const groups={};
 for(const a of document.getAnimations()){
  if(a.playState!=='running')continue;
  const target=a.effect?.target,pseudo=a.effect?.pseudoElement||'',name=a.animationName||a.transitionProperty||a.id||'waapi';
  const key=name+' '+describe(target)+pseudo;const g=groups[key]||(groups[key]={name,target:describe(target)+pseudo,count:0,infinite:a.effect?.getTiming?.().iterations===Infinity,visible:0});
  g.count++;if(visible(target))g.visible++;
 }
 const videos=[...document.querySelectorAll('video')].map(v=>({src:String(v.currentSrc||v.src).slice(-40),paused:v.paused,size:v.videoWidth+'x'+v.videoHeight,box:Math.round(v.getBoundingClientRect().width)+'x'+Math.round(v.getBoundingClientRect().height),blend:getComputedStyle(v.parentElement||v).mixBlendMode}));
 const animatedImages=[...document.querySelectorAll('img')].filter(img=>/\.(webp|gif)(\?|$)/i.test(img.currentSrc||img.src)&&visible(img)).map(img=>describe(img)+' '+String(img.currentSrc||img.src).split('/').pop());
 return {animations:Object.values(groups).sort((a,b)=>b.count-a.count),videos,animatedImages,nodes:document.getElementsByTagName('*').length};
}

const MAIN_SCRIPT=new Set(['FunctionCall','TimerFire','FireAnimationFrame','EvaluateScript','EventDispatch','v8.compile','MajorGC','MinorGC','V8.GC_SCAVENGER','V8.GCScavenger','RunMicrotasks']);
const MAIN_STYLE=new Set(['UpdateLayoutTree','RecalculateStyles','Layout','UpdateLayerTree','PrePaint','Layerize','HitTest','ScheduleStyleRecalculation']);
const MAIN_PAINT=new Set(['Paint','PaintImage','UpdateLayer','CompositeLayers','Commit','Decode Image','Draw LazyPixelRef']);
const RASTER=new Set(['RasterTask','ImageDecodeTask','Decode Image','Rasterize']);
function summarise(events,seconds){
 const threads={};for(const e of events)if(e.ph==='M'&&e.name==='thread_name')threads[e.pid+':'+e.tid]=e.args?.name;
 const main=Object.keys(threads).filter(k=>threads[k]==='CrRendererMain'),busiest={};
 for(const e of events)if(e.ph==='X'&&main.includes(e.pid+':'+e.tid))busiest[e.pid+':'+e.tid]=(busiest[e.pid+':'+e.tid]||0)+(e.dur||0);
 const mainKey=Object.entries(busiest).sort((a,b)=>b[1]-a[1])[0]?.[0],renderer=mainKey?.split(':')[0];
 let task=0,script=0,style=0,paint=0,raster=0,frames=0,vsync=0,dropped=0;
 const mainEvents=[];
 for(const e of events){
  const key=e.pid+':'+e.tid,ms=(e.dur||0)/1000;
  if(e.name==='DrawFrame'&&String(e.pid)===renderer)frames++;
  if(e.name==='DroppedFrame'&&String(e.pid)===renderer)dropped++;
  if(e.ph==='X'&&e.name==='RunTask'&&threads[key]==='GpuVSyncThread')vsync++;
  if(e.ph!=='X')continue;
  // RunTask is the top-level task; ThreadControllerImpl::RunTask nests inside it and is not added again.
  if(key===mainKey){if(e.name==='RunTask')task+=ms;else if(MAIN_SCRIPT.has(e.name)||MAIN_STYLE.has(e.name)||MAIN_PAINT.has(e.name))mainEvents.push(e)}
  else if(String(e.pid)===renderer&&RASTER.has(e.name))raster+=ms;
 }
 // Each slice counts once, under its outermost category (a layout forced by script counts as script).
 mainEvents.sort((a,b)=>a.ts-b.ts||b.dur-a.dur);let openUntil=-1;
 for(const e of mainEvents){if(e.ts<openUntil)continue;openUntil=e.ts+(e.dur||0);const ms=(e.dur||0)/1000;if(MAIN_SCRIPT.has(e.name))script+=ms;else if(MAIN_STYLE.has(e.name))style+=ms;else paint+=ms}
 const per=x=>Math.round(x/seconds*10)/10;
 return {fps:per(frames),vsync:per(vsync),dropped,mainMsPerS:per(task),scriptMsPerS:per(script),styleLayoutMsPerS:per(style),paintMsPerS:per(paint),rasterMsPerS:per(raster)};
}

async function cpuTimes(browserSession){
 const {processInfo}=await browserSession.send('SystemInfo.getProcessInfo');const out={};
 for(const p of processInfo)out[p.type]=(out[p.type]||0)+p.cpuTime;return out;
}

// Process CPU is sampled without throttling and without tracing: Chrome's CPU throttler and the tracing
// service both burn CPU of their own, which would hide the page's real cost.
async function cpuSample(page,browserSession,seconds){
 const before=await cpuTimes(browserSession),t0=Date.now();
 await page.waitForTimeout(seconds*1000);
 const after=await cpuTimes(browserSession),elapsed=(Date.now()-t0)/1000,cpu={};
 for(const k of ['browser','renderer','GPU'])cpu[k]=Math.round(((after[k]||0)-(before[k]||0))/elapsed*1000)/10;
 cpu.total=Math.round((cpu.browser+cpu.renderer+cpu.GPU)*10)/10;return cpu;
}
// Composited layers that draw content, largest first: every one covering the screen is redrawn by the GPU
// on each frame the compositor produces.
async function layers(cdp){
 let tree=null;const got=new Promise(resolve=>cdp.once('LayerTree.layerTreeDidChange',e=>resolve(e.layers)));
 await cdp.send('LayerTree.enable');tree=await Promise.race([got,new Promise(r=>setTimeout(()=>r([]),3000))]);await cdp.send('LayerTree.disable');
 const nodes=new Map();for(const l of tree||[])if(l.backendNodeId)nodes.set(l.backendNodeId,null);
 const out=[];
 for(const l of tree||[]){
  if(!l.drawsContent)continue;let name='';
  if(l.backendNodeId){try{const {object}=await cdp.send('DOM.resolveNode',{backendNodeId:l.backendNodeId});const {result}=await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){const el=this.nodeType===1?this:this.parentElement;return el?el.tagName.toLowerCase()+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\\s+/).slice(0,3).join("."):""):"?"}',returnByValue:true});name=result.value}catch{}}
  out.push({name:name||l.layerId,size:Math.round(l.width)+'x'+Math.round(l.height),area:Math.round(l.width*l.height)});
 }
 return out.sort((a,b)=>b.area-a.area).slice(0,25);
}
// --probe: each running endless animation's start time against the shared 50 ms clock (ambient-clock.js).
function clockProbe(){
 return document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getComputedTiming?.().iterations===Infinity).map(a=>{
  const t=a.effect.target;let easing='';try{easing=a.effect.getKeyframes()[0]?.easing}catch{}
  return {name:a.animationName||a.id||'waapi',target:(t?.className?.baseVal??t?.className??'')+(a.effect.pseudoElement||''),startTime:a.startTime,offTick:a.startTime==null?null:Math.round((a.startTime%50)*100)/100,easing};
 });
}
async function measure(browser,page,cdp,browserSession,seconds){
 const moving=await page.evaluate(census);
 if(PROBE){moving.clock=await page.evaluate(clockProbe);for(const p of moving.clock)console.log('  clock',p.name.padEnd(22),String(p.offTick).padEnd(7),p.easing.padEnd(14),String(p.target).slice(0,50))}
 if(EVAL)console.log('  eval',JSON.stringify(await page.evaluate(EVAL)));
 if(LAYERS){await cdp.send('DOM.enable');moving.layers=await layers(cdp);await cdp.send('DOM.disable')}
 const cpuPercent=await cpuSample(page,browserSession,CPU_SECONDS);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:THROTTLE});
 await page.waitForTimeout(1000);
 await browser.startTracing(page,{categories:['devtools.timeline','disabled-by-default-devtools.timeline','disabled-by-default-devtools.timeline.frame','toplevel']});
 await page.waitForTimeout(seconds*1000);
 const buffer=await browser.stopTracing();
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 if(TRACE_DIR)fs.writeFileSync(path.join(TRACE_DIR,`${LABEL||'trace'}-${page.__screen}.json`),buffer);
 const events=JSON.parse(buffer.toString()).traceEvents||[];
 return {...summarise(events,seconds),cpuPercent,moving};
}

(async()=>{
 const server=await serve(),port=server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--autoplay-policy=no-user-gesture-required']});
 const results={label:LABEL,date:new Date().toISOString(),throttle:THROTTLE,seconds:SECONDS,portrait:PORTRAIT,settings:EXTRA_SETTINGS,screens:{}};
 try{
  const context=await browser.newContext({viewport:PORTRAIT?{width:412,height:915}:{width:915,height:412},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{try{localStorage.setItem('ygo-preload-visuals','sounds')}catch{}});
  await page.goto(`http://127.0.0.1:${port}/`,{timeout:180000});
  await waitScreen(page,'title',180000);
  const settings={...EXTRA_SETTINGS,...(LOOK?{duelTheme:LOOK}:{})};
  if(Object.keys(settings).length)await page.evaluate(async extra=>{const s=shadowTest.state().settings;Object.assign(s,extra);await shadowTest.command('settings',s);if(extra.duelTheme)document.documentElement.dataset.duelTheme=extra.duelTheme;document.dispatchEvent(new Event('duel-background-change'));shadowTest.go('title')},settings);
  // Experiments: switch one suspect off (e.g. --css ".duel-particles{display:none}") to measure its share.
  if(INJECT_CSS)await page.addStyleTag({content:INJECT_CSS});
  const cdp=await context.newCDPSession(page),browserSession=await browser.newBrowserCDPSession();
  await cdp.send('Performance.enable');
  for(const name of SCREENS){
   if(!GOTO[name])throw Error('Unknown screen '+name);
   await GOTO[name](page);page.__screen=name;
   await page.waitForTimeout(4000); // entrance animations, reveal, video start
   const result=await measure(browser,page,cdp,browserSession,SECONDS);
   results.screens[name]=result;
   const top=result.moving.animations.filter(a=>a.visible).slice(0,6).map(a=>`${a.name}×${a.count}${a.infinite?'∞':''}`).join(', ');
   const c=result.cpuPercent;
   console.log(`${name.padEnd(7)} frames ${String(result.fps).padStart(5)}/${result.vsync} vsync | main ${String(result.mainMsPerS).padStart(6)} ms/s (script ${result.scriptMsPerS}, style+layout ${result.styleLayoutMsPerS}, paint ${result.paintMsPerS}) | raster ${result.rasterMsPerS} ms/s | cpu ${c.total}% (renderer ${c.renderer}, gpu ${c.GPU}, browser ${c.browser}) | videos ${result.moving.videos.filter(v=>!v.paused).length} | anim imgs ${result.moving.animatedImages.length} | ${top}`);
  }
  results.errors=errors;
 }finally{await browser.close();server.close()}
 if(OUT){fs.writeFileSync(OUT,JSON.stringify(results,null,1));console.log('wrote',OUT)}
 const over=Object.entries(results.screens).filter(([,r])=>r.fps>MAX_FPS||r.mainMsPerS>MAX_MAIN);
 for(const [name,r] of over)console.error(`FAIL ${name}: ${r.fps} frames/s (max ${MAX_FPS}), main ${r.mainMsPerS} ms/s (max ${MAX_MAIN})`);
 if(over.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
