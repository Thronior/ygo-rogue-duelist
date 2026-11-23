// Chain Sometimes offers The Selection when a monster is being summoned (Discord, Lexi, 2026-11-22: it never asked against
// Summoned Skull). The core sends that summon-negation window with no timing bits, and The Selection's text ("Negate the
// Summon of a monster...") has no "when", so the window was passed silently (replay cd38e251, step 48).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {M,L}=await import('./web/duel.js');
const {chainWindowAllowed}=await import('./web/duel-presentation.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),id=n=>meta.cards.find(c=>c.name===n).id,byId=new Map(meta.cards.map(c=>[c.id,c]));
let checks=0;const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
// The window exactly as the replay recorded it: spe_count 1, no timing bits, during the opponent's Main Phase.
const summoning=codes=>({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:1,hint_timing:0,hint_timing_other:0,selects:codes.map(code=>({code,location:L.SZONE}))});
const ctx={turnPlayer:1,phase:4,attackers:1,card:code=>byId.get(code)};
same(chainWindowAllowed(summoning([id('The Selection')]),'sometimes',[],ctx),true,'Sometimes offers The Selection while a monster is summoned');
same(chainWindowAllowed(summoning([id('Horn of Heaven')]),'sometimes',[],ctx),true,'Horn of Heaven asks too');
same(chainWindowAllowed(summoning([id('The Selection')]),'never',[],ctx),false,'Never still skips it');
same(chainWindowAllowed(summoning([id('Waboku')]),'sometimes',[],ctx),false,'other cards keep the Sometimes policy: Waboku waits');
// Drop Off is only offered right after the opponent's normal draw, so Sometimes always asks for it (Discord, 2026-11-23).
same(chainWindowAllowed({type:M.SELECT_CHAIN,player:0,forced:false,spe_count:1,hint_timing:0,hint_timing_other:0,selects:[{code:id('Drop Off'),location:L.SZONE}]},'sometimes',[],{turnPlayer:1,phase:1,card:code=>byId.get(code)}),true,"Sometimes offers Drop Off on the opponent's draw");
console.log(`PASS Chain Sometimes asks for summon-negating Traps (${checks} checks)`);
