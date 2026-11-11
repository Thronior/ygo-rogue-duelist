// Chain Sometimes offers Limiter Removal around a battle only: when an attack is declared, in the Damage Step, or in
// answer to a chain (Discord 2026-11-11: it asked in every window because its text mentions the End Phase).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {M,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const {OcgHintTiming:Timing}=await import('./web/vendor/package/dist/index.js');
const root=fileURLToPath(new URL('../',import.meta.url)),meta=JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8').replace(/^﻿/,''));
const byId=new Map(meta.cards.map(c=>[c.id,c])),id=n=>meta.cards.find(c=>c.name===n).id,LIMITER=id('Limiter Removal'),TRAP_HOLE=id('Trap Hole');
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
const ask=(codes,timing)=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:4,hint_timing:timing,hint_timing_other:0,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx={turnPlayer:0,phase:0x04,attackers:1,card:code=>byId.get(code)};
same(chainWindowAllowed(ask([LIMITER],Timing.ATTACK),'sometimes',[],ctx),true,'asks when an attack is declared');
same(chainWindowAllowed(ask([LIMITER],Timing.DAMAGE_STEP),'sometimes',[],ctx),true,'asks in the Damage Step');
same(chainWindowAllowed(ask([LIMITER],0),'sometimes',[{code:TRAP_HOLE}],ctx),true,'asks in answer to a chain');
for(const timing of [0,Timing.SUMMON,Timing.SPSUMMON,Timing.END_PHASE,Timing.MAIN_END,Timing.DRAW_PHASE])same(chainWindowAllowed(ask([LIMITER],timing),'sometimes',[],ctx),false,'quiet outside a battle, timing '+timing);
same(chainWindowAllowed(ask([LIMITER,TRAP_HOLE],Timing.SUMMON),'sometimes',[],ctx),true,'beside another card, that card\'s policy still opens the window');
same(chainWindowAllowed(ask([LIMITER],0),'never',[],ctx),false,'Never still skips it');
same(chainWindowAllowed(ask([LIMITER],0),'always',[],ctx),true,'Always still offers it');
console.log(`PASS Limiter Removal on Chain Sometimes: attack, Damage Step and chains only, ${checks} checks`);
process.exit(0);
