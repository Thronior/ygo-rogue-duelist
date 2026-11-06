// Equip traps and equip spells in an Armed Samurai - Ben Kei deck (deck trace, 2026-11-06): Blast with Chain,
// Metalmorph's attack bonus, piercing value, no extra equips without an attack, and Ben Kei's extra attacks.
import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,m)=>{assert(v,m);checks++};
const card=(name,location,controller,sequence,position=1,extra={})=>({code:id(name),attack:data[id(name)]?.attack??0,defense:data[id(name)]?.defense??0,position,controller,location,sequence,type:data[id(name)]?.type,...extra});
// p is the CPU under test; `mine`/`theirs` hold {mzone,szone,hand} card lists.
function duel(p,mine,theirs,state={}){
 const e=new MobileDuel(meta.cards),zones={[p]:mine,[1-p]:theirs};
 Object.assign(e,{data,lp:[8000,8000],turn:6,player:p,phase:4,events:[],visuals:[],peak:{},pendingSummons:[],activeChain:[],battleProtected:[false,false],aiModifiers:{}},state);
 const fill=(side,loc,list)=>{const out=Array(loc===L.SZONE?6:5).fill(null);for(const c of list||[])out[c.sequence]=c;return out};
 const filler=side=>Array.from({length:20},(_,i)=>card('Battle Ox',L.DECK,side,i,10));
 const z={};for(const side of [0,1])z[side]={[L.MZONE]:fill(side,L.MZONE,zones[side].mzone),[L.SZONE]:fill(side,L.SZONE,zones[side].szone),[L.HAND]:zones[side].hand||[],[L.DECK]:filler(side),[L.GRAVE]:[]};
 e.query=(side,loc)=>z[side]?.[loc]||[];e.core={duelQueryCount:(_,side,loc)=>(z[side]?.[loc]||[]).filter(Boolean).length};
 return e;
}
const at=c=>({controller:c.controller,location:c.location,sequence:c.sequence});
for(const p of [0,1]){
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),set=(name,side,seq)=>card(name,L.SZONE,side,seq,10);
 // 1. Blast with Chain answers the opponent's Spell/Trap destruction by equipping first.
 {
  const blast=set('Blast with Chain',p,0),dragon=mon('Spear Dragon',p,0),ox=mon('Battle Ox',o,0);
  const mst={code:id('Mystical Space Typhoon'),player:o,targets:[at(blast)]};
  let e=duel(p,{mzone:[dragon],szone:[blast]},{mzone:[ox]},{player:o,activeChain:[mst]});
  ok(smartContext(e,p,L).activation(blast,true)>=100,'Blast chains to the MST that targets it');
  e=duel(p,{mzone:[dragon],szone:[blast,set('Mirror Force',p,1)]},{mzone:[ox]},{player:o,activeChain:[{...mst,targets:[{controller:p,location:L.SZONE,sequence:1}]}]});
  ok(smartContext(e,p,L).activation(blast,true)<0,'not when the MST targets another card');
  e=duel(p,{mzone:[],szone:[blast]},{mzone:[ox]},{player:o,activeChain:[mst]});
  ok(smartContext(e,p,L).activation(blast,true)<0,'not without a face-up monster to equip');
  e=duel(p,{mzone:[dragon],szone:[blast]},{mzone:[]},{player:o,activeChain:[{code:id('Heavy Storm'),player:o,targets:[]}]});
  ok(smartContext(e,p,L).activation(blast,true)<0,'Heavy Storm with no monster left to destroy');
  e=duel(p,{mzone:[dragon],szone:[blast]},{mzone:[ox]},{player:o,activeChain:[{code:id('Heavy Storm'),player:o,targets:[]}]});
  ok(smartContext(e,p,L).activation(blast,true)>=100,'Heavy Storm with a monster left to destroy');
  // Its trigger never destroys one of our cards.
  e=duel(p,{mzone:[dragon],szone:[]},{mzone:[ox]},{selectionHint:502,effect:{code:id('Blast with Chain'),player:p}});
  const ctx=smartContext(e,p,L);
  ok(ctx.targetScore('Blast with Chain',ox,{})>ctx.targetScore('Blast with Chain',dragon,{}),'Blast destroys their card, not ours');
 }
 // 2. Blast with Chain and Metalmorph in the Damage Step.
 {
  const blast=set('Blast with Chain',p,0),morph=set('Metalmorph',p,1);
  const zombyra=mon('Zombyra the Dark',p,0,1,{attack:2100}),rex=mon('Two-Headed King Rex',o,0,1,{attack:2400});
  let e=duel(p,{mzone:[zombyra],szone:[blast]},{mzone:[rex]},{phase:32,inDamageStep:true,attackCard:at(zombyra),attackTarget:at(rex)});
  ok(smartContext(e,p,L).activation(blast,true)>=100,'+500 turns a losing attack into a win');
  e=duel(p,{mzone:[zombyra],szone:[blast]},{mzone:[{...rex,attack:2700}]},{phase:32,inDamageStep:true,attackCard:at(zombyra),attackTarget:at(rex)});
  ok(smartContext(e,p,L).activation(blast,true)<0,'+500 is not enough against 2700');
  ok(smartContext(e,p,L).activation(blast,false)<0,'never from an idle prompt');
  // Metalmorph: 300 plus half the target's ATK while attacking.
  const skull=mon('Summoned Skull',p,0,1,{attack:0}),faith=mon('Magician of Faith',o,0,1,{attack:300});
  e=duel(p,{mzone:[skull],szone:[morph]},{mzone:[faith]},{phase:32,inDamageStep:true,attackCard:at(skull),attackTarget:at(faith)});
  ok(smartContext(e,p,L).activation(morph,true)>=100,'Metalmorph wins a 0 ATK attack into 300 ATK');
  const skull25=mon('Summoned Skull',p,0,1,{attack:2500}),bewd=mon('Blue-Eyes White Dragon',o,0,1,{attack:3000});
  e=duel(p,{mzone:[skull25],szone:[morph]},{mzone:[bewd]},{phase:32,inDamageStep:true,attackCard:at(skull25),attackTarget:at(bewd)});
  ok(smartContext(e,p,L).activation(morph,true)>=100,'2500 + 300 + 1500 beats 3000');
  e=duel(p,{mzone:[skull25],szone:[morph]},{mzone:[{...bewd,attack:6000}]},{phase:32,inDamageStep:true,attackCard:at(skull25),attackTarget:at(bewd)});
  ok(smartContext(e,p,L).activation(morph,true)<0,'2500 + 300 + 3000 still loses to 6000');
  e=duel(p,{mzone:[skull25],szone:[morph]},{mzone:[bewd]},{phase:8,attackCard:at(skull25),attackTarget:at(bewd)});
  ok(smartContext(e,p,L).activation(morph,true)<0,'waits for the Damage Step');
  // Defending in Attack Position: +300 ATK must beat the attacker.
  const guard=mon('Vorse Raider',p,0,1,{attack:1900}),orc=mon('Battle Ox',o,0,1,{attack:2000});
  e=duel(p,{mzone:[guard],szone:[morph]},{mzone:[orc]},{player:o,phase:32,inDamageStep:true,attackCard:at(orc),attackTarget:at(guard)});
  ok(smartContext(e,p,L).activation(morph,true)>=100,'1900 + 300 beats a 2000 attacker');
  e=duel(p,{mzone:[{...guard,attack:1600}],szone:[morph]},{mzone:[orc]},{player:o,phase:32,inDamageStep:true,attackCard:at(orc),attackTarget:at(guard)});
  ok(smartContext(e,p,L).activation(morph,true)<0,'1600 + 300 does not');
  // The equip goes on our monster in the battle, never theirs.
  e=duel(p,{mzone:[skull,mon('Jinzo',p,1)],szone:[morph]},{mzone:[faith]},{phase:32,inDamageStep:true,attackCard:at(skull),attackTarget:at(faith),effect:{code:id('Metalmorph'),player:p}});
  const tctx=smartContext(e,p,L);
  ok(tctx.targetScore('Metalmorph',skull,{})>tctx.targetScore('Metalmorph',{...mon('Jinzo',p,1)},{}),'Metalmorph equips the attacker');
  ok(tctx.targetScore('Metalmorph',skull,{})>tctx.targetScore('Metalmorph',faith,{}),'never the attack target');
 }
 // 3. Piercing damage counts: United We Stand on a lone Spear Dragon facing a Defense Position monster.
 {
  const uws=card('United We Stand',L.HAND,p,0,10),dragon=mon('Spear Dragon',p,0),wall=mon('Giant Soldier of Stone',o,0,4);
  let e=duel(p,{mzone:[dragon],hand:[uws]},{mzone:[wall]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(uws,false)>=0,'800 more piercing damage is worth it');
  e=duel(p,{mzone:[mon('Vorse Raider',p,0)],hand:[uws]},{mzone:[wall]});
  ok(smartContext(e,p,L,{to_bp:true}).activation(uws,false)<0,'a lone non-piercing monster still keeps it');
 }
 // 4. No second equip on a monster that cannot attack this turn and already wins.
 {
  const zombyra=mon('Zombyra the Dark',p,0,1,{attack:3100}),axe=card('Axe of Despair',L.SZONE,p,0,1,{equipCard:{controller:p,location:L.MZONE,sequence:0}});
  const axe2=card('Axe of Despair',L.HAND,p,0,10);
  let e=duel(p,{mzone:[zombyra],szone:[axe],hand:[axe2]},{mzone:[]},{turn:1});
  ok(smartContext(e,p,L,{to_bp:false}).activation(axe2,false)<0,'turn 1: no second Axe');
  e=duel(p,{mzone:[{...zombyra,attack:2100}],szone:[],hand:[axe2]},{mzone:[]},{turn:1});
  ok(smartContext(e,p,L,{to_bp:false}).activation(axe2,false)>=0,'the first equip is unchanged');
  e=duel(p,{mzone:[zombyra],szone:[axe],hand:[axe2]},{mzone:[mon('Blue-Eyes White Dragon',o,0,1,{attack:3500})]},{turn:1});
  ok(smartContext(e,p,L,{to_bp:false}).activation(axe2,false)>=0,'still allowed when a stronger monster faces it');
  e=duel(p,{mzone:[zombyra],szone:[axe],hand:[axe2]},{mzone:[mon('Battle Ox',o,0,1,{attack:1700})]},{turn:6});
  ok(smartContext(e,p,L,{to_bp:true}).activation(axe2,false)>=0,'allowed before the Battle Phase');
 }
 // 5. Ben Kei gains an attack per equip: the Axe goes on him over a lone Jinzo.
 {
  const benkei=mon('Armed Samurai - Ben Kei',p,0),jinzo=mon('Jinzo',p,1);
  const e=duel(p,{mzone:[benkei,jinzo],hand:[card('Axe of Despair',L.HAND,p,0,10)]},{mzone:[]},{effect:{code:id('Axe of Despair'),player:p}});
  const ctx=smartContext(e,p,L,{to_bp:true});
  ok(ctx.targetScore('Axe of Despair',benkei,{})>ctx.targetScore('Axe of Despair',jinzo,{}),'Ben Kei takes the Axe');
 }
}
console.log(`PASS ${checks} equip trap and equip spell cases for both sides`);
