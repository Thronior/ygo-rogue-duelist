// Zombie deck rules (deck trace, 2026-11-06): Robbin' Zombie, Vampire Genesis, Reaper on the Nightmare (fusion,
// Attack Position, never Tribute fodder) and Overpowering Eye never targeting a monster that dies when targeted.
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
 // 1. Robbin' Zombie goes face-up while we have an attacker, before our attacks.
 {
  const robbin=card("Robbin' Zombie",L.SZONE,p,0,10),ryu=mon('Ryu Kokki',p,0);
  ok(smartContext(duel(p,{mzone:[ryu],szone:[robbin]},{mzone:[]}),p,L,{to_bp:true}).activation(robbin,false)>=0,"Robbin' Zombie before our attacks");
  ok(smartContext(duel(p,{mzone:[],szone:[robbin]},{mzone:[]}),p,L,{to_bp:true}).activation(robbin,false)<0,'not without a monster to deal damage');
 }
 // 2. Vampire Genesis discards a stranded high-Level Zombie to revive a good lower-Level one.
 {
  const genesis=mon('Vampire Genesis',p,0);
  let e=duel(p,{mzone:[genesis],hand:[inHand('Despair from the Dark',0)],grave:[gy('Vampire Lord',0)]},{mzone:[]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(genesis,false)>=80,'Despair from the Dark pays for Vampire Lord');
  e=duel(p,{mzone:[genesis],hand:[inHand('Patrician of Darkness',0)],grave:[gy('Goblin Zombie',0)]},{mzone:[]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(genesis,false)<0,'not for a 1100 ATK Goblin Zombie');
  e=duel(p,{mzone:[genesis],hand:[inHand('Despair from the Dark',0)],grave:[gy('Vampire Lord',0),gy('Pyramid Turtle',1)]},{mzone:[]},{effect:{code:id('Vampire Genesis'),player:p}});
  const t=smartContext(e,p,L);ok(t.targetScore('Vampire Genesis',gy('Vampire Lord',0),{})>t.targetScore('Vampire Genesis',gy('Pyramid Turtle',1),{}),'revives Vampire Lord over Pyramid Turtle');
 }
 // 3. Reaper on the Nightmare: fused when they have monsters, attacks, never a Tribute.
 {
  const poly=inHand('Polymerization',0),reaper=inHand('Spirit Reaper',1),horse=inHand('Nightmare Horse',2),extra=[card('Reaper on the Nightmare',L.EXTRA,p,0,10)];
  ok(smartContext(duel(p,{mzone:[],hand:[poly,reaper,horse],extra},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(poly,false)>=80,'fuse into Reaper on the Nightmare');
  const nightmare=mon('Reaper on the Nightmare',p,0,4);
  const ctx=smartContext(duel(p,{mzone:[nightmare],hand:[inHand('Vampire Lord',0)]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true});
  ok(ctx.flipUseful('Reaper on the Nightmare',nightmare)===true,'switch it to Attack to attack directly');
  ok(ctx.tributeWorth(inHand('Vampire Lord',0),false)===false,'never Tributed for Vampire Lord');
  ok(ctx.expendable(nightmare)>ctx.expendable(mon('Goblin Zombie',p,1)),'Goblin Zombie is Tributed before it');
 }
 // 5. Pyramid Turtle calls Vampire Lord when Vampire Genesis is in hand, otherwise Ryu Kokki (user, 2026-11-06).
 {
  const lord=card('Vampire Lord',L.DECK,p,0,10),ryu=card('Ryu Kokki',L.DECK,p,1,10),state={effect:{code:id('Pyramid Turtle'),player:p}};
  let t=smartContext(duel(p,{mzone:[],hand:[inHand('Vampire Genesis',0)],deck:[lord,ryu]},{mzone:[]},state),p,L);
  ok(t.targetScore('Pyramid Turtle',lord,{})>t.targetScore('Pyramid Turtle',ryu,{}),'Vampire Genesis in hand: Vampire Lord');
  t=smartContext(duel(p,{mzone:[],hand:[inHand('Goblin Zombie',0)],deck:[lord,ryu]},{mzone:[]},state),p,L);
  ok(t.targetScore('Pyramid Turtle',ryu,{})>t.targetScore('Pyramid Turtle',lord,{}),'no Vampire Genesis: Ryu Kokki');
 }
 // 4. Overpowering Eye never targets a monster that is destroyed when targeted.
 {
  const eye=inHand('Overpowering Eye',0),nightmare=mon('Reaper on the Nightmare',p,0),goblin=mon('Goblin Zombie',p,1);
  ok(smartContext(duel(p,{mzone:[nightmare],hand:[eye]},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true,attacks:[nightmare]}).activation(eye,false)<0,'not when only Reaper on the Nightmare could use it');
  const e=duel(p,{mzone:[nightmare,goblin],hand:[eye]},{mzone:[mon('Gemini Elf',o,0)]},{effect:{code:id('Overpowering Eye'),player:p}});
  const t=smartContext(e,p,L,{to_bp:true});
  ok(t.targetScore('Overpowering Eye',goblin,{})>t.targetScore('Overpowering Eye',nightmare,{}),'targets Goblin Zombie, not the Reaper');
 }
}
console.log(`PASS ${checks} Zombie deck rule cases for both sides`);
