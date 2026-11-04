// Chain Sometimes offers Numinous Healer every time it is legal, after effect or battle damage (user request 2026-11-03).
// Other cards keep the Sometimes policy, and Always and Never are unchanged.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const byId=new Map(meta.cards.map(c=>[c.id,c])),HEAL=id('Numinous Healer'),WABOKU=id('Waboku'),TRAP_HOLE=id('Trap Hole');
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
// The prompt the core sends after Ookazi resolves: no summon or attack timing, empty chain.
const quiet=codes=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:4,hint_timing:163840,hint_timing_other:8421376,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx={turnPlayer:1,phase:4,attackers:0,card:code=>byId.get(code)};
same(chainWindowAllowed(quiet([HEAL]),'sometimes',[],ctx),true,'Sometimes offers Numinous Healer');
same(chainWindowAllowed(quiet([HEAL,WABOKU]),'sometimes',[],ctx),true,'beside another card it still opens the window');
same(chainWindowAllowed(quiet([HEAL]),'never',[],ctx),false,'Never still skips it');
same(chainWindowAllowed(quiet([HEAL]),'always',[],ctx),true,'Always still offers it');
same(chainWindowAllowed(quiet([WABOKU]),'sometimes',[],ctx),false,'other cards keep the Sometimes policy: Waboku waits');
same(chainWindowAllowed(quiet([TRAP_HOLE]),'sometimes',[],ctx),true,'and Trap Hole is still offered by its text');
same(chainWindowAllowed(quiet([WABOKU]),'always',[],ctx),true,'Always is unchanged for other cards');
const renamed={...ctx,card:code=>({...byId.get(code),name:'Healer'})};
same(chainWindowAllowed(quiet([HEAL]),'sometimes',[],renamed),false,'without the exception the policy would skip this window');

// The real core, with Numinous Healer set and the opponent burning or attacking.
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts:[],challenge_level:0})],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
for(const foe of ['Ookazi','Battle Ox']){
 let s=e.start(Array(40).fill(HEAL),Array(40).fill(id(foe)),8000,8000,5,3,[],[],script),seen=0,offered=0,skippedBefore=0,healed=null;
 for(let i=0;i<400&&!s.finished&&e.turn<=4;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_CHAIN&&m.selects?.some(c=>c.code===HEAL)){
   const live={turnPlayer:e.player,phase:e.phase,attackers:e.query(1,L.MZONE).filter(c=>c&&c.position&1).length,card:code=>byId.get(code)};
   seen++;if(chainWindowAllowed(m,'sometimes',e.activeChain,live))offered++;
   if(!chainWindowAllowed(m,'sometimes',e.activeChain,{...live,card:code=>({...byId.get(code),name:'Healer'})}))skippedBefore++;
   // Activate the first one to show the window works; decline the rest so the next damage offers it again.
   if(healed===null){const lp=e.lp[0];s=e.respond({type:R.SELECT_CHAIN,index:m.selects.findIndex(c=>c.code===HEAL)});for(let j=0;j<20&&e.activeChain?.length&&!s.finished;j++)s=e.respond(e.auto());healed=e.lp[0]-lp;continue}
   s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
  s=e.respond(e.auto())}
 assert(seen>1,`${foe}: the core offers Numinous Healer after the damage`);checks++;
 same(offered,seen,`${foe}: every window reaches the player on Chain Sometimes`);
 same(skippedBefore,seen,`${foe}: each of those windows was skipped before the exception`);
 same(healed,1000,`${foe}: activating it gains 1000 LP`);
}
e.destroy();
console.log(`PASS Numinous Healer on Chain Sometimes (${checks} checks)`);
