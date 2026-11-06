// Dinosaur deck rules (deck trace, 2026-11-06): Ultra Evolution Pill, Soul Release with Giant Rex, no equips on a
// borrowed monster, Heavy Storm free trades, defensive revival on our turn, and battle-first over removal.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,owner:controller,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel(meta.cards),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,side,seq)=>card(name,L.GRAVE,side,seq,5);
 // 1. Ultra Evolution Pill: a Reptile pays for a big Dinosaur, Sinister Serpent first; never for Gilasaurus.
 {
  const pill=inHand('Ultra Evolution Pill',0),serpent=mon('Sinister Serpent',p,0),apophis=mon('Embodiment of Apophis',p,1,1,{race:0x80000});
  let e=duel(p,{mzone:[serpent,apophis],hand:[pill,inHand('Black Tyranno',1)]},{mzone:[]});
  const ctx=smartContext(e,p,L,{to_bp:true});
  ok(ctx.activation(pill,false)>=80,'Pill: Serpent into Black Tyranno');
  e=duel(p,{mzone:[serpent,apophis],hand:[pill,inHand('Black Tyranno',1)]},{mzone:[]},{effect:{code:id('Ultra Evolution Pill'),player:p}});
  const t=smartContext(e,p,L,{to_bp:true});
  ok(t.targetScore('Ultra Evolution Pill',serpent,{})>t.targetScore('Ultra Evolution Pill',apophis,{}),'Sinister Serpent is Tributed before Embodiment of Apophis');
  ok(smartContext(duel(p,{mzone:[serpent],hand:[pill,inHand('Gilasaurus',1)]},{mzone:[]}),p,L,{to_bp:true}).activation(pill,false)<0,'never for Gilasaurus');
  ok(smartContext(duel(p,{mzone:[mon('Vorse Raider',p,0)],hand:[pill,inHand('Black Tyranno',1)]},{mzone:[]}),p,L,{to_bp:true}).activation(pill,false)<0,'no Reptile, no Pill');
  const ctx2=smartContext(duel(p,{mzone:[serpent],hand:[pill,inHand('Mirror Force',1)]},{mzone:[]}),p,L);
  ok(ctx2.handLoss(pill)<ctx2.handLoss(inHand('Mirror Force',1)),'a Pill with no Dinosaur in hand is discarded before Mirror Force');
 }
 // 2. Soul Release brings back Giant Rex, grown by our cheap banished Dinosaurs, and takes their revival targets.
 {
  const release=inHand('Soul Release',0),rex=gy('Giant Rex',p,0),gila=gy('Gilasaurus',p,1),tyranno=gy('Black Tyranno',p,2),skull=gy('Summoned Skull',o,0);
  let e=duel(p,{mzone:[],hand:[release],grave:[rex,gila,tyranno]},{mzone:[],grave:[skull]});
  ok(smartContext(e,p,L).activation(release,false)>=80,'Soul Release with a Giant Rex in our GY');
  e=duel(p,{mzone:[],hand:[release],grave:[rex,gila,tyranno]},{mzone:[],grave:[skull]},{effect:{code:id('Soul Release'),player:p}});
  const t=smartContext(e,p,L);
  ok(t.targetScore('Soul Release',rex,{})>t.targetScore('Soul Release',skull,{})&&t.targetScore('Soul Release',skull,{})>t.targetScore('Soul Release',gila,{}),'Rex first, then their Summoned Skull, then Gilasaurus');
  ok(t.targetScore('Soul Release',gila,{})>=0&&t.targetScore('Soul Release',tyranno,{})<0,'Gilasaurus grows Rex; Black Tyranno stays for revival');
  ok(smartContext(duel(p,{mzone:[],hand:[release],grave:[gila]},{mzone:[],grave:[gy('Battle Ox',o,0)]}),p,L).activation(release,false)<0,'no Rex and nothing big of theirs: hold it');
 }
 // 3. No permanent equip on a monster we only borrow.
 {
  const axe=inHand('Axe of Despair',0),stolen=mon('Summoned Skull',p,0,1,{owner:o}),opp=mon('Battle Ox',o,0);
  const ctx=smartContext(duel(p,{mzone:[stolen],hand:[axe]},{mzone:[opp]}),p,L,{to_bp:true});
  ok(ctx.activation(axe,false)<0,'Axe stays in hand while our only monster is borrowed');
  const ours=mon('Summoned Skull',p,0);
  ok(smartContext(duel(p,{mzone:[ours],hand:[axe]},{mzone:[opp]}),p,L,{to_bp:true}).activation(axe,false)>=0,'our own monster still gets it');
 }
 // 4. Heavy Storm: two of their Set cards for none of ours.
 {
  const storm=inHand('Heavy Storm',0),sets=[card('Trap Hole',L.SZONE,o,0,10),card('Rush Recklessly',L.SZONE,o,1,10)];
  ok(smartContext(duel(p,{mzone:[],hand:[storm]},{mzone:[],szone:sets}),p,L).activation(storm,false)>=0,'free two-for-one');
  ok(smartContext(duel(p,{mzone:[],hand:[storm],szone:[card('Mirror Force',L.SZONE,p,0,10)]},{mzone:[],szone:sets}),p,L).activation(storm,false)<0,'not while it also costs our Set Mirror Force');
 }
 // 5. Revive a blocker on our turn when their next attack takes most of our LP.
 {
  const reborn=inHand('Monster Reborn',0),raider=mon('Vorse Raider',o,0);
  ok(smartContext(duel(p,{mzone:[],hand:[reborn],grave:[gy('Hyper Hammerhead',p,0)]},{mzone:[raider]},{lp:p?[8000,2000]:[2000,8000]}),p,L,{to_bp:true}).activation(reborn,false)>=80,'2000 LP against 1900 ATK: revive a blocker');
 }
 // 6. Removal waits when a monster we can still summon, with its equip, wins that battle.
 {
  const tribute=inHand('Tribute to the Doomed',0),gumo=mon('Jirai Gumo',o,0);
  const hand=[tribute,inHand('Hydrogeddon',1),inHand('Axe of Despair',2),inHand('Fusion Sage',3)];
  const e=duel(p,{mzone:[],hand},{mzone:[gumo]});
  ok(smartContext(e,p,L,{to_bp:true,summons:[hand[1]]}).activation(tribute,false)<0,'Hydrogeddon + Axe beats Jirai Gumo: keep Tribute to the Doomed');
  ok(smartContext(e,p,L,{to_bp:true,summons:[]}).activation(tribute,false)>=0,'without that summon, Tribute to the Doomed answers it');
 }
}
console.log(`PASS ${checks} Dinosaur deck rule cases for both sides`);
