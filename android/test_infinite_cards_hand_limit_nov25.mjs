// Infinite Cards removes every relic, shadow relic and curse hand size limit while it is face-up (Discord, 2026-11-25:
// Starving Library still made a player discard down to 3 with Infinite Cards on the field). Played in the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');let checks=0;
const same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};const ok=(v,why)=>{assert.ok(v,why);checks++};
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.')\n${code}`],{cwd:root,maxBuffer:1<<26}).toString();
const script=(artifacts=[],curses=[],level=0)=>py(`import json,passives;print(passives.script(json.loads(${JSON.stringify(JSON.stringify({curses,artifacts,challenge_level:level}))})))`);
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const INFINITE=id('Infinite Cards'),BLUE_EYES=id('Blue-Eyes White Dragon');
same(INFINITE,94163677,'the code the duel script checks');
// A deck of Blue-Eyes White Dragon and an 8-card opening hand: nothing to Summon, Set or activate, so the hand only
// shrinks by the End Phase discard. The opponent's Deck holds the Infinite Cards: Deck cards exist before the run's
// relic effects are registered, as in a real duel (a token made later would win as the last hand limit anyway).
const hand=(s,...extra)=>{e.start(Array(40).fill(BLUE_EYES),Array(40).fill(INFINITE),8000,8000,8,3,[],[],[s,...extra].join('\n'));for(let i=0;i<400&&e.turn<2&&e.pending&&!e.finished;i++)e.respond(e.auto());return e.query(0,L.HAND).filter(Boolean).length};
// Lua run once at a phase start of the first turn.
const at=(phase,op)=>`do local g=Effect.GlobalEffect() g:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) g:SetCode(EVENT_PHASE_START+PHASE_${phase}) g:SetOperation(function(e) e:Reset() ${op} end) Duel.RegisterEffect(g,0) end`;
const infinite=p=>at('DRAW',`Duel.MoveToField(Duel.GetFirstMatchingCard(Card.IsCode,1,LOCATION_DECK,0,nil,${INFINITE}),${p},${p},LOCATION_SZONE,POS_FACEUP,true)`);
const destroyed=at('END',`Duel.Destroy(Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_SZONE,LOCATION_SZONE,nil,${INFINITE}),REASON_RULE)`);
const negated=`do local n=Effect.GlobalEffect() n:SetType(EFFECT_TYPE_FIELD) n:SetCode(EFFECT_DISABLE) n:SetTargetRange(LOCATION_SZONE,LOCATION_SZONE) n:SetTarget(function(e,c) return c:IsCode(${INFINITE}) end) Duel.RegisterEffect(n,0) end`;

same(hand(script()),6,'the normal hand size limit is 6');
const full=hand(script(),infinite(0));same(full,9,'Infinite Cards alone lifts it: the hand keeps all 9 cards');
// Starving Library draws 1 more card, so its hand without a limit is 10.
const library=script(['cursed_starving_library']);
same(hand(library),3,'Starving Library: hand size limit 3');
same(hand(library,infinite(0)),full+1,'with your face-up Infinite Cards, no discard');
same(hand(library,infinite(1)),full+1,"the opponent's Infinite Cards counts too: it is each player's hand");
same(hand(library,infinite(0),destroyed),3,'the limit applies again once Infinite Cards leaves the field');
same(hand(library,infinite(0),negated),3,'and while its effect is negated');
same(hand(script(['cursed_crowded_crypt'])),2,'Crowded Crypt: hand size limit 2');
same(hand(script(['cursed_crowded_crypt']),infinite(0)),full,'Crowded Crypt with Infinite Cards: no discard');
same(hand(script(['mass_grave','cursed_empty_hand_pact'])),2,'Mass Grave and Empty-Hand Pact: hand size limit 2');
same(hand(script(['mass_grave','cursed_empty_hand_pact']),infinite(0)),full,'fused relics too');
same(hand(script([],['hand_limiter'],2)),3,'Hand Limiter curse: hand size limit 3');
same(hand(script([],['hand_limiter'],2),infinite(0)),full,'Hand Limiter curse with Infinite Cards: no discard');
same(hand(script(['cursed_starving_library'],['hand_limiter'])),1,'Starving Library and Hand Limiter: hand size limit 1');
same(hand(script(['cursed_starving_library'],['hand_limiter']),infinite(1)),full+1,'both lifted by Infinite Cards');

// Every hand limit the run script writes carries the condition, except the turn-1 rule that already lifts it.
const all=script(['cursed_starving_library','deep_pockets','endless_archive','mass_grave','cursed_empty_hand_pact','cursed_crowded_crypt'],['hand_limiter']);
const limits=all.split('\n').filter(x=>x.includes('EFFECT_HAND_LIMIT'));
ok(limits.length>=2,'the relics and the curse write hand limits');
ok(limits.every(x=>x.includes(`c:IsCode(${INFINITE})`)),'each one stops while Infinite Cards is face-up');
// The hand warning (the hand shakes and the cards over the limit get a red rim) reads the same limit in mobile.js. It
// still warned at Starving Library's 3 with Infinite Cards face-up, which is what the player saw.
{
 const src=fs.readFileSync(root+'android/web/mobile.js','utf8'),start=src.indexOf('function handSizeLimit(s){'),end=src.indexOf('\n}',start)+2;
 ok(start>0,'handSizeLimit exists');
 const limit=(run,mine=[],theirs=[],tag=false)=>new Function('state','snapshot',src.slice(start,end)+'\nreturn handSizeLimit;')({run},{tag})({turn:3,players:[{spells:mine},{spells:theirs}]});
 const face=(code,position=5)=>({code,position}),library={artifacts:['cursed_starving_library'],curses:['hand_limiter'],challenge_level:0};
 same(limit(library),1,'Starving Library and Hand Limiter: warns over 1 card');
 same(limit(library,[null,face(INFINITE)]),100,'your face-up Infinite Cards: no warning');
 same(limit(library,[],[face(INFINITE)]),100,"the opponent's: no warning either");
 same(limit(library,[face(INFINITE,10)]),1,'a Set Infinite Cards changes nothing');
 same(limit({artifacts:[],curses:[]},[face(INFINITE)]),100,'it lifts the normal 6 too');
 same(limit(null,[face(INFINITE)],[],true),100,'in Tag duels as well');
}
console.log(`Infinite Cards hand limit checks passed: ${checks}`);
