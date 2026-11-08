// Karate Man doubles its original ATK, so relic, Field Spell and Equip boosts stay on top (Discord, 2026-11-06).
// The official EDOPro script set the final ATK to 2000 and wiped them.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const KARATE=id('Karate Man'),SOGEN=id('Sogen'),SWORD=id('Legendary Sword'),KURIBOH=id('Kuriboh');
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const relicScript=artifacts=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');import passives;print(passives.script(json.loads(sys.argv[1])))",JSON.stringify({curses:[],artifacts,challenge_level:0})],{cwd:root,encoding:'utf8'});
let checks=0;

// Karate Man starts face-up with Sogen (+200) and an equipped Legendary Sword (+300); Demonic Sword gives +100.
const setup=boosts=>`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true local find=function(code) return Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,code) end
 local k=find(${KARATE}) Duel.MoveToField(k,0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 if ${boosts} then Duel.MoveToField(find(${SOGEN}),0,0,LOCATION_FZONE,POS_FACEUP,true)
 local s=find(${SWORD}) Duel.MoveToField(s,0,0,LOCATION_SZONE,POS_FACEUP,true) Duel.Equip(0,s,k) end end) Duel.RegisterEffect(e,0) end`;

async function run(karateScript,boosts=true){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,{...scripts,'c23289281.lua':karateScript}]);
 const deck=[KARATE,SOGEN,SWORD,...Array(37).fill(KURIBOH)];
 let s=e.start(deck,Array(40).fill(KURIBOH),8000,8000,5,11,[],[],(boosts?relicScript(['sword']):'')+'\n'+setup(boosts));
 const karate=()=>e.query(0,L.MZONE).find(c=>c?.code===KARATE);
 let before=null,after=null,destroyed=false;
 for(let i=0;i<3000&&!s.finished&&e.turn<=4;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   const at=m.activates.findIndex(c=>c.code===KARATE);
   if(before===null&&at>=0){before=karate().attack;s=e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:at});continue}
   if(before!==null&&after===null&&karate())after=karate().attack;
   s=e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});
   if(after!==null){for(let j=0;j<200&&e.pending&&!(e.pending.player===0&&e.pending.type===M.SELECT_IDLECMD);j++)s=e.respond(e.auto());destroyed=!karate()&&e.query(0,L.GRAVE).some(c=>c?.code===KARATE);break}
   continue}
  s=e.respond(e.auto())}
 const errors=e.errors.filter(x=>x.trim());e.destroy();return {before,after,destroyed,errors};
}

const house=await run(scripts['c23289281.lua']);
console.log('house script',house);
assert.equal(house.before,1600,'1000 + 100 relic + 200 Sogen + 300 Legendary Sword');checks++;
assert.equal(house.after,2600,'original ATK doubles to 2000 and every boost stays');checks++;
assert(house.destroyed,'Karate Man is still destroyed in the End Phase');checks++;
assert.deepEqual(house.errors,[]);checks++;

const plain=await run(scripts['c23289281.lua'],false);
console.log('no boosts',plain);
assert.equal(plain.after,2000,'without boosts it still doubles 1000 to 2000');checks++;

const official=await run(fs.readFileSync(root+'runtime/script/official/c23289281.lua','utf8'));
console.log('official script',official);
assert.equal(official.after,2000,'the official script set the final ATK to 2000, the reported bug');checks++;

assert(scripts['c23289281.lua'].includes('EFFECT_SET_BASE_ATTACK')&&!scripts['c23289281.lua'].includes('EFFECT_SET_ATTACK_FINAL'),'the bundle ships the house script');checks++;
console.log(`PASS Karate Man keeps relic, Field Spell and Equip boosts after doubling (${checks} checks)`);
