// Dark Magician deck rules (deck trace, 2026-11-06): Legion the Fiend Jester (search, Tribute fodder, summon-then-Tribute
// line), Dark Magician of Chaos (Spell recovery), Mystic Tomato's pick, Magical Dimension's trade, Dedication's timing,
// Dark Magician revival, The Shallow Grave margin, Attack Position revivals and Jirai Gumo's coin-toss attacks.
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
 const o=1-p,mon=(name,side,seq,pos=1,extra)=>card(name,L.MZONE,side,seq,pos,extra),inHand=(name,seq)=>card(name,L.HAND,p,seq,10),gy=(name,seq,side=p)=>card(name,L.GRAVE,side,seq,5),dk=(name,seq)=>card(name,L.DECK,p,seq,10);
 const lp=(mine,theirs)=>{const v=[0,0];v[p]=mine;v[o]=theirs;return v};
 // 1. Legion the Fiend Jester: its search trigger is taken (it was passed when another card triggered with it),
 //    from the Deck, and a face-up Legion is the cheapest Tribute.
 {
  const legion=gy('Legion the Fiend Jester',0),deckDM=dk('Dark Magician',0),graveDM=gy('Dark Magician',1);
  ok(smartContext(duel(p,{mzone:[],grave:[legion],deck:[deckDM]},{mzone:[]}),p,L).activation(legion,true)>=80,'Legion searches with a Dark Magician left');
  ok(smartContext(duel(p,{mzone:[],grave:[legion],deck:[dk('Battle Ox',0)]},{mzone:[]}),p,L).activation(legion,true)<0,'not with no Spellcaster Normal Monster left');
  const t=smartContext(duel(p,{mzone:[],grave:[legion,graveDM],deck:[deckDM]},{mzone:[]},{effect:{code:id('Legion the Fiend Jester'),player:p}}),p,L);
  ok(t.targetScore('Legion the Fiend Jester',deckDM,{})>t.targetScore('Legion the Fiend Jester',graveDM,{}),'takes the Deck copy, not the GY one');
  const field=mon('Legion the Fiend Jester',p,0),tomato=mon('Mystic Tomato',p,1);
  const x=smartContext(duel(p,{mzone:[field,tomato],deck:[deckDM]},{mzone:[]}),p,L);
  ok(x.expendable(field)<x.expendable(tomato),'Legion is Tributed before Mystic Tomato');
 }
 // 2. Summon Legion face-up, then Tribute it for a Spellcaster: the line is chosen over a plain summon.
 {
  const legion=inHand('Legion the Fiend Jester',0),dmg=inHand('Dark Magician Girl',1),skilled=inHand('Skilled Dark Magician',2);
  let x=smartContext(duel(p,{mzone:[],hand:[legion,dmg,skilled],deck:[dk('Dark Magician',0)]},{mzone:[]}),p,L,{summons:[legion,skilled],monster_sets:[legion,dmg,skilled],to_bp:true});
  ok(x.comboChoice(()=>true)?.id==='legion','Legion then Dark Magician Girl beats a plain Skilled Dark Magician');
  const skull=inHand('Summoned Skull',1);
  x=smartContext(duel(p,{mzone:[],hand:[legion,skull],deck:[dk('Dark Magician',0)]},{mzone:[]}),p,L,{summons:[legion],monster_sets:[legion,skull],to_bp:true});
  ok(x.comboChoice(()=>true)?.id!=='legion','no Legion line for a non-Spellcaster');
 }
 // 3. Dark Magician of Chaos takes its Spell back (in a chain too) and picks the one this board needs.
 {
  const chaos=mon('Dark Magician of Chaos',p,0),reborn=gy('Monster Reborn',0),mst=gy('Mystical Space Typhoon',1),hole=gy('Dark Hole',2),dm=gy('Dark Magician',3);
  const e=duel(p,{mzone:[chaos],grave:[reborn,mst,hole,dm]},{mzone:[mon('Battle Ox',o,0)]},{effect:{code:id('Dark Magician of Chaos'),player:p}});
  const t=smartContext(e,p,L);
  ok(t.activation(chaos,true)>=80,'recovers a Spell');
  ok(t.targetScore('Dark Magician of Chaos',reborn,{})>t.targetScore('Dark Magician of Chaos',mst,{}),'Monster Reborn over an idle Mystical Space Typhoon');
  ok(t.targetScore('Dark Magician of Chaos',reborn,{})>t.targetScore('Dark Magician of Chaos',hole,{}),'never Dark Hole, which would banish the Chaos');
  ok(smartContext(duel(p,{mzone:[chaos],grave:[dm]},{mzone:[]}),p,L).activation(chaos,true)<0,'no Spell in the GY: nothing to take');
 }
 // 4. Mystic Tomato floats Legion (which searches when it dies) rather than another Tomato, and never a face-up Cyber Jar.
 {
  const legion=dk('Legion the Fiend Jester',0),tomato=dk('Mystic Tomato',1),jar=dk('Cyber Jar',2);
  const t=smartContext(duel(p,{mzone:[],deck:[legion,tomato,jar,dk('Dark Magician',3)]},{mzone:[]},{effect:{code:id('Mystic Tomato'),player:p}}),p,L);
  ok(t.targetScore('Mystic Tomato',legion,{})>t.targetScore('Mystic Tomato',tomato,{}),'Legion over Mystic Tomato');
  ok(t.targetScore('Mystic Tomato',tomato,{})>t.targetScore('Mystic Tomato',jar,{}),'Cyber Jar last');
 }
 // 5. Magical Dimension's trade must not lose (user, 2026-11-06): breaking even with a removal is enough; with nothing
 //    to destroy, the summon must be an upgrade.
 {
  const dimension=inHand('Magical Dimension',0);
  ok(smartContext(duel(p,{mzone:[mon('Dark Magician of Chaos',p,0)],hand:[dimension,inHand('Dark Magician Girl',1)]},{mzone:[]}),p,L).activation(dimension,false)<0,'not Dark Magician of Chaos for Dark Magician Girl with nothing to destroy');
  ok(smartContext(duel(p,{mzone:[mon('Dark Magician of Chaos',p,0)],hand:[dimension,inHand('Dark Magician Girl',1)]},{mzone:[mon('Giant Germ',o,0)]}),p,L).activation(dimension,false)>=80,'2000 + a 1000 removal does not lose against a 2800 Tribute');
  ok(smartContext(duel(p,{mzone:[mon('Dark Magician Girl',p,0)],hand:[dimension,inHand('Dark Magician Girl',1)]},{mzone:[]}),p,L).activation(dimension,false)<0,'not Dark Magician Girl for Dark Magician Girl with nothing to destroy');
  ok(smartContext(duel(p,{mzone:[mon('Legion the Fiend Jester',p,0)],hand:[dimension,inHand('Dark Magician',1)]},{mzone:[mon('Gemini Elf',o,0)]}),p,L).activation(dimension,false)>=80,'Legion for Dark Magician and a Gemini Elf');
 }
 // 6. Dedication through Light and Darkness: in our Main Phase, or to save a Dark Magician; not idly at the start of their turn.
 {
  const dm=mon('Dark Magician',p,0),dedication=card('Dedication through Light and Darkness',L.SZONE,p,0,10),deck=[dk('Dark Magician of Chaos',0)];
  ok(smartContext(duel(p,{mzone:[dm],szone:[dedication],deck},{mzone:[]},{player:o,phase:1}),p,L).activation(dedication,true)<0,'not at the start of their turn');
  ok(smartContext(duel(p,{mzone:[dm],szone:[dedication],deck},{mzone:[]},{player:o,phase:4,activeChain:[{player:o,code:id('Snatch Steal'),targets:[dm]}]}),p,L).activation(dedication,true)>=80,'in answer to Snatch Steal on the Dark Magician');
  ok(smartContext(duel(p,{mzone:[dm],szone:[dedication],deck},{mzone:[]}),p,L,{to_bp:true}).activation(dedication,false)>=80,'in our Main Phase');
 }
 // 7. Revival takes Dark Magician over an equal Summoned Skull when Dark Magic Attack is in hand and they have set cards.
 {
  const dm=gy('Dark Magician',0),skull=gy('Summoned Skull',1),set=card('Mirror Force',L.SZONE,o,0,10),state={effect:{code:id('Monster Reborn'),player:p}};
  let t=smartContext(duel(p,{mzone:[],hand:[inHand('Dark Magic Attack',0)],grave:[dm,skull]},{mzone:[],szone:[set]},state),p,L);
  ok(t.targetScore('Monster Reborn',dm,{})>2500,'Dark Magician beats a 2500 Summoned Skull');
  t=smartContext(duel(p,{mzone:[],hand:[inHand('Battle Ox',0)],grave:[dm,skull]},{mzone:[],szone:[set]},state),p,L);
  ok(!(t.targetScore('Monster Reborn',dm,{})>2500),'no bonus without Dark Magic Attack');
 }
 // 8. The Shallow Grave needs a clearly better monster than theirs: both come back face-down.
 {
  const grave=inHand('The Shallow Grave',0);
  ok(smartContext(duel(p,{mzone:[],hand:[grave],grave:[gy('Slate Warrior',0)]},{mzone:[mon('Battle Ox',o,0)],grave:[gy('Gagagigo',0,o)]}),p,L).activation(grave,false)<0,'not Slate Warrior against their Gagagigo');
  ok(smartContext(duel(p,{mzone:[],hand:[grave],grave:[gy('Dark Magician',0)]},{mzone:[mon('Battle Ox',o,0)],grave:[gy('Gagagigo',0,o)]}),p,L).activation(grave,false)>=80,'Dark Magician against their Gagagigo');
 }
 // 9. Premature Burial revives in Attack Position after paying 800: no blocker that leaves us dead to the overflow.
 {
  const scout=mon('Summoned Skull',o,0),state={lp:lp(1300,8000)};
  const premature=inHand('Premature Burial',0),reborn=inHand('Monster Reborn',0);
  ok(smartContext(duel(p,{mzone:[],hand:[premature],grave:[gy('Mystic Tomato',0)]},{mzone:[scout]},state),p,L).activation(premature,false)<0,'Premature Burial: a Tomato in Attack Position still lets 1100 through at 500 LP');
  ok(smartContext(duel(p,{mzone:[],hand:[reborn],grave:[gy('Mystic Tomato',0)]},{mzone:[scout]},state),p,L).activation(reborn,false)>=80,'Monster Reborn can bring it back in Defense Position');
 }
 // 10. Jirai Gumo attacks only for game or when the gain beats the expected loss of half our LP.
 {
  const gumo=mon('Jirai Gumo',p,0);
  ok(smartContext(duel(p,{mzone:[gumo]},{mzone:[]}),p,L).attackScore(gumo,null,{dmg:2200})<=-99999,'no 2200 direct attack risking 4000 LP');
  ok(smartContext(duel(p,{mzone:[gumo]},{mzone:[]},{lp:lp(8000,2000)}),p,L).attackScore(gumo,null,{dmg:2200})>-99999,'attacks for game');
  ok(smartContext(duel(p,{mzone:[gumo]},{mzone:[]},{lp:lp(1000,8000)}),p,L).attackScore(gumo,null,{dmg:2200})>-99999,'attacks when half our LP is little');
 }
}
console.log(`PASS ${checks} Dark Magician deck rule cases for both sides`);
