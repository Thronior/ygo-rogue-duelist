// Chain Sometimes offers A Feint Plan only during the opponent's Battle Phase (user request 2026-11-04).
// Never and Always are unchanged, and other cards keep the Sometimes policy.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {M,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const root=fileURLToPath(new URL('../',import.meta.url)),meta=JSON.parse(fs.readFileSync(root+'android/web/content.json','utf8').replace(/^﻿/,''));
const byId=new Map(meta.cards.map(c=>[c.id,c])),id=n=>meta.cards.find(c=>c.name===n).id,FEINT=id('A Feint Plan'),TRAP_HOLE=id('Trap Hole');
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
// Player 0 is asked; summon and attack timings would normally open the window on Sometimes.
const ask=(codes,timing=0x1000)=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:4,hint_timing:timing,hint_timing_other:timing,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx=(turnPlayer,phase)=>({turnPlayer,phase,attackers:1,card:code=>byId.get(code)});
// OCG phases: 0x04 Main 1, 0x08 Battle start, 0x10 Battle step, 0x20 Damage, 0x40 Damage calculation, 0x80 Battle end, 0x100 Main 2, 0x200 End.
for(const phase of [0x08,0x10,0x20,0x40,0x80])same(chainWindowAllowed(ask([FEINT]),'sometimes',[],ctx(1,phase)),true,'offered in the opponent\'s Battle Phase, phase '+phase);
for(const phase of [0x01,0x02,0x04,0x100,0x200])same(chainWindowAllowed(ask([FEINT]),'sometimes',[],ctx(1,phase)),false,'not outside the Battle Phase, phase '+phase);
for(const phase of [0x04,0x10,0x200])same(chainWindowAllowed(ask([FEINT]),'sometimes',[],ctx(0,phase)),false,'never on your own turn, phase '+phase);
same(chainWindowAllowed(ask([FEINT]),'never',[],ctx(1,0x10)),false,'Never still skips it');
same(chainWindowAllowed(ask([FEINT]),'always',[],ctx(0,0x04)),true,'Always still offers it anywhere');
same(chainWindowAllowed(ask([FEINT,TRAP_HOLE]),'sometimes',[],ctx(1,0x04)),true,'beside another card, the other card\'s policy still opens the window');
same(chainWindowAllowed(ask([FEINT]),'sometimes',[],{card:code=>byId.get(code)}),false,'without a known turn player it stays quiet');
console.log(`PASS A Feint Plan on Chain Sometimes: opponent's Battle Phase only, ${checks} checks`);
process.exit(0);
