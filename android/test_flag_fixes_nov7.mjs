// Behaviour flags 2026-11-07.
// c9299a1c2a "Cpu wasted brain control": the CPU took a monster with Brain Control, then never Tributed it for the
// Monarch in its hand. It now takes the strongest monster, Tributes it (the borrowed monster goes first) and uses the
// Monarch's summon effect.
// 6a504a5098 (Tag): Tsukuyomi turned Mother Grizzly face-down, then attacked it under Mirror Stats. The CPU judged its
// DEF from the printed DEF, but Mirror Stats flips it up with its printed ATK as DEF.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const {smartContext}=await import('./web/smart_policy.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const BRAIN=id('Brain Control'),GRANMARG=id('Granmarg the Rock Monarch'),XHEAD=id('X-Head Cannon'),ROULETTE=id('Roulette Barrel'),KURIBOH=id('Kuriboh'),TRAP=id('Mirror Force'),GRIZZLY=id('Mother Grizzly');
let checks=0;

// The player has X-Head Cannon, Roulette Barrel and a Set Mirror Force; the CPU has Kuriboh, Brain Control and Granmarg.
{
 const setup=`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true local find=function(p,code) return Duel.GetFirstMatchingCard(Card.IsCode,p,LOCATION_DECK+LOCATION_HAND,0,nil,code) end
 Duel.MoveToField(find(0,${XHEAD}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) Duel.MoveToField(find(0,${ROULETTE}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
 Duel.SSet(0,find(0,${TRAP})) Duel.MoveToField(find(1,${KURIBOH}),1,1,LOCATION_MZONE,POS_FACEUP_DEFENSE,true)
 Duel.SendtoHand(find(1,${BRAIN}),nil,REASON_RULE) Duel.SendtoHand(find(1,${GRANMARG}),nil,REASON_RULE) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start([XHEAD,ROULETTE,TRAP,...Array(37).fill(KURIBOH)],[BRAIN,GRANMARG,...Array(38).fill(KURIBOH)],8000,8000,5,11,[],[],setup);
 const nm=c=>c?e.name(c.code):'-',log=[];
 for(let i=0;i<3000&&!s.finished&&e.turn<=2;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){s=e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_CHAIN){s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
  const r=e.auto(m);
  if(m.player===1&&e.turn===2){
   if(m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_ACTIVATE)log.push('activate '+nm(m.activates[r.index]));
   if(m.type===M.SELECT_IDLECMD&&r.action===I.SELECT_SUMMON)log.push('summon '+nm(m.summons[r.index]));
   if(m.type===M.SELECT_TRIBUTE)log.push('tribute '+r.indicies.map(i=>nm(m.selects[i])).join('+'));
   if(m.type===M.SELECT_CARD)log.push('pick '+r.indicies.map(i=>nm(m.selects[i])).join('+'));
  }
  s=e.respond(r);
  if(e.turn===2&&e.phase>=8)break;
 }
 console.log('Brain Control turn:',log.join(' | '));
 assert(log.includes('activate Brain Control'),'the CPU plays Brain Control');checks++;
 assert(log.includes('pick X-Head Cannon'),'it takes the stronger monster, which it will Tribute');checks++;
 assert(log.includes('summon Granmarg the Rock Monarch'),'it Tribute Summons the Monarch');checks++;
 assert(log.includes('tribute X-Head Cannon'),'the borrowed monster is the Tribute, not Kuriboh');checks++;
 assert(e.query(0,L.GRAVE).some(c=>c?.code===XHEAD),'X-Head Cannon goes to its owner\'s GY');checks++;
 assert(!e.query(0,L.SZONE).some(c=>c?.code===TRAP),'Granmarg destroys the Set Mirror Force');checks++;
 assert(e.query(1,L.MZONE).some(c=>c?.code===KURIBOH),'the CPU keeps its own Kuriboh');checks++;
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;
 e.destroy();
}

// A known face-down Mother Grizzly (1400/1000): its hidden DEF is 1000 normally and its printed ATK under Mirror Stats.
{
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 const setup=`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true Duel.MoveToField(Duel.GetFirstMatchingCard(Card.IsCode,0,LOCATION_DECK+LOCATION_HAND,0,nil,${GRIZZLY}),0,0,LOCATION_MZONE,POS_FACEDOWN_DEFENSE,true) end) Duel.RegisterEffect(e,0) end`;
 e.start([GRIZZLY,...Array(39).fill(KURIBOH)],Array(40).fill(KURIBOH),8000,8000,5,11,[],[],setup);
 for(let i=0;i<50&&e.pending&&!e.query(0,L.MZONE).some(Boolean);i++)e.respond(e.auto());
 const t=e.query(0,L.MZONE).find(Boolean);assert(t&&!(t.position&5),'Mother Grizzly is face-down');
 e.fieldKnowledge.seats[1].set(e.fieldKnowledge.key(t),GRIZZLY);
 const hidden=curses=>{e.aiModifiers={...(e.aiModifiers||{}),activeCurses:curses,challengeLevel:0};return smartContext(e,1,L,e.pending).hiddenDefense(t)};
 assert.equal(hidden([]),1000,'printed DEF without a swap');checks++;
 assert.equal(hidden(['mirror_stats']),1400,'Mirror Stats: the printed ATK becomes its DEF');checks++;
 e.destroy();
}
console.log(`PASS Brain Control Tribute plan and Mirror Stats face-down DEF (${checks} checks)`);
