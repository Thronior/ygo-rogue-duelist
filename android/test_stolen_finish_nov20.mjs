// "Beat them with their own monster" (jerichoholic on Discord, agreed by the user 2026-11-20): the battle damage that
// ends the duel comes from a monster the opponent owns. sleeve-metrics.js sets stolenFinish from the attacker's owner
// (Q.OWNER) against its controller; duel_rewards.py pays 50 coins for it on a win. Solo and Tag (the team is seat 0).
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel}=await import('./web/duel.js');
const {TagDuel}=await import('./web/tag-duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};

// Level 8 Normal Monsters only: nobody can summon anything, so the one monster put on seat 0's field decides the duel.
const BEWD=id('Blue-Eyes White Dragon'),deck=Array(40).fill(BEWD);
// At startup, Special Summon a Blue-Eyes from OWNER's Deck to seat 0's field (Monster Reborn / Change of Heart style).
const summonFrom=owner=>`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_STARTUP) e:SetOperation(function(e) e:Reset() local c=Duel.GetFirstMatchingCard(Card.IsCode,${owner},LOCATION_DECK,0,nil,${BEWD}) if c then Duel.SpecialSummon(c,0,0,0,true,false,POS_FACEUP_ATTACK) end end) Duel.RegisterEffect(e,0) end`;

function play(e,s){
 for(let i=0;i<4000&&!s.finished;i++){if(!e.pending)break;s=e.respond(e.auto())}
 return s;
}
function finish(e,label){
 assert.deepEqual(e.errors||[],[],label);
 ok(e.finished&&e.finished.player===0&&Number(e.finished.reason)===1,`${label}: seat 0 wins on LP (${JSON.stringify(e.finished)})`);
 const event=e.summary().find(x=>x.kind==='sleeve_metrics');
 ok(event&&event.winReason===1,`${label}: the duel reports its win reason`);
 return event;
}

for(const [owner,stolen] of [[1,true],[0,false]]){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 play(e,e.start(deck,deck,8000,1000,5,11,[],[],summonFrom(owner)));
 const event=finish(e,`solo, owner ${owner}`);
 ok(event.stolenFinish===stolen,`solo: a Blue-Eyes owned by seat ${owner} ${stolen?'counts':'does not count'} as their own monster`);
 e.destroy();
}

// Tag: either partner's attack counts, since the core reports the whole team as seat 0 and the opponents as seat 1.
for(const [owner,stolen] of [[1,true],[0,false]]){
 const e=await new TagDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 const s=e.startTag({teams:[[{main:deck},{main:deck}],[{main:deck},{main:deck}]],lp:8000,enemyLP:1000,seed:11,passives:summonFrom(owner)});
 play(e,s);
 const event=finish(e,`Tag, owner ${owner}`);
 ok(event.stolenFinish===stolen,`Tag: a Blue-Eyes owned by seat ${owner} ${stolen?'counts':'does not count'}`);
 e.destroy();
}
console.log(`PASS Beat them with their own monster: ${checks} checks`);
