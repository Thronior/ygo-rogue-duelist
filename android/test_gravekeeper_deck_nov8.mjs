// Gravekeeper's deck rules (deck trace, 2026-11-08): Necrovalley counts as a boost field, Rite of Spirit timing,
// Ready for Intercepting as a Warrior/Spellcaster Book of Moon, Chief's revival, Assailant's switch, Guard's flip.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,race:data[id(name)]?.race,level:data[id(name)]?.level,owner:controller,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel(meta.cards),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const z={};for(const side of [0,1]){const deck=zones[side].deck||Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
  z[side]={[L.MZONE]:fill(L.MZONE,zones[side].mzone),[L.SZONE]:fill(L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:deck,[L.GRAVE]:zones[side].grave||[],[L.EXTRA]:zones[side].extra||[]}}
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq)=>card(name,L.GRAVE,p,seq,5);
 // 1. Necrovalley is played for our Gravekeeper's monsters, and not without any.
 {
  const valley=inHand('Necrovalley',0);
  ok(smartContext(duel(p,{mzone:[mon("Gravekeeper's Spear Soldier",p,0)],hand:[valley]},{mzone:[]}),p,L,{to_bp:true}).activation(valley,false)>=0,'Necrovalley with a Gravekeeper on the field');
  ok(smartContext(duel(p,{mzone:[mon('Battle Ox',p,0)],hand:[valley]},{mzone:[]}),p,L,{to_bp:true}).activation(valley,false)<0,'not with no Gravekeeper');
 }
 // 2. Rite of Spirit: before battle on our turn, not into their chain, not twice for one target, not in their Draw Phase.
 {
  const rite=card('Rite of Spirit',L.SZONE,p,0,10),grave=[gy("Gravekeeper's Chief",0)];
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave},{mzone:[]}),p,L,{to_bp:true}).activation(rite,true)>=0,'revive before battle');
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave:[]},{mzone:[]}),p,L,{to_bp:true}).activation(rite,true)<0,'not with no Gravekeeper in the GY');
  const torrential={code:id('Torrential Tribute'),player:o,targets:[]};
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave},{mzone:[]},{activeChain:[torrential]}),p,L,{to_bp:true}).activation(rite,true)<0,'not in answer to Torrential Tribute');
  const twin={code:id('Rite of Spirit'),player:p,targets:[]};
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave},{mzone:[]},{activeChain:[twin]}),p,L,{to_bp:true}).activation(rite,true)<0,'no second copy for the only target');
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave},{mzone:[]},{player:o,phase:1}),p,L).activation(rite,true)<0,'not in their Draw Phase');
  ok(smartContext(duel(p,{mzone:[],szone:[rite],grave},{mzone:[]},{player:o,phase:0x200}),p,L).activation(rite,true)>=0,'in their End Phase');
 }
 // 3. Ready for Intercepting stops a Warrior or Spellcaster attacker, never another race.
 {
  const ready=card('Ready for Intercepting',L.SZONE,p,0,10),wall=mon("Gravekeeper's Guard",p,0,4);
  const elf=mon('Gemini Elf',o,0),ox=mon('Battle Ox',o,0);
  ok(smartContext(duel(p,{mzone:[wall],szone:[ready]},{mzone:[elf]},{player:o,phase:8,attackCard:elf,attackTarget:wall}),p,L).activation(ready,true)>=0,'stops Gemini Elf');
  ok(smartContext(duel(p,{mzone:[wall],szone:[ready]},{mzone:[ox]},{player:o,phase:8,attackCard:ox,attackTarget:wall}),p,L).activation(ready,true)<0,'not a Beast-Warrior');
 }
 // 4. Gravekeeper's Chief revives a Gravekeeper's when there is one.
 {
  const chief=mon("Gravekeeper's Chief",p,0);
  ok(smartContext(duel(p,{mzone:[chief],grave:[gy("Gravekeeper's Spear Soldier",0)]},{mzone:[]}),p,L).activation(chief,true)>=0,'Chief revives Spear Soldier');
  ok(smartContext(duel(p,{mzone:[chief],grave:[gy('Battle Ox',0)]},{mzone:[]}),p,L).activation(chief,true)<0,'not with no Gravekeeper in the GY');
 }
 // 5. Gravekeeper's Assailant switches the attack target only when that wins or adds damage.
 {
  const assailant=mon("Gravekeeper's Assailant",p,0,1,{attack:2000}),skull=mon('Summoned Skull',o,0),ox=mon('Battle Ox',o,0);
  let e=duel(p,{mzone:[assailant]},{mzone:[skull]},{phase:8,attackCard:assailant,attackTarget:skull});
  ok(smartContext(e,p,L).activation(assailant,true)>=0,'Summoned Skull to Defense Position (1200 DEF)');
  ok(smartContext(e,p,L).targetScore("Gravekeeper's Assailant",skull,{})>0,'targets the attacked monster');
  e=duel(p,{mzone:[assailant]},{mzone:[ox]},{phase:8,attackCard:assailant,attackTarget:ox});
  ok(smartContext(e,p,L).activation(assailant,true)<0,'not when Battle Ox already loses in Attack Position');
 }
 // 6. Gravekeeper's Guard is flipped only with a monster to bounce.
 {
  const guard=mon("Gravekeeper's Guard",p,0,8);
  ok(smartContext(duel(p,{mzone:[guard]},{mzone:[mon('Battle Ox',o,0)]}),p,L).flipUseful("Gravekeeper's Guard",guard)===true,'Guard flips to bounce Battle Ox');
  ok(smartContext(duel(p,{mzone:[guard]},{mzone:[]}),p,L).flipUseful("Gravekeeper's Guard",guard)===false,'not with nothing to bounce');
 }
}
console.log(`PASS ${checks} Gravekeeper's deck rule cases for both sides`);
