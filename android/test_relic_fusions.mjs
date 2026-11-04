// Fused relics in the real core: each one's duel rule does what its text says (2026-11-03).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const KEYS=['chaos_orb','four_elements','harpie_nest','zaloog_hideout','amazoness_village','necrovalley_throne','fusion_gate','jar_of_greed','second_coin_toss','scapegoat_pasture','sacred_phoenix','invincible'];
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps({k:passives.script({'curses':[],'artifacts':[k] if k else [],'challenge_level':0,'character':0}) for k in ${JSON.stringify(['',...KEYS])}}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<26}));
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const mine=(p=0)=>e.query(p,L.MZONE).filter(Boolean),named=(n,p=0)=>mine(p).find(c=>c.code===id(n));
// Player 0 Normal Summons a listed card each turn and skips battle; `step` can answer any prompt first.
function duel(key,main,enemy,{extra=[],turns=1,summon=null,step=()=>null,lp=8000}={}){
 e.start(main,enemy,lp,8000,5,5,extra,[],scripts[key]);let summoned=-1;
 for(let i=0;i<2000&&e.pending&&!e.finished&&e.turn<=turns;i++){
  const m=e.pending,custom=m.player===0?step(m):null;
  if(custom){e.respond(custom);continue}
  if(m.type===M.SELECT_IDLECMD&&m.player===0){
   const s=summoned===e.turn?-1:m.summons.findIndex(c=>!summon||summon.includes(c.code));
   if(s>=0){summoned=e.turn;e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:s});continue}
   e.respond({type:R.SELECT_IDLECMD,action:I.TO_EP,index:null});continue;
  }
  e.respond(e.auto());
 }
 assert.deepEqual(e.errors,[],key+': no script errors');
}
const fill=(...names)=>Array.from({length:40},(_,i)=>id(names[i%names.length])),WALL=Array(40).fill(id('Mountain'));

duel('chaos_orb',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attack,1200,'Chaos Orb: a LIGHT monster gains 400 ATK');
assert.equal(named('Mystical Elf')?.defense,2000,'Chaos Orb: no DEF bonus');

duel('four_elements',fill('Mystical Elf','Celtic Guardian'),WALL,{turns:3});
assert.equal(mine().length,2,'Four Elements: both monsters are out');
for(const c of mine())assert.equal(c.attack,meta.cards.find(x=>x.id===c.code).atk+400,'Four Elements: two Attributes give 400 ATK');

for(const key of ['','harpie_nest']){
 duel(key,fill('Harpie Lady'),fill('Gemini Elf'),{turns:2});
 const harpie=named('Harpie Lady');
 if(key){assert.equal(harpie?.attack,1700,'Harpie Nest: +400 ATK');assert.ok(harpie,'Harpie Nest: the Harpie survives its first battle');assert.equal(e.lp[0],7800,'Harpie Nest: the battle damage still applies')}
 else assert.ok(!harpie||e.lp[0]===8000,'without the relic a 1300 Harpie loses to Gemini Elf when attacked');
}

duel('amazoness_village',fill('Amazoness Swords Woman'),WALL);
assert.equal(named('Amazoness Swords Woman')?.attack,1900,'Amazoness Village: +400 ATK');

// Necrovalley Throne: the player's own Heavy Storm cannot destroy their Field Spell.
{let played=new Set();
 duel('necrovalley_throne',fill('Necrovalley','Heavy Storm',"Gravekeeper's Spy"),WALL,{summon:[id("Gravekeeper's Spy")],step:m=>{
  if(m.type!==M.SELECT_IDLECMD)return null;
  for(const n of ['Necrovalley','Heavy Storm']){const k=m.activates.findIndex(c=>c.code===id(n));if(k>=0&&!played.has(n)&&(n==='Necrovalley'||played.has('Necrovalley'))){played.add(n);return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}}
  return null}});
 assert.ok(played.has('Heavy Storm'),'Necrovalley Throne: Heavy Storm was played');
 assert.ok(e.query(0,L.SZONE).some(c=>c?.code===id('Necrovalley')),'Necrovalley Throne: the Field Spell survives Heavy Storm');
 assert.equal(named("Gravekeeper's Spy")?.attack,1200+400+500,"Necrovalley Throne: Gravekeeper's +400 ATK (and Necrovalley's 500)");}

duel('fusion_gate',fill('Pot of Greed'),WALL,{extra:[id('King Dragun')],summon:[]});
assert.ok(named('King Dragun'),'Fusion Gate: an empty field Special Summons from the Fusion Deck');

for(const key of ['','jar_of_greed']){duel(key,fill('Pot of Greed'),WALL,{summon:[],step:m=>m.type===M.SELECT_IDLECMD&&e.turn===1?(globalThis.hand=e.query(0,L.HAND).length,null):null});globalThis[key||'base']=globalThis.hand}
assert.equal(globalThis.jar_of_greed,globalThis.base+1,'Jar of Greed: 1 extra card on the first turn');

// Second Coin Toss: Graceful Dice is chosen as a 6 (+600 ATK); a second die in the same turn is a normal roll.
{let chose=0,boosted=0;
 duel('second_coin_toss',fill('Mystical Elf','Graceful Dice'),WALL,{summon:[id('Mystical Elf')],step:m=>{
  if(m.type===M.ANNOUNCE_NUMBER){chose++;return {type:R.ANNOUNCE_NUMBER,value:m.options.findIndex(v=>Number(v)===6)}}
  if(m.type===M.SELECT_IDLECMD&&chose)boosted=Math.max(boosted,named('Mystical Elf')?.attack||0);
  if(m.type===M.SELECT_IDLECMD&&mine().length&&!chose){const k=m.activates.findIndex(c=>c.code===id('Graceful Dice'));if(k>=0)return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}
  return null}});
 assert.equal(chose,1,'Second Coin Toss: the first die roll asks for its result');
 assert.equal(boosted,800+600,'Second Coin Toss: the chosen 6 is the result');}

// Scapegoat Pasture: a Sheep Token arrives in the opponent's Standby Phase, then copies Celtic Guardian on your turn.
{let copied=[],sheep=0;
 duel('scapegoat_pasture',fill('Celtic Guardian'),WALL,{turns:3,step:m=>{
  if(m.type===M.SELECT_IDLECMD){sheep=Math.max(sheep,mine().filter(c=>c.code===73915052).length);if(e.turn===3)copied=mine().filter(c=>c.code===73915052)}
  if(m.type===M.SELECT_CARD&&m.cards?.some(c=>c.code===id('Celtic Guardian')))return {type:R.SELECT_CARD,indicies:[m.cards.findIndex(c=>c.code===id('Celtic Guardian'))]};
  return null}});
 assert.ok(sheep>=1,'Scapegoat Pasture: a Sheep Token was summoned');
 assert.ok(copied.length>=1&&copied.every(c=>c.attack===1400&&c.defense===1200&&c.level===4&&c.attribute===1&&Number(c.race)===1),'Scapegoat Pasture: the token copied Celtic Guardian (Type, Level, Attribute, 1400/1200)');}

// Don Zaloog's Hideout: Don Zaloog attacks directly past a Defense Position wall.
{let attacked=false,walls=0;
 duel('zaloog_hideout',fill('Don Zaloog'),fill('Giant Soldier of Stone'),{turns:3,step:m=>{
  if(m.type===M.SELECT_IDLECMD&&e.turn===3&&m.to_bp&&!attacked)return {type:R.SELECT_IDLECMD,action:I.TO_BP,index:null};
  if(m.type===M.SELECT_BATTLECMD&&!attacked&&m.attacks.length){attacked=true;walls=mine(1).length;return {type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index:0}}
  return null}});
 assert.ok(attacked,"Don Zaloog's Hideout: Don Zaloog attacked");
 assert.ok(walls>0,"Don Zaloog's Hideout: the opponent had a monster to attack past");
 assert.equal(e.lp[1],8000-1400,"Don Zaloog's Hideout: the attack was direct");}

// Invincible, given to the CPU's side (the Tag script translation): your Raigeki cannot destroy its monster.
const sideOne=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps(passives.multiplayer_script({'curses':[],'artifacts':['invincible'],'challenge_level':0,'character':0},1)))`],{cwd:root,encoding:'utf8'}));
for(const key of ['','invincible']){
 scripts.rival=scripts['']+(key?'\n'+sideOne:'');let cast=false;
 duel('rival',fill('Raigeki'),fill('Mystical Elf'),{turns:3,summon:[],step:m=>{
  if(m.type===M.SELECT_IDLECMD&&e.turn===3&&!cast&&mine(1).length){const k=m.activates.findIndex(c=>c.code===id('Raigeki'));if(k>=0){cast=true;return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}}
  return null}});
 assert.ok(cast,'Invincible: Raigeki was cast at a monster');
 if(key)assert.ok(named('Mystical Elf',1),"Invincible: the opponent's Raigeki does not destroy the relic owner's monster");
 else assert.ok(!named('Mystical Elf',1),'without the relic Raigeki destroys it');
}

// Sacred Phoenix: from 300 LP, the first lethal Hinotama is survived at 1,000 LP; only a second one ends the duel.
duel('sacred_phoenix',fill('Pot of Greed'),fill('Hinotama'),{turns:2,lp:300,summon:[]});
assert.ok(e.events.some(x=>x.kind==='relic_used'&&x.relic==='phoenix_rebirth'),'Sacred Phoenix: the save happened and is reported for its coins');
assert.ok(!e.finished||e.query(1,L.GRAVE).filter(c=>c?.code===id('Hinotama')).length>=2,'Sacred Phoenix: one 500 burn did not end the duel at 300 LP');

console.log('PASS fused relics behave as written in the real core');
process.exit(0);
