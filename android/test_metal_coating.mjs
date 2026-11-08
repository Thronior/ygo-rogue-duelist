// Bandit Keith's Metalmorph loadout (user, 2026-11-08). Metal Coating adds Metalmorph to the starting hand, and both
// metalmorphed monsters in his pack Special Summon from the Deck by Tributing their base monster equipped with Metalmorph.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0,character:4})],{cwd:root,encoding:'utf8'});
const ZOA=id('Zoa'),METALZOA=id('Metalzoa'),MORPH=id('Metalmorph'),REDEYES=id('Red-Eyes Black Dragon'),METALRED=id('Red-Eyes Black Metal Dragon'),FILLER=id('Pot of Greed');
let checks=0;

// Metalmorph sits at the bottom of the Deck, far from the opening hand (the last five cards).
for(const relic of [true,false]){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 e.start([MORPH,...Array(39).fill(FILLER)],Array(40).fill(FILLER),8000,8000,5,7,[],[],script(relic?['metal_coating']:[]));
 const hand=e.query(0,L.HAND).filter(Boolean).map(c=>c.code);
 assert.equal(hand.includes(MORPH),relic,relic?'Metal Coating puts Metalmorph in the starting hand':'without the relic Metalmorph stays in the Deck');checks++;
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;e.destroy();
}

// Zoa / Red-Eyes B. Dragon equipped with Metalmorph: the metalmorphed monster is offered from the Deck and summoned.
for(const [base,metal] of [[ZOA,METALZOA],[REDEYES,METALRED]]){
 const setup=`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true local z=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,${base}) Duel.MoveToField(z,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
local m=Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,${MORPH}) Duel.MoveToField(m,0,0,LOCATION_SZONE,POS_FACEUP,true)
local limit=Effect.CreateEffect(m) limit:SetType(EFFECT_TYPE_SINGLE) limit:SetCode(EFFECT_EQUIP_LIMIT) limit:SetValue(1) m:RegisterEffect(limit) Duel.Equip(0,m,z) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 e.start([base,MORPH,metal,...Array(37).fill(FILLER)],Array(40).fill(FILLER),8000,8000,5,11,[],[],setup);
 let summoned=false;
 for(let i=0;i<200&&e.pending;i++){const m=e.pending;
  if(m.player===0&&m.type===M.SELECT_IDLECMD&&e.phase>=4){
   const index=m.special_summons.findIndex(c=>c.code===metal&&c.location===L.DECK);
   assert(index>=0,`${e.name(metal)} is offered from the Deck`);checks++;
   e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SPECIAL_SUMMON,index});
   for(let j=0;j<20&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;j++)e.respond(e.auto(e.pending));
   summoned=true;break;
  }
  e.respond(e.auto(m));
 }
 assert(summoned);
 const field=e.query(0,L.MZONE).filter(Boolean).map(c=>c.code);
 assert.deepEqual(field,[metal],`${e.name(base)} was Tributed for ${e.name(metal)}`);checks++;
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;e.destroy();
}
console.log(`PASS Metal Coating starting hand and Metalmorph Deck summons (${checks} checks)`);
process.exit(0);
