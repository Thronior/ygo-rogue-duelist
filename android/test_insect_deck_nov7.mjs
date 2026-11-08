// Insect deck rules (deck trace, 2026-11-07): Ultimate Insect LV3/LV5 level-ups, floating LV3 only when it can live to
// our Standby Phase, growing Ultimate Insects kept as Tributes and out of Insect Imitation, Tokens that cannot pay a
// Tribute Summon, and the capped Jirai Gumo revival penalty.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel([...meta.cards,...meta.tokenCards]),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq,side=p)=>card(name,L.GRAVE,side,seq,5),dk=(name,seq)=>card(name,L.DECK,p,seq,10);
 // 1. Ultimate Insect LV3/LV5 always level up, in a chain too.
 {
  const lv3=mon('Ultimate Insect LV3',p,0),lv5=mon('Ultimate Insect LV5',p,0);
  ok(smartContext(duel(p,{mzone:[lv3],deck:[dk('Ultimate Insect LV5',0)]},{mzone:[]},{phase:2}),p,L).activation(lv3,true)>=80,'LV3 levels up');
  ok(smartContext(duel(p,{mzone:[lv5],deck:[dk('Ultimate Insect LV7',0)]},{mzone:[]},{phase:2}),p,L).activation(lv5,true)>=80,'LV5 levels up');
 }
 // 2. Howling Insect floats LV3 when it can live to our Standby Phase, else another floater.
 {
  const lv3=dk('Ultimate Insect LV3',0),kama=dk('Flying Kamakiri #1',1),deck=[lv3,kama,dk('Ultimate Insect LV5',2)],state={effect:{code:id('Howling Insect'),player:p}};
  let t=smartContext(duel(p,{mzone:[],deck},{mzone:[mon('Man-Eater Bug',o,0,10)]},state),p,L);
  ok(t.targetScore('Howling Insect',lv3,{})>t.targetScore('Howling Insect',kama,{}),'LV3 when nothing can attack it');
  t=smartContext(duel(p,{mzone:[],deck},{mzone:[mon('Gemini Elf',o,0)]},state),p,L);
  ok(t.targetScore('Howling Insect',kama,{})>t.targetScore('Howling Insect',lv3,{}),'Flying Kamakiri #1 when Gemini Elf will attack it');
  t=smartContext(duel(p,{mzone:[],deck},{mzone:[mon('Gemini Elf',o,0,1,{attack_count:1})]},{...state,player:o,phase:8}),p,L);
  ok(t.targetScore('Howling Insect',lv3,{})>t.targetScore('Howling Insect',kama,{}),'LV3 when their only attacker has already attacked');
  t=smartContext(duel(p,{mzone:[],deck:[lv3,kama]},{mzone:[mon('Man-Eater Bug',o,0,10)]},state),p,L);
  ok(!(t.targetScore('Howling Insect',lv3,{})>t.targetScore('Howling Insect',kama,{})),'no bonus with no LV5 left');
 }
 // 3. A LV3 that can still level up is not cheap Tribute fodder, nor Insect Imitation's Tribute.
 {
  const lv3=mon('Ultimate Insect LV3',p,0),kama=mon('Flying Kamakiri #1',p,1);
  let x=smartContext(duel(p,{mzone:[lv3,kama],deck:[dk('Ultimate Insect LV5',0)]},{mzone:[]}),p,L);
  ok(x.expendable(lv3)>x.expendable(kama),'Flying Kamakiri #1 is Tributed first');
  x=smartContext(duel(p,{mzone:[lv3,kama],deck:[dk('Battle Ox',0)]},{mzone:[]}),p,L);
  ok(x.expendable(lv3)<=x.expendable(kama),'with no LV5 left it is ordinary fodder');
  const imitation=inHand('Insect Imitation',0);
  ok(smartContext(duel(p,{mzone:[lv3],hand:[imitation],deck:[dk('Ultimate Insect LV5',0),dk('Jirai Gumo',1)]},{mzone:[]}),p,L).activation(imitation,false)<0,'not a growing LV3 for a Jirai Gumo');
  ok(smartContext(duel(p,{mzone:[mon('Man-Eater Bug',p,0)],hand:[imitation],deck:[dk('Ultimate Insect LV3',0),dk('Ultimate Insect LV5',1)]},{mzone:[]}),p,L).activation(imitation,false)>=80,'Man-Eater Bug for Ultimate Insect LV3');
 }
 // 4. Army Ant Tokens cannot pay a Tribute Summon: never Tribute a 2800 Insect Queen for a 2300 LV5 beside them.
 {
  const queen=mon('Insect Queen',p,0,1,{attack:2800}),ant=seq=>({code:22493812,attack:500,defense:1200,owner:p,controller:p,location:L.MZONE,sequence:seq,position:4,type:0x4011});
  const lv5=inHand('Ultimate Insect LV5',0),prompt={summons:[lv5],monster_sets:[lv5],to_bp:true};
  ok(smartContext(duel(p,{mzone:[queen,ant(1),ant(2)],hand:[lv5]},{mzone:[mon('Morphing Jar',o,0)]}),p,L,prompt).tributeWorth(lv5)===false,'not the Queen beside two Army Ant Tokens');
  ok(smartContext(duel(p,{mzone:[queen,mon('Man-Eater Bug',p,1,4)],hand:[lv5]},{mzone:[mon('Morphing Jar',o,0)]}),p,L,prompt).tributeWorth(lv5)!==false,'a Man-Eater Bug can pay for it');
 }
 // 5. Jirai Gumo's revival penalty is capped: still over a 1000 Sangan, still under an equal 2200 monster.
 {
  const t=smartContext(duel(p,{mzone:[],grave:[gy('Jirai Gumo',0)]},{mzone:[]},{effect:{code:id('Monster Reborn'),player:p}}),p,L);
  const v=t.targetScore('Monster Reborn',gy('Jirai Gumo',0),{});
  ok(v>1000&&v<2200,'between a Sangan and an equal 2200 monster');
 }
 // 6. "Unaffected by your opponent's Spell effects" still yields to their monster effects.
 {
  const bug=mon('Man-Eater Bug',p,0),sword=mon('Silent Swordsman LV5',o,0);
  let t=smartContext(duel(p,{mzone:[bug]},{mzone:[sword]},{effect:{code:id('Man-Eater Bug'),player:p},selectionHint:502}),p,L);
  ok(t.targetScore('Man-Eater Bug',sword,{cands:[bug,sword]})>t.targetScore('Man-Eater Bug',bug,{cands:[bug,sword]}),'Man-Eater Bug destroys Silent Swordsman LV5, not itself');
  t=smartContext(duel(p,{mzone:[bug],hand:[inHand('Smashing Ground',0)]},{mzone:[sword]}),p,L,{to_bp:true});
  ok(t.activation(inHand('Smashing Ground',0),false)<0,'Smashing Ground still cannot touch it');
 }
}
console.log(`PASS ${checks} Insect deck rule cases for both sides`);
