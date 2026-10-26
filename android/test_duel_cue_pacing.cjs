// Duel pace guard: every presentation cue must block the duel for about as long as
// the reviewed baseline. Animations may add detail, never extra waiting. Every action
// plays at the opponent's (cpu) pace; Faster Animations lets your own actions use the
// quicker of the two original paces. The ":player" baselines are the original
// your-action pace, used only for that setting.
// Usage: node android/test_duel_cue_pacing.cjs [--measure]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../tools/require-module.cjs').requireModule('playwright');
process.env.TEMP=process.env.TMP=path.resolve('temp');
const measure=process.argv.includes('--measure');
// Median milliseconds measured from the pre-polish client (v0.2.1 working tree, 2026-10-26).
const baselineFile=path.join(__dirname,'test_duel_cue_pacing.json');
const BASELINE=fs.existsSync(baselineFile)?JSON.parse(fs.readFileSync(baselineFile,'utf8')):{};
const L={DECK:1,HAND:2,MZONE:4,SZONE:8,GRAVE:16,REMOVED:32,EXTRA:64};
const zone=(controller,location,sequence,position)=>({controller,location,sequence,...(position?{position}:{})});
// One representative cue per presentation path. Codes are resolved in the page.
const CASES={
 turn:{kind:'turn',player:1},
 phase_draw:{kind:'phase',phase:1},
 phase_main:{kind:'phase',phase:4},
 phase_battle_cpu:{kind:'phase',phase:8,cpuBattleEntry:true},
 draw:{kind:'draw',from:{controller:1,location:L.DECK},to:{controller:1,location:L.HAND},code:0},
 move_summon:{kind:'move',reason:0,from:zone(1,L.HAND,0),to:zone(1,L.MZONE,2,1),code:'monster'},
 move_destroy:{kind:'move',reason:1,from:zone(1,L.MZONE,2,1),to:zone(1,L.GRAVE,0),code:'monster'},
 move_tribute:{kind:'move',reason:2,from:zone(1,L.MZONE,2,1),to:zone(1,L.GRAVE,0),code:'monster'},
 move_banish:{kind:'move',reason:0,from:zone(1,L.GRAVE,0),to:zone(1,L.REMOVED,0),code:'monster'},
 summon:{kind:'summon',code:'monster',card:zone(1,L.MZONE,2),method:'normal'},
 special_summon:{kind:'summon',code:'monster',card:zone(1,L.MZONE,2),method:'special'},
 set:{kind:'set',card:zone(1,L.SZONE,1),text:'Opponent sets a card'},
 attack:{kind:'attack',card:zone(1,L.MZONE,2),target:zone(0,L.MZONE,2),text:'ATTACK!'},
 direct_attack:{kind:'attack',card:zone(1,L.MZONE,2),target:null,text:'DIRECT ATTACK!'},
 lp_damage:{kind:'lp',player:0,amount:-500},
 lp_direct:{kind:'lp',player:0,amount:-1200,directDamage:true},
 lp_heal:{kind:'lp',player:1,amount:500},
 chain_activate:{kind:'chain',stage:'activate',code:'spell',link:1,text:'Spell',card:zone(1,L.SZONE,1)},
 chain_resolve:{kind:'chain',stage:'resolve',code:'spell',link:1,text:'Spell',card:zone(1,L.SZONE,1)},
 chain_negated:{kind:'chain',stage:'negated',code:'spell',link:2,text:'Spell',card:zone(1,L.SZONE,1)},
 counter:{kind:'effect-action',text:'+1 counter',cards:[zone(1,L.MZONE,2)],increase:true},
 equip:{kind:'effect-action',text:'Equipped',cards:[zone(1,L.SZONE,1),zone(1,L.MZONE,2)]},
 shuffle:{kind:'effect-action',text:'Deck shuffled',cards:[],player:1},
 flip_reveal:{kind:'flip-reveal',card:zone(1,L.MZONE,2),code:'monster'},
 signature:{kind:'signature-summon',code:'monster',card:zone(1,L.MZONE,2)},
 lethal:{kind:'lethal-hit',player:1},
 // The final blow as the engine sends it; its baseline is lethal + lp_direct (both measured).
 lethal_blow:[{kind:'lethal-hit',player:1},{kind:'lp',player:1,amount:-3000,directDamage:true}],
};
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  // A fresh profile otherwise waits on the first-run preload choice.
  await page.addInitScript(()=>{try{localStorage.setItem('ygo-preload-visuals','sounds')}catch{}});
  // Expose the module-private cue player without changing shipped code.
  await page.route(url=>url.pathname.endsWith('/mobile.js'),r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(__dirname,'web/mobile.js'),'utf8')+'\nwindow.cueProbe={async play(cues,playerAction,faster){state.settings.fasterAnimations=faster;engine.visuals.push(...cues);const start=performance.now();await playDuelCues(playerAction);return performance.now()-start}};'}));
  await page.goto('http://127.0.0.1:4181/',{timeout:180000});
  await page.waitForFunction(()=>window.shadowTest&&window.cueProbe,null,{timeout:180000});
  await page.evaluate(async()=>{
   const mod=await import('./duel.js'),meta=await fetch('content.json').then(r=>r.json());
   const id=n=>meta.cards.find(c=>c.name===n).id;
   window.cueCodes={monster:id('Dark Magician'),spell:id('Dark Hole')};
   const original=mod.MobileDuel.prototype.start;
   mod.MobileDuel.prototype.start=function(...a){a[0]=Array(25).fill(id('Skull Servant'));a[1]=Array(25).fill(id('Skull Servant'));a[2]=8000;a[3]=8000;a[5]=42;a[8]='';return original.apply(this,a)};
   await shadowTest.command('new',0);await shadowTest.command('auto');
   await shadowTest.startDuel(false,shadowTest.state().run.routes[0]);
  });
  await page.waitForFunction(()=>shadowTest.screen()==='duel'&&shadowTest.engine()?.pending,null,{timeout:120000});
  await page.waitForTimeout(1500);
  // Modes: the opponent's action; your action at the default (opponent's) pace; your action
  // with Faster Animations, which takes the quicker of the two original paces.
  const MODES={cpu:[false,false],player:[true,false],faster:[true,true]};
  const expected=(name,mode)=>mode==='faster'?Math.min(BASELINE[name+':player'],BASELINE[name+':cpu']):BASELINE[name+':cpu'];
  const results={};
  for(const [name,cue] of Object.entries(CASES))for(const [mode,[playerAction,faster]] of Object.entries(MODES)){
   if(measure&&mode==='faster')continue;
   const times=[];
   for(let i=0;i<3;i++)times.push(await page.evaluate(async([cue,playerAction,faster])=>{
    const resolve=x=>Array.isArray(x)?x.map(resolve):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='code'&&typeof v==='string'?cueCodes[v]:resolve(v)])):x;
    // Cues mutate zones; reset to the rendered snapshot between samples.
    const t=await cueProbe.play([cue].flat().map(resolve),playerAction,faster);document.querySelectorAll('.float-lp,.duel-cue').forEach(el=>el.remove());await new Promise(r=>setTimeout(r,120));return t;
   },[cue,playerAction,faster]));
   results[name+':'+mode]=Math.round(median(times));
  }
  if(measure){console.log(JSON.stringify(results,null,1));return}
  const slack=(base)=>Math.max(40,base*.15);
  const rows=Object.entries(results).map(([key,ms])=>{const [name,mode]=key.split(':');return [key,expected(name,mode),ms]});
  const over=rows.filter(([,base,ms])=>base!==undefined&&Math.abs(ms-base)>slack(base));
  for(const [key,base,ms] of rows)console.log(`${key.padEnd(30)} ${String(base??'-').padStart(5)} -> ${String(ms).padStart(5)} ms`);
  assert.deepEqual(over,[],'Cue pacing drifted from the baseline: '+over.map(([k,b,v])=>`${k} ${b}->${v}`).join(', '));
  assert.deepEqual(errors,[]);
  console.log('PASS every duel cue keeps its baseline pacing');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
