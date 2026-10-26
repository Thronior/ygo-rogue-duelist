// Real-duel smoke test for duel presentation: both seats follow the CPU policy through
// the real cue player; afterwards no effect node, chain marker or hidden card may remain.
// Needs the web client on 127.0.0.1:4181 (python tools/serve_android.py).
const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const deck=['Dark Magician','Blue-Eyes White Dragon','Summoned Skull','Celtic Guardian','Mystical Elf','Gaia The Fierce Knight','Man-Eater Bug','Kuriboh','Sangan','Dark Hole','Pot of Greed','Mirror Force','Trap Hole','Monster Reborn','Axe of Despair','Swords of Revealing Light'];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{try{localStorage.setItem('ygo-preload-visuals','sounds')}catch{}});
  await page.goto('http://127.0.0.1:4181/',{timeout:180000});
  await page.waitForFunction(()=>window.shadowTest?.screen()==='title',null,{timeout:180000});
  await page.evaluate(async deck=>{
   const mod=await import('./duel.js'),meta=await fetch('content.json').then(r=>r.json()),id=n=>meta.cards.find(c=>c.name===n).id,ids=deck.map(id);
   const original=mod.MobileDuel.prototype.start;
   mod.MobileDuel.prototype.start=function(...a){a[0]=Array.from({length:40},(_,i)=>ids[i%ids.length]);a[1]=Array.from({length:40},(_,i)=>ids[(i*5)%ids.length]);a[2]=8000;a[3]=8000;a[5]=11;a[8]='';return original.apply(this,a)};
   await shadowTest.command('new',0);await shadowTest.command('auto');await shadowTest.startDuel(false,shadowTest.state().run.routes[0]);
   const e=shadowTest.engine(),push=e.visuals.push;window.cueKinds={};e.visuals.push=function(...cues){for(const c of cues)cueKinds[c.kind]=(cueKinds[c.kind]||0)+1;return push.apply(this,cues)};
  },deck);
  // Drive seat 0 with the CPU policy; seat 1 is the game's own CPU. A response made while
  // the previous one is still presenting is ignored by the game, so count only real progress.
  let decisions=0;const deadline=Date.now()+8*60000;
  while(decisions<120&&Date.now()<deadline){
   const state=await page.evaluate(()=>({screen:shadowTest.screen(),player:shadowTest.engine()?.pending?.player}));
   if(state.screen!=='duel')break;
   const moved=state.player===0&&await page.evaluate(async()=>{const e=shadowTest.engine(),pending=e.pending;if(pending?.player===0)await shadowTest.respond(e.auto());return shadowTest.engine()?.pending!==pending});
   if(moved)decisions++;else await page.waitForTimeout(150);
  }
  await page.waitForTimeout(2500);
  const report=await page.evaluate(()=>({
   kinds:window.cueKinds,screen:shadowTest.screen(),chainOpen:!!shadowTest.engine()?.activeChain?.length,
   fx:document.querySelectorAll('.duel-fx').length,flights:document.querySelectorAll('.moving-card').length,beams:document.querySelectorAll('.attack-beam').length,
   badges:document.querySelectorAll('.chain-link-badge').length,banners:document.querySelectorAll('.duel-cue.managed-cue').length,
   hidden:[...document.querySelectorAll('.zone>img')].filter(img=>getComputedStyle(img).opacity==='0').length,
   errors:shadowTest.engine()?.errors||[],
  }));
  console.log(JSON.stringify({decisions,...report}));
  assert(decisions>=10,'Duel ended too early to exercise the presentation');
  for(const kind of ['draw','move','summon','phase','turn'])assert(report.kinds?.[kind],'No '+kind+' cue was played');
  assert.equal(report.fx,0,'Effect overlays must remove themselves');
  assert.equal(report.flights,0,'Card flights must be removed');
  assert.equal(report.beams,0,'Attack streaks must be removed');
  assert.equal(report.hidden,0,'No field card may stay hidden after a removal effect');
  assert(report.banners<=1,'Banners retire each other');
  if(!report.chainOpen)assert.equal(report.badges,0,'Chain markers clear when the chain closes');
  assert.deepEqual(report.errors,[]);assert.deepEqual(errors,[]);
  console.log('PASS real duel through the polished cue player leaves no stray effects');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
