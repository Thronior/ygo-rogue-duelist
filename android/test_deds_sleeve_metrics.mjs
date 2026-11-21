// Deds' sleeves (2026-11-20): the new duel counters in sleeve-metrics.js, checked on real engine duels.
// A monster put on seat 0's field at startup decides the duel (Level 8 Normal Monster Decks: nobody else can summon).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const BEWD=id('Blue-Eyes White Dragon'),deck=Array(40).fill(BEWD);
// At startup: Special Summon `code` from seat 0's Deck to its field, and optionally pay an LP cost.
const startup=(code,pay=0)=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() ${pay?`Duel.PayLPCost(0,${pay})`:''} local c=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK,0,nil,${code}) if c then Duel.SpecialSummon(c,0,0,0,true,false,POS_FACEUP_ATTACK) end end) Duel.RegisterEffect(e,0) end`;

async function duel(code,enemyLP,pay=0){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start([...Array(39).fill(BEWD),code],deck,8000,enemyLP,5,11,[],[],startup(code,pay));
 for(let i=0;i<4000&&!s.finished;i++){if(!e.pending)break;s=e.respond(e.auto())}
 assert.deepEqual(e.errors||[],[]);
 ok(e.finished&&e.finished.player===0,`seat 0 wins with ${code}`);
 const event=e.summary().find(x=>x.kind==='sleeve_metrics');e.destroy();return event;
}

// Blue-Eyes (3,000 ATK, Dragon): a big finish, not a low one; the board's Type is reported.
let m=await duel(BEWD,1000);
ok(m.bigFinish===true&&m.lowFinish===false&&m.dmgFinish===false,'Blue-Eyes: 3,000 ATK final blow');
ok((m.fieldRaces&0x2000)!==0,'Blue-Eyes: Dragon on the field at the end');
ok(m.dmSummons===0,'Blue-Eyes: no Dark Magician summon');

// Dark Magician: a Special Summon counts as a Dark Magician summon (user, 2026-11-20); Spellcaster on the board.
m=await duel(id('Dark Magician'),1000,500);
ok(m.dmSummons===1,`Dark Magician: Special Summon counted (${m.dmSummons})`);
ok((m.fieldRaces&0x2)!==0&&!(m.fieldRaces&0x1),'Dark Magician: Spellcaster, not Warrior');
ok(m.lpPaid===500,`LP paid as a cost is counted (${m.lpPaid})`);

// Dark Magician Girl (2,000 ATK): her final blow, and 1,000 or less is not met.
m=await duel(id('Dark Magician Girl'),1000);
ok(m.dmgFinish===true&&m.lowFinish===false&&m.bigFinish===false,'Dark Magician Girl: her final blow');

// Kuriboh (300 ATK): both the 500-or-less and the 1,000-or-less finish.
m=await duel(id('Kuriboh'),300);
ok(m.lowFinish===true&&m.weakFinish===true,'Kuriboh: low-ATK final blow');
ok(m.lpPaid===0&&m.handLooks===0&&m.coinKills===0&&m.oppDiscards===0&&m.toExtra===0,'untouched counters stay 0');
// Solo play reuses one engine for every duel (mobile.js: destroy, then start). The counters must start from zero each
// duel; before 2026-11-20 they kept adding up (draws 11, 22, 33 over three identical duels).
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);const draws=[];
for(const round of [1,2,3]){
 let s=e.start(deck,deck,8000,8000,5,11);
 for(let i=0;i<40&&e.pending&&!s.finished;i++)s=e.respond(e.auto());
 draws.push(e.summary().find(x=>x.kind==='sleeve_metrics').draws);e.destroy();
}
ok(draws[0]>0&&draws.every(d=>d===draws[0]),`a reused engine counts each duel from zero (${draws})`);
console.log(`PASS Deds' sleeve duel counters: ${checks} checks`);
