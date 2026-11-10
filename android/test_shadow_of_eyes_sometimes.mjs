// Chain Sometimes offers Shadow of Eyes when the opponent Sets a monster (Discord 2026-11-09, Prunk44: it never asked).
// Its text, "When a monster(s) is Set on your opponent's field", names no summon, attack or damage, so the text check
// skipped it; the core only offers it right after a Set or a change to face-down, so asking then adds no idle prompts.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const byId=new Map(meta.cards.map(c=>[c.id,c])),EYES=id('Shadow of Eyes'),WABOKU=id('Waboku');
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
// A window with no summon or attack timing, as after a monster Set.
const quiet=codes=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:4,hint_timing:0x2000,hint_timing_other:0x2000,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx={turnPlayer:1,phase:4,attackers:0,card:code=>byId.get(code)};
same(chainWindowAllowed(quiet([EYES]),'sometimes',[],ctx),true,'Sometimes offers Shadow of Eyes');
same(chainWindowAllowed(quiet([EYES]),'never',[],ctx),false,'Never still skips it');
same(chainWindowAllowed(quiet([WABOKU]),'sometimes',[],ctx),false,'other cards keep the Sometimes policy: Waboku waits');

// The real core: Shadow of Eyes Set, the opponent Setting defensive monsters.
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
let s=e.start(Array(40).fill(EYES),Array(40).fill(id('Giant Soldier of Stone')),8000,8000,5,3,[],[],''),seen=0,offered=0,used=false;
for(let i=0;i<600&&!s.finished&&e.turn<=6;i++){const m=e.pending;if(!m)break;
 if(m.player===0&&m.type===M.SELECT_CHAIN&&m.selects?.some(c=>c.code===EYES)){
  const live={turnPlayer:e.player,phase:e.phase,attackers:0,card:code=>byId.get(code)};
  seen++;if(chainWindowAllowed(m,'sometimes',e.activeChain,live))offered++;
  if(!used){used=true;const before=e.query(1,L.MZONE).filter(c=>c&&c.position&1).length;s=e.respond({type:R.SELECT_CHAIN,index:m.selects.findIndex(c=>c.code===EYES)});
   for(let j=0;j<30&&e.pending&&(e.pending.player===0||e.activeChain?.length)&&!s.finished;j++)s=e.respond(e.auto());
   same(e.query(1,L.MZONE).filter(c=>c&&c.position&1).length,before+1,'activating it turns the Set monster face-up');continue}
  s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
 s=e.respond(e.auto())}
assert(seen>0,'the core offers Shadow of Eyes after the opponent Sets a monster');checks++;
same(offered,seen,'every such window reaches the player on Chain Sometimes');
e.destroy();
console.log(`PASS Shadow of Eyes on Chain Sometimes (${checks} checks, ${seen} windows)`);
