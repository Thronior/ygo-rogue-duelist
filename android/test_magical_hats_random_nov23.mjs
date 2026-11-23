// Magical Hats (user, 2026-11-23, after idkjustputagoodname on Discord, 2026-11-22: "does the AI know which set is the
// monster?"). The CPU attacks a random one of the face-down cards it cannot tell apart: the core reports every card's
// real code and stats, but neither the decoys' 0 ATK/DEF nor the real monster's stats may steer the pick.
// 1) Board check: whichever monster hides between two decoys, the CPU picks the same zones, and every zone gets hit.
// 2) Real duels: Magical Hats against a Blue-Eyes attack hits the real monster about a third of the time.
import fs from 'node:fs';import assert from 'node:assert/strict';
const {MobileDuel,M,L,R}=await import('./web/duel.js');
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
let checks=0;

// 1) Board check. Every monster in the game takes a turn as the real card in zone 1 between two 0/0 decoys: the CPU's
// picks over the seeds must be the same whichever monster it is (its identity never matters), and spread over all three.
const BEWD=id('Blue-Eyes White Dragon'),ELF=id('Mystical Elf'),POT=id('Pot of Greed');
const monsters=meta.cards.filter(c=>(data[c.id]?.type&1)&&!(data[c.id]?.type&0x4000)).map(c=>c.id);
const patterns=new Map();let hits=[0,0,0];
for(const code of monsters){let pattern='';
 for(let seed=1;seed<=9;seed++){
  const e=new MobileDuel(meta.cards);Object.assign(e,{data,lp:[8000,8000],turn:4,player:1,phase:8,events:[],visuals:[],peak:{turns:0},pendingSummons:[],activeChain:[],battleProtected:[false,false],
   tributeSets:new Set(),releasedForSet:[0,0],cancelledAttacks:new Map(),piercingTurn:{},piercingCards:new Map(),feedbackStats:new Map(),misprintedHands:[new Set(),new Set()],misprintedHandStats:[new Map(),new Map()],reasoningSeed:seed*2654435761>>>0});
  const own=[{code:BEWD,controller:1,location:L.MZONE,sequence:0,position:1,attack:3000,defense:2500}],d=data[code];
  const enemy=[{code:POT,controller:0,location:L.MZONE,sequence:0,position:8,attack:0,defense:0},{code,controller:0,location:L.MZONE,sequence:1,position:8,attack:d.attack,defense:d.defense},{code:POT,controller:0,location:L.MZONE,sequence:2,position:8,attack:0,defense:0}];
  e.query=(s,l)=>l===L.MZONE?(s===1?own:enemy):[];
  e.selectionHint=549;e.attacker={player:1,sequence:0,attack:3000,controller:1,location:L.MZONE};
  const r=e.auto({type:M.SELECT_CARD,player:1,min:1,max:1,can_cancel:true,selects:enemy.map(c=>({...c}))});
  assert.equal(r.indicies?.length,1,'one target');pattern+=r.indicies[0];if(code===ELF)hits[r.indicies[0]]++;
 }
 if(!patterns.has(pattern))patterns.set(pattern,meta.cards.find(c=>c.id===code).name);
}
assert.equal(patterns.size,1,`the hidden monster changed the CPU's picks: ${JSON.stringify([...patterns])}`);checks++;
assert(hits.every(n=>n>0),`every face-down card gets attacked: ${hits}`);checks++;

// 2) Real duels with Magical Hats.
const HATS=id('Magical Hats'),FILL=id('Waboku');
const tally={real:0,decoy:0};
for(let seed=1;seed<=45;seed++){
 const setup=`do local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset() Duel.MoveToField(Duel.CreateToken(0,${ELF}),0,0,LOCATION_MZONE,POS_FACEUP_ATTACK,true) Duel.SSet(0,Duel.CreateToken(0,${HATS})) Duel.MoveToField(Duel.CreateToken(1,${BEWD}),1,1,LOCATION_MZONE,POS_FACEUP_ATTACK,true) end) Duel.RegisterEffect(e,0) end`;
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(Array(40).fill(POT),Array(40).fill(FILL),8000,8000,0,seed*7919,[],[],setup),hats=false;
 for(let i=0;i<3000&&!s.finished&&e.turn<=2;i++){const m=e.pending;if(!m)break;
  if(m.player===0&&m.type===M.SELECT_CHAIN&&e.turn===2){const at=(m.selects||[]).findIndex(c=>c.code===HATS);if(at>=0){hats=true;s=e.respond({type:R.SELECT_CHAIN,index:at});continue}}
  s=e.respond(e.auto())}
 assert(hats,`seed ${seed}: Magical Hats was activated`);
 if(e.query(0,L.GRAVE).some(c=>c&&c.code===ELF))tally.real++;else tally.decoy++;
 e.destroy();
}
const share=tally.real/(tally.real+tally.decoy);
assert(share>.18&&share<.5,`the real monster is hit about a third of the time: ${JSON.stringify(tally)}`);checks++;
console.log(`PASS Magical Hats: ${monsters.length} hidden monsters give the same picks (${hits.join('/')}), real monster hit ${tally.real} of ${tally.real+tally.decoy} (${checks} checks)`);
