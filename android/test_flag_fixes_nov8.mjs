// Behaviour flag and Discord report, 2026-11-08.
// e7aef02f91: under Light of Intervention (no Sets) the CPU summoned nothing for 7 turns. It now summons the blocker
// that cuts the coming damage most.
// Eriko: the CPU Normal Summoned Kuriboh at 1100 LP and lost to the attack Kuriboh's discard would have stopped.
// Kuriboh now stays in the hand unless Multiply is ready.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const LIGHT=id('Light of Intervention'),XHEAD=id('X-Head Cannon'),MUSE=id('Muse-A'),ELF=id('Dancing Elf'),KURIBOH=id('Kuriboh'),MULTIPLY=id('Multiply'),FILLER=id('Pot of Greed'),SPEAR=id("Gravekeeper's Spear Soldier");
let checks=0;

// Puts the listed cards on the field during turn 1, then lets the player pass so the CPU plays turn 2.
async function cpuTurn(player0,setupLua,cpuDeck,lp1=8000){
 const setup=`do local done=false local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD+EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START+PHASE_MAIN1)
e:SetCondition(function() return not done end)
e:SetOperation(function() done=true local find=function(p,code) return Duel.GetFirstMatchingCard(Card.IsCode,p,LOCATION_DECK+LOCATION_HAND,0,nil,code) end ${setupLua} end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(player0,cpuDeck,8000,lp1,5,11,[],[],setup);const nm=c=>c?e.name(c.code):'-',log=[];
 for(let i=0;i<2000&&!s.finished&&e.turn<=2;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_IDLECMD){s=e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue}
  if(m.player===0&&m.type===M.SELECT_CHAIN){s=e.respond({type:R.SELECT_CHAIN,index:null});continue}
  const r=e.auto(m);
  if(m.player===1&&e.turn===2&&m.type===M.SELECT_IDLECMD){
   if(r.action===I.SELECT_SUMMON)log.push('summon '+nm(m.summons[r.index]));
   if(r.action===I.SELECT_MONSTER_SET)log.push('set '+nm(m.monster_sets[r.index]));
  }
  s=e.respond(r);if(e.turn===2&&e.phase>=8)break;
 }
 return {e,log};
}

{
 const {e,log}=await cpuTurn([LIGHT,XHEAD,...Array(38).fill(FILLER)],
  `Duel.MoveToField(find(0,${LIGHT}),0,0,LOCATION_SZONE,POS_FACEUP,true) Duel.MoveToField(find(0,${XHEAD}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true)
   Duel.SendtoHand(find(1,${MUSE}),nil,REASON_RULE) Duel.SendtoHand(find(1,${ELF}),nil,REASON_RULE)`,
  [MUSE,ELF,...Array(38).fill(FILLER)],2000);
 console.log('Light of Intervention:',log.join(' | ')||'nothing');
 assert(log.includes('summon Muse-A'),'with no Set allowed, the CPU summons its best blocker');checks++;
 assert.deepEqual(e.errors.filter(x=>x.trim()),[]);checks++;e.destroy();
}
{
 const {e,log}=await cpuTurn([SPEAR,...Array(39).fill(FILLER)],
  `Duel.MoveToField(find(0,${SPEAR}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) Duel.SendtoHand(find(1,${KURIBOH}),nil,REASON_RULE)`,
  [KURIBOH,...Array(39).fill(FILLER)],1100);
 console.log('Kuriboh alone:',log.join(' | ')||'nothing');
 assert(!log.some(x=>x.endsWith('Kuriboh')),'Kuriboh is neither summoned nor Set');checks++;
 assert(e.query(1,L.HAND).some(c=>c?.code===KURIBOH),'Kuriboh stays in the hand');checks++;
 assert.equal(e.keptInHand({code:KURIBOH},1),true);checks++;
 e.destroy();
}
{
 const {e}=await cpuTurn([FILLER,...Array(39).fill(FILLER)],
  `Duel.SendtoHand(find(1,${KURIBOH}),nil,REASON_RULE) Duel.SendtoHand(find(1,${MULTIPLY}),nil,REASON_RULE)`,
  [KURIBOH,MULTIPLY,...Array(38).fill(FILLER)]);
 assert.equal(e.keptInHand({code:KURIBOH},1),!e.query(1,L.HAND).concat(e.query(1,L.SZONE)).some(c=>c?.code===MULTIPLY),'with Multiply ready, Kuriboh may come out');checks++;
 e.destroy();
}
// Flag 7db4ef7d (evening): the CPU chained Enemy Controller on the attacker, then Waboku on top. Switching the attacker to
// Defense already stops the attack, so Waboku is held.
{
 const {smartContext}=await import('./web/smart_policy.js');
 const e=new MobileDuel(meta.cards);const zones={};e.query=(side,loc)=>zones[`${side}:${loc}`]||[];
 Object.assign(e,{data,lp:[2900,6000],player:0,turn:3,phase:8,activeChain:[],battleProtected:[false,false],aiModifiers:{activeRelics:[[],[]],statRelics:[[],[]],spellTrapZones:5}});
 const card=(n,side,loc,pos,sequence)=>({code:id(n),controller:side,location:loc,sequence,position:pos,attack:data[id(n)].attack,defense:data[id(n)].defense});
 const elf=card('Gemini Elf',0,L.MZONE,1,0),landstar=card('Swordsman of Landstar',1,L.MZONE,8,0),waboku=card('Waboku',1,L.SZONE,8,1),controller=card('Enemy Controller',1,L.SZONE,1,2);
 zones[`0:${L.MZONE}`]=[elf];zones[`1:${L.MZONE}`]=[landstar];zones[`1:${L.SZONE}`]=[waboku,controller];
 Object.assign(e,{attackCard:elf,attackTarget:landstar});
 const prompt={type:M.SELECT_CHAIN,player:1,selects:[waboku]};
 assert(smartContext(e,1,L,prompt).activation(waboku,true)>0,'alone, Waboku saves the attacked monster');checks++;
 e.activeChain=[{code:controller.code,player:1,targets:[{controller:0,location:L.MZONE,sequence:0,code:elf.code}],location:L.SZONE,sequence:2,controller:1,link:1}];
 assert.equal(smartContext(e,1,L,prompt).activation(waboku,true),-1,'Enemy Controller on the attacker already stops the attack');checks++;
 e.activeChain[0].targets=[{controller:1,location:L.MZONE,sequence:0,code:landstar.code}];
 assert(smartContext(e,1,L,prompt).activation(waboku,true)>0,'Enemy Controller on another monster does not stop the attack');checks++;
}
console.log(`PASS Light of Intervention blockers, Kuriboh kept in hand, no Waboku over Enemy Controller (${checks} checks)`);
