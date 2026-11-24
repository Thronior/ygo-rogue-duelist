// Behaviour flags of 2026-11-24 (review 1, builds 0.2.42-0.2.43). Engine duels always run; the flagged replays are checked
// too when the review folder is present.
// 49546946: the CPU equipped Black Pendant to the player's monster (its target prompt forgot the Defense Position monster
//           could switch to Attack, so both targets scored the same and the first one won).
// e287cd5e: Nin-Ken Dog (1800/1000) went to Defense before a piercing 2300 Luster Dragon (Dragon's Rage): it dies either way.
// ebcd3888: Fissure on a randomized card that "cannot be destroyed by non-targeting Spell/Trap effects".
// fa29c337: Premature Burial revived Archfiend General before Pandemonium: it destroyed itself at once.
// 9cd89f0b: Last Will activated before any monster was sent: its Special Summon waits in the Graveyard (now glows there).
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,I,L} from './web/duel.js';
import {smartContext} from './web/smart_policy.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const allCards=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=allCards.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(value,why)=>{assert(value,why);checks++};
const duel=await new MobileDuel(allCards).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=(body,deck=['Kuriboh','Kuriboh'])=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add(deck[p],p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
// The player ends turn 1 at once; the CPU then plays turn 2 with today's policy. Returns what it did.
function cpuTurn(body,deck){
 duel.start([],[],8000,8000,0,7,[],[],field(body,deck),0);duel.core.startDuel(duel.h);duel.advance();
 const did=[];let equipTo=null;const seen=duel.onMessage.bind(duel);
 duel.onMessage=m=>{if(m.type===M.EQUIP)equipTo=m.target?.controller;if(m.type===M.POS_CHANGE||m.type===M.CHAINING)did.push([m.type,duel.name(m.code),m.position]);if(m.type===M.MOVE&&m.from?.location===L.MZONE&&m.to?.location===L.GRAVE)did.push(['died',duel.name(m.code)]);return seen(m)};
 try{for(let i=0;i<120&&duel.pending&&duel.turn<3;i++){const m=duel.pending;
  if(m.player===0){duel.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:duel.auto());continue}
  duel.respond(duel.auto(m))}}finally{duel.onMessage=seen}
 return {did,equipTo};
}

// 49546946: Black Pendant goes on our Defense Position Dragon Zombie (switched to Attack), never on their monster.
{
 const r=cpuTurn(add('Dragon Zombie',1,'MZONE','FACEUP_DEFENSE',2)+add('Black Pendant',1,'HAND','FACEDOWN')+add('Battle Ox',0,'MZONE','FACEUP_ATTACK',2));
 ok(r.did.some(x=>x[0]===M.CHAINING&&x[1]==='Black Pendant'),'Black Pendant is activated (Dragon Zombie 2100 beats Battle Ox 1700)');
 ok(r.equipTo===1,'49546946: Black Pendant equips our own monster, not the player\'s');
 ok(r.did.some(x=>x[0]===M.POS_CHANGE&&x[1]==='Dragon Zombie'&&(x[2]&1)),'Dragon Zombie switches to Attack to use it');
}
// e287cd5e: no Defense switch when every stronger attacker also beats the DEF and pierces; without piercing it still defends.
{
 const dog=pierce=>cpuTurn(add('Nin-Ken Dog',1,'MZONE','FACEUP_ATTACK',2)+add('Luster Dragon',0,'MZONE','FACEUP_ATTACK',2)+(pierce?add("Dragon's Rage",0,'SZONE','FACEUP',2):'')).did.some(x=>x[0]===M.POS_CHANGE&&x[1]==='Nin-Ken Dog'&&!(x[2]&1));
 ok(!dog(true),'e287cd5e: Nin-Ken Dog stays in Attack Position against a piercing Luster Dragon');
 ok(dog(false),'without piercing, Defense Position still saves the LP');
}
// fa29c337: Pandemonium before Premature Burial on Archfiend General, and General survives.
{
 const r=cpuTurn(add('Archfiend General',1,'GRAVE','FACEUP')+add('Premature Burial',1,'HAND','FACEDOWN')+add('Pandemonium',1,'HAND','FACEDOWN'));
 const order=r.did.filter(x=>x[0]===M.CHAINING).map(x=>x[1]);
 ok(!order.includes('Premature Burial')||order.indexOf('Pandemonium')>=0&&order.indexOf('Pandemonium')<order.indexOf('Premature Burial'),'fa29c337: Pandemonium is activated before Premature Burial');
 ok(!r.did.some(x=>x[0]==='died'&&x[1]==='Archfiend General'),'Archfiend General is not revived to destroy itself');
 const alone=cpuTurn(add('Archfiend General',1,'GRAVE','FACEUP')+add('Premature Burial',1,'HAND','FACEDOWN'));
 ok(!alone.did.some(x=>x[0]===M.CHAINING&&x[1]==='Premature Burial'),'with no Pandemonium at all, Premature Burial stays in hand');
}
// ebcd3888: Fissure waits when the lowest-ATK face-up monster cannot be destroyed by non-targeting Spell/Trap effects.
{
 const code=id('Summoned Skull'),old=duel.cards.get(code);
 const fissure=()=>{const r=cpuTurn(add('Fissure',1,'HAND','FACEDOWN')+add('Summoned Skull',0,'MZONE','FACEUP_ATTACK',2));return r.did.some(x=>x[0]===M.CHAINING&&x[1]==='Fissure')};
 try{
  duel.cards.set(code,{...old,desc:'This card cannot be destroyed by non-targeting Spell/Trap effects.'});
  ok(!fissure(),'ebcd3888: no Fissure on a monster that cannot be destroyed by non-targeting Spell/Trap effects');
  duel.cards.set(code,{...old,desc:'Cannot be destroyed by battle or Spell/Trap effects.'});
  ok(!fissure(),'nor on "battle or Spell/Trap effects"');
 }finally{duel.cards.set(code,old)}
 ok(fissure(),'a plain lowest-ATK monster is still Fissured');
}
// 9cd89f0b: Last Will activated first offers its Special Summon from the Graveyard later that turn; the Graveyard glows.
{
 duel.start([],[],8000,8000,0,7,[],[],field(add('Last Will',0,'HAND','FACEDOWN')+add('Cannon Soldier',0,'MZONE','FACEUP_ATTACK',2)+add('Battle Ox',0,'MZONE','FACEUP_ATTACK',3)),0);
 duel.core.startDuel(duel.h);duel.advance();
 const act=n=>{const m=duel.pending;const i=m.activates.findIndex(c=>duel.name(c.code)===n);assert(i>=0,n);duel.respond({type:1,action:5,index:i})};
 act('Last Will');for(let i=0;i<10&&duel.pending?.type!==M.SELECT_IDLECMD;i++)duel.respond(duel.auto());
 act('Cannon Soldier');for(let i=0;i<10&&duel.pending?.type!==M.SELECT_IDLECMD;i++){const m=duel.pending;duel.respond(m.type===M.SELECT_UNSELECT_CARD||m.type===M.SELECT_CARD||m.type===M.SELECT_TRIBUTE?{type:m.type===M.SELECT_UNSELECT_CARD?7:5,...(m.type===M.SELECT_UNSELECT_CARD?{index:(m.selects||m.select_cards||[]).findIndex(c=>duel.name(c.code)==='Battle Ox')}:{indicies:[0]})}:duel.auto())}
 ok(duel.pending.activates.some(c=>c.location===L.GRAVE&&duel.name(c.code)==='Last Will'),'9cd89f0b: Last Will can Special Summon from the Graveyard after a monster was sent');
 const src=fs.readFileSync(root+'android/web/mobile.js','utf8');
 ok(/function graveActionReady\(player\)[^\n]*c\.location===L\.GRAVE/.test(src)&&src.includes("kind==='grave'&&graveActionReady(player)"),'the Graveyard pile glows when a card in it can act');
}

// The flagged replays, when the review folder is present.
{
 const dir='D:/Codex Exports/Replay exports/2026-11-24-review-1/replays/';
 if(fs.existsSync(dir)){
  const files=fs.readdirSync(dir);
  const at=async(prefix,step,check)=>{const file=files.find(x=>x.startsWith(prefix));if(!file)return;
   const rec=JSON.parse(gunzipSync(fs.readFileSync(dir+file)),(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&('$bigint' in v)?BigInt(v.$bigint):v);
   const e=await new MobileDuel(allCards).init([data,scripts]);
   try{e.start(...rec.start);for(let i=0;i<step;i++)e.respond(rec.responses[i].response??rec.responses[i]);check(e,e.pending,e.auto(e.pending))}finally{e.destroy()}};
  await at('49546946',81,(e,m,r)=>ok((m.selects||m.cards)[r.indicies[0]].controller===1,'49546946 step 81: Black Pendant targets Dragon Zombie, not Ms. Judge'));
  await at('e287cd5e',98,(e,m,r)=>ok(r.action!==I.SELECT_POS_CHANGE,'e287cd5e step 98: Nin-Ken Dog stays in Attack Position'));
  await at('fa29c337',1,(e,m,r)=>ok(r.action===I.SELECT_ACTIVATE&&e.name(m.activates[r.index].code)==='Pandemonium','fa29c337 step 1: Pandemonium first'));
 }
}
duel.destroy();
console.log(`PASS flags Nov 24 (${checks} checks): Black Pendant target, piercing Defense switch, Fissure immunity, Archfiend General revival, Last Will Graveyard glow`);
