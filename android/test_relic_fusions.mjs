// Fused relics in the real core: each one's duel rule does what its text says (2026-11-03).
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const KEYS=['chaos_orb','four_elements','harpie_nest','zaloog_hideout','amazoness_village','necrovalley_throne','fusion_gate','jar_of_greed','second_coin_toss','scapegoat_pasture','sacred_phoenix','invincible','attribute_mutation','gaia_plate','masterwork_blade','endless_archive','giant_killers_cradle','titans_covenant','commoners_crown','undying_legion','tyrants_throne','mass_grave','bottomless_purse','grand_bazaar'];
const scripts=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps({**{k:passives.script({'curses':[],'artifacts':[k] if k else [],'challenge_level':0,'character':0}) for k in ${JSON.stringify(['',...KEYS])}},'unionize':passives.script({'curses':[],'artifacts':['unionize'],'challenge_level':0,'character':0}),'union_buster':passives.script({'curses':[],'artifacts':['union_buster'],'challenge_level':0,'character':0}),'union_both':passives.script({'curses':[],'artifacts':['union_buster','unionize'],'challenge_level':0,'character':0})}))`],{cwd:root,encoding:'utf8',maxBuffer:1<<26}));
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

duel('attribute_mutation',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attribute,0x7f,'Attribute Mutation: the monster has every Attribute');

duel('four_elements',fill('Mystical Elf','Celtic Guardian'),WALL,{turns:3});
assert.equal(mine().length,2,'Four Elements: both monsters are out');
for(const c of mine())assert.equal(c.attack,meta.cards.find(x=>x.id===c.code).atk+400,'Four Elements: two Attributes give 400 ATK');

for(const key of ['','harpie_nest']){
 // 800 ATK since 2026-11-09: a 2300 attacker still beats the 2100 Harpie, so the save and the 200 damage still show.
 duel(key,fill('Harpie Lady'),fill('Goblin Attack Force'),{turns:2});
 const harpie=named('Harpie Lady');
 if(key){assert.equal(harpie?.attack,2100,'Harpie Nest: +800 ATK');assert.ok(harpie,'Harpie Nest: the Harpie survives its first battle');assert.equal(e.lp[0],7800,'Harpie Nest: the battle damage still applies')}
 else assert.ok(!harpie||e.lp[0]===8000,'without the relic a 1300 Harpie loses to Goblin Attack Force when attacked');
}

duel('amazoness_village',fill('Amazoness Swords Woman'),WALL);
assert.equal(named('Amazoness Swords Woman')?.attack,2300,'Amazoness Village: +800 ATK');

// Necrovalley Throne: the player's own Heavy Storm cannot destroy their Field Spell.
{let played=new Set();
 duel('necrovalley_throne',fill('Necrovalley','Heavy Storm',"Gravekeeper's Spy"),WALL,{summon:[id("Gravekeeper's Spy")],step:m=>{
  if(m.type!==M.SELECT_IDLECMD)return null;
  for(const n of ['Necrovalley','Heavy Storm']){const k=m.activates.findIndex(c=>c.code===id(n));if(k>=0&&!played.has(n)&&(n==='Necrovalley'||played.has('Necrovalley'))){played.add(n);return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}}
  return null}});
 assert.ok(played.has('Heavy Storm'),'Necrovalley Throne: Heavy Storm was played');
 assert.ok(e.query(0,L.SZONE).some(c=>c?.code===id('Necrovalley')),'Necrovalley Throne: the Field Spell survives Heavy Storm');
 assert.equal(named("Gravekeeper's Spy")?.attack,1200+800+500,"Necrovalley Throne: Gravekeeper's +800 ATK (and Necrovalley's 500)");}

duel('fusion_gate',fill('Pot of Greed'),WALL,{extra:[id('King Dragun')],summon:[]});
assert.ok(named('King Dragun'),'Fusion Gate: an empty field Special Summons from the Fusion Deck');

for(const key of ['','jar_of_greed']){duel(key,fill('Pot of Greed'),WALL,{summon:[],step:m=>m.type===M.SELECT_IDLECMD&&e.turn===1?(globalThis.hand=e.query(0,L.HAND).length,null):null});globalThis[key||'base']=globalThis.hand}
assert.equal(globalThis.jar_of_greed,globalThis.base+1,'Jar of Greed: 1 extra card on the first turn');

// Divine Gambler (key second_coin_toss): every die roll is chosen (2026-11-05). Two Graceful Dice in one turn, both chosen as 6 (+1200 ATK).
{let chose=0,boosted=0;
 duel('second_coin_toss',fill('Mystical Elf','Graceful Dice'),WALL,{summon:[id('Mystical Elf')],step:m=>{
  if(m.type===M.ANNOUNCE_NUMBER){chose++;return {type:R.ANNOUNCE_NUMBER,value:m.options.findIndex(v=>Number(v)===6)}}
  if(m.type===M.SELECT_IDLECMD&&chose)boosted=Math.max(boosted,named('Mystical Elf')?.attack||0);
  if(m.type===M.SELECT_IDLECMD&&mine().length&&chose<2){const k=m.activates.findIndex(c=>c.code===id('Graceful Dice'));if(k>=0)return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}
  return null}});
 assert.equal(chose,2,'Divine Gambler: both die rolls in the same turn ask for their result');
 assert.equal(boosted,800+1200,'Divine Gambler: both chosen 6s are the results');}

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
 assert.equal(e.lp[1],8000-1400-800,"Don Zaloog's Hideout: the attack was direct, with Don Zaloog's +800 ATK");}

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

// Cursed fusions (2026-11-04).
duel('masterwork_blade',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attack,800+800,'Masterwork Blade: +800 ATK');
assert.equal(named('Mystical Elf')?.defense,2000,'Masterwork Blade: no DEF loss');
duel('gaia_plate',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.defense,2000+1500,'Gaia Plate: +1,500 DEF');
assert.equal(named('Mystical Elf')?.attack,800,'Gaia Plate: no ATK loss');
duel('giant_killers_cradle',fill('Kuriboh','Mystical Elf'),WALL,{summon:[id('Kuriboh')]});
assert.equal(named('Kuriboh')?.attack,300+1000,"Giant-Killer's Cradle: a Level 1 gains 1,000 ATK");
duel('tyrants_throne',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attack,800+1200,"Tyrant's Throne: a lone monster gains 1,200 ATK");
duel('tyrants_throne',fill('Mystical Elf'),WALL,{turns:3});
assert.equal(mine().length,2,"Tyrant's Throne: two monsters are out");
for(const c of mine())assert.equal(c.attack,meta.cards.find(x=>x.id===c.code).atk,"Tyrant's Throne: no bonus and no penalty with 2 monsters");
duel('commoners_crown',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attack,1800,"Commoner's Crown: a Normal Monster gains 1,000 ATK");
assert.equal(named('Mystical Elf')?.defense,3000,"Commoner's Crown: and 1,000 DEF");
duel('undying_legion',fill('Armored Zombie'),WALL);
assert.equal(named('Armored Zombie')?.attack,1500+1200,'Undying Legion: a Zombie gains 1,200 ATK');
for(const key of ['','undying_legion']){let healed=false;
 duel(key,fill('Dian Keto the Cure Master'),WALL,{summon:[],step:m=>{
  if(m.type===M.SELECT_IDLECMD&&!healed){const k=m.activates.findIndex(c=>c.code===id('Dian Keto the Cure Master'));if(k>=0){healed=true;return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}}
  return null}});
 assert.ok(healed,'Dian Keto was played');
 assert.equal(e.lp[0],key?8500:9000,key?'Undying Legion: 1,000 LP gained becomes 500':'without the relic Dian Keto gains 1,000');}
// Titan's Covenant: Dark Magician (Level 7) needs only 1 Tribute and gains 1,200 ATK.
duel('titans_covenant',fill('Mystical Elf','Dark Magician'),WALL,{turns:3,step:m=>{
 if(m.type===M.SELECT_IDLECMD&&e.turn===3){const k=m.summons.findIndex(c=>c.code===id('Dark Magician'));if(k>=0)return {type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:k}}
 return null}});
assert.equal(named('Dark Magician')?.attack,2500+1200,"Titan's Covenant: a 1-Tribute Dark Magician with +1,200 ATK");
// Divine Archive draws 2 a turn: 2 more cards gone from the Deck by turn 3 (draws on turns 1 and 3).
for(const key of ['','endless_archive']){duel(key,fill('Mystical Elf'),WALL,{turns:3});globalThis['deck_'+(key||'base')]=e.query(0,L.DECK).length}
assert.equal(globalThis.deck_endless_archive,globalThis.deck_base-2,'Divine Archive: 1 additional card in each draw');
// Grand Ritual Altar: 200 ATK per Ritual Summon so far this run (3 here), no penalty.
scripts.altar=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps(passives.script({'curses':[],'artifacts':['grand_ritual_altar'],'challenge_level':0,'character':0,'ritual_scar_count':3})))`],{cwd:root,encoding:'utf8'}));
duel('altar',fill('Mystical Elf'),WALL);
assert.equal(named('Mystical Elf')?.attack,800+600,'Grand Ritual Altar: 3 Ritual Summons give 600 ATK');
// Commoner's Crown (2026-11-05: destruction only, was full immunity), given to the CPU's side: your Raigeki cannot destroy its Normal Monster.
{const crown=JSON.parse(execFileSync(python,['-B','-c',`import sys,json;sys.path.insert(0,'.');import passives
print(json.dumps(passives.multiplayer_script({'curses':[],'artifacts':['commoners_crown'],'challenge_level':0,'character':0},1)))`],{cwd:root,encoding:'utf8'}));
 scripts.crown=scripts['']+'\n'+crown;let cast=false;
 duel('crown',fill('Raigeki'),fill('Gemini Elf'),{turns:3,summon:[],step:m=>{
  if(m.type===M.SELECT_IDLECMD&&e.turn===3&&!cast&&mine(1).length){const k=m.activates.findIndex(c=>c.code===id('Raigeki'));if(k>=0){cast=true;return {type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k}}}
  return null}});
 assert.ok(cast,"Commoner's Crown: Raigeki was cast");
 assert.ok(named('Gemini Elf',1),"Commoner's Crown: the Normal Monster is not destroyed by the opponent's Raigeki");}

// Sacred Phoenix: from 300 LP, the first lethal Hinotama is survived at 1,000 LP; only a second one ends the duel.
duel('sacred_phoenix',fill('Pot of Greed'),fill('Hinotama'),{turns:2,lp:300,summon:[]});
assert.ok(e.events.some(x=>x.kind==='relic_used'&&x.relic==='phoenix_rebirth'),'Sacred Phoenix: the save happened and is reported for its coins');
assert.ok(!e.finished||e.query(1,L.GRAVE).filter(c=>c?.code===id('Hinotama')).length>=2,'Sacred Phoenix: one 500 burn did not end the duel at 300 LP');

// Union Buster (2026-11-09): Normal Summoning X-Head Cannon equips a Y-Dragon Head from the hand or Deck (its text lists
// X-Head Cannon). X-Head 1800 + Y-Dragon Head's own 400 + 400 per equipped monster; Unionize adds 300 per equipped Union.
const xHead=key=>{duel(key,fill('X-Head Cannon','Y-Dragon Head'),WALL,{summon:[id('X-Head Cannon')]});const x=named('X-Head Cannon');return {x,equips:e.query(0,L.SZONE).filter(c=>c?.code===id('Y-Dragon Head')).length}};
{let r=xHead('');assert.equal(r.x?.attack,1800,'no relic: X-Head Cannon has nothing equipped');assert.equal(r.equips,0);
 r=xHead('unionize');assert.equal(r.x?.attack,1800,'Unionize alone: nothing equipped, no bonus');
 r=xHead('union_buster');assert.equal(r.equips,1,'Union Buster: Y-Dragon Head was equipped on the Normal Summon');assert.equal(r.x?.attack,1800+400+400,'Union Buster: +400 for the equipped monster');
 r=xHead('union_both');assert.equal(r.x?.attack,1800+400+400+300,'Unionize: +300 for the equipped Union monster');}

console.log('PASS fused relics behave as written in the real core');
process.exit(0);
