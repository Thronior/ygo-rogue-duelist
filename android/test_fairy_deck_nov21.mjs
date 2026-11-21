// Fairy deck rules (deck trace, 2026-11-21): Freed the Brave Wanderer, Solar Ray, D.D. Warrior Lady's banish,
// Dark Hole with our own Lava Golem, Giant Trunade under a lock, and Soul Exchange only on a monster it affects.
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
 const lp=(mine,theirs)=>{const v=[0,0];v[p]=mine;v[o]=theirs;return v};
 // 1. Freed the Brave Wanderer: 2 LIGHT monsters in the GY and a face-up monster with more ATK; GY cost, enemy target.
 {
  const freed=mon('Freed the Brave Wanderer',p,0),two=[gy('Shining Angel',0),gy('Skelengel',1)];
  ok(smartContext(duel(p,{mzone:[freed],grave:two},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(freed,false)>=90,'Freed destroys a 1900 ATK Gemini Elf');
  ok(smartContext(duel(p,{mzone:[freed],grave:two.slice(0,1)},{mzone:[mon('Gemini Elf',o,0)]}),p,L,{to_bp:true}).activation(freed,false)<0,'not with 1 LIGHT monster in the GY');
  ok(smartContext(duel(p,{mzone:[freed],grave:two},{mzone:[mon('Shining Abyss',o,0)]}),p,L,{to_bp:true}).activation(freed,false)<0,'not on a 1600 ATK monster');
  const joan=mon('Guardian Angel Joan',p,1),elf=mon('Gemini Elf',o,0),angel=mon('Shining Angel',p,2);
  const t=smartContext(duel(p,{mzone:[freed,joan,angel],grave:two},{mzone:[elf]},{effect:{code:id('Freed the Brave Wanderer'),player:p}}),p,L,{to_bp:true});
  ok(t.targetScore('Freed the Brave Wanderer',elf,{})>t.targetScore('Freed the Brave Wanderer',joan,{}),'destroys their Gemini Elf, never our Joan');
  ok(t.targetScore('Freed the Brave Wanderer',two[1],{})>t.targetScore('Freed the Brave Wanderer',angel,{}),'banishes from the GY before the field');
 }
 // 2. Solar Ray: lethal, removal on 2+ LIGHT monsters, their End Phase with 2; not on our turn, not for one lost monster.
 {
  const ray=card('Solar Ray',L.SZONE,p,0,10),lights=[mon('Shining Abyss',p,0),mon('Dunames Dark Witch',p,1)];
  ok(smartContext(duel(p,{mzone:lights,szone:[ray]},{mzone:[]},{lp:lp(8000,1200)}),p,L).activation(ray,true)>=120,'Solar Ray for lethal');
  ok(smartContext(duel(p,{mzone:lights,szone:[ray]},{mzone:[]},{player:o,phase:512}),p,L).activation(ray,true)>=0,'their End Phase with 2 LIGHT monsters');
  ok(smartContext(duel(p,{mzone:lights,szone:[ray]},{mzone:[]}),p,L).activation(ray,true)<0,'kept on our own Main Phase');
  ok(smartContext(duel(p,{mzone:lights,szone:[ray]},{mzone:[]},{player:o,activeChain:[{player:o,code:id('Dark Hole'),targets:[]}]}),p,L).activation(ray,true)>=0,'chained to their Dark Hole');
  const one=[mon('Shining Angel',p,0)];
  ok(smartContext(duel(p,{mzone:one,szone:[ray]},{mzone:[]},{player:o,activeChain:[{player:o,code:id('Tribute to the Doomed'),targets:[one[0]]}]}),p,L).activation(ray,true)<0,'not for 600 when one LIGHT monster is lost');
  ok(smartContext(duel(p,{mzone:one,szone:[ray]},{mzone:[]},{player:o,activeChain:[{player:o,code:id('Mystical Space Typhoon'),targets:[ray]}]}),p,L).activation(ray,true)>=0,'fires when the Ray itself is targeted');
 }
 // 3. D.D. Warrior Lady banishes only when she is lost, the other monster survives, or it would trigger.
 {
  const dd=mon('D.D. Warrior Lady',p,0),yn=e=>smartContext(e,p,L).activation({code:dd.code,controller:p,location:L.MZONE,sequence:0},true);
  const battle=(foe,attacker)=>duel(p,{mzone:[dd]},{mzone:[foe]},{phase:8,inDamageStep:true,...(attacker?{player:o,attackCard:foe,attackTarget:dd}:{attackCard:dd,attackTarget:foe})});
  ok(yn(battle(mon('Harpie Lady',o,0,4)))<0,'not on a Harpie Lady the battle destroys anyway');
  ok(yn(battle(mon('Mystic Tomato',o,0,4)))>=0,'banishes Mystic Tomato before it recruits');
  ok(yn(battle(mon('Sangan',o,0,4)))>=0,'banishes Sangan before it searches');
  ok(yn(battle(mon('Gemini Elf',o,0),true))>=0,'when a 1900 ATK attacker destroys her');
  ok(yn(battle(mon('Hurricail',o,0),true))<0,'not when she beats a 900 ATK attacker');
 }
 // 4. Dark Hole counts our own Lava Golem as a gain to lose.
 {
  const hole=inHand('Dark Hole',0),theirs={mzone:[mon('Stealth Bird',o,0,8),mon('Stealth Bird',o,1,8)]};
  ok(smartContext(duel(p,{mzone:[mon('Lava Golem',p,0)],hand:[hole]},theirs,{lp:lp(1800,8000)}),p,L,{to_bp:true}).activation(hole,false)>=0,'Dark Hole clears our Lava Golem at 1800 LP');
  ok(smartContext(duel(p,{mzone:[mon('Gemini Elf',p,0)],hand:[hole]},theirs,{lp:lp(1800,8000)}),p,L,{to_bp:true}).activation(hole,false)<0,'not with a Gemini Elf of ours instead');
 }
 // 5. Giant Trunade returns their lock and frees our attackers.
 {
  const trunade=inHand('Giant Trunade',0),swords=card('Swords of Revealing Light',L.SZONE,o,0,1);
  ok(smartContext(duel(p,{mzone:[mon('Guardian Angel Joan',p,0)],hand:[trunade]},{mzone:[mon('Gemini Elf',o,0)],szone:[swords]}),p,L,{to_bp:true}).activation(trunade,false)>=0,'Trunade under Swords of Revealing Light');
  ok(smartContext(duel(p,{mzone:[mon('Guardian Angel Joan',p,0,4)],hand:[trunade]},{mzone:[mon('Gemini Elf',o,0)],szone:[swords]}),p,L,{to_bp:true}).activation(trunade,false)<0,'not with no Attack Position monster to free');
 }
 // 6. Soul Exchange: never on a monster unaffected by Spells.
 {
  const exchange=inHand('Soul Exchange',0),joan=inHand('Guardian Angel Joan',1),abyss=mon('Shining Abyss',p,0),lv8=mon('Silent Magician LV8',o,0),lv4=mon('Mystic Swordsman LV4',o,1);
  const t=smartContext(duel(p,{mzone:[abyss],hand:[exchange,joan]},{mzone:[lv8,lv4]},{effect:{code:id('Soul Exchange'),player:p}}),p,L);
  ok(t.targetScore('Soul Exchange',lv4,{})>t.targetScore('Soul Exchange',lv8,{}),'Mystic Swordsman LV4 over Silent Magician LV8');
  const prompt={to_bp:true,activates:[exchange],summons:[],monster_sets:[joan]};
  const line=enemy=>smartContext(duel(p,{mzone:[abyss],hand:[exchange,joan]},{mzone:enemy}),p,L,prompt).comboChoice(()=>true);
  ok(line([lv8])?.id!=='soul-exchange','no Soul Exchange line against Silent Magician LV8 alone');
  ok(line([mon('Gemini Elf',o,0)])?.id==='soul-exchange','Soul Exchange line against a Gemini Elf');
 }
}
console.log(`PASS ${checks} Fairy deck rule cases for both sides`);
