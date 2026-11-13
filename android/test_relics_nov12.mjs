// The relics added on 2026-11-12 from Discord suggestions, in real-core duels: Anime Rule #3 (cursed), Typhoon,
// Machine Duplication, Ghost Destruction, Omni Banishment, Dimensional Rift and Spell Provider. Cursed Restock is a
// shop rule, checked in tools/test_relics_nov12.py. Also the CPU's Fairy Box upkeep rule.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const {MobileDuel,M,R,I,B,L}=await import('./web/duel.js');
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=(code,...args)=>execFileSync(python,['-B','-c',"import sys,json;sys.path.insert(0,'.');"+code,...args],{cwd:root,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}}).trim();
const relicScript=(artifacts,side=0)=>py('import passives;print(passives.multiplayer_script(json.loads(sys.argv[1]),int(sys.argv[2])))',JSON.stringify({curses:[],artifacts,cursed_artifacts:artifacts.filter(a=>a.startsWith('cursed_')),challenge_level:0}),String(side));
const OX=id('Battle Ox'),SKULL=id('Summoned Skull'),YAMI=id('Yami'),WABOKU=id('Waboku'),TRAP_HOLE=id('Trap Hole'),FISSURE=id('Fissure'),CHASER=id('Mechanicalchaser'),LIBRARY=id('Royal Magical Library'),VORSE=id('Vorse Raider'),FAIRY_BOX=id('Fairy Box');
let checks=0;const ok=(value,why)=>{assert(value,why);checks++},same=(a,b,why)=>{assert.deepEqual(a,b,why);checks++};
for(const name of ['Typhoon','Machine Duplication','Ghost Destruction','Omni Banishment','Dimensional Rift','Spell Provider','Anime Rule #3','Cursed Restock'])ok(Object.values(meta.artifacts).some(a=>a[0]===name),name+' is in content.json');

// drive(e,m) answers a prompt or returns null to let the CPU policy answer. Stops after `turns` turns.
async function duel({artifacts=[],deck,enemy,turns=4,drive,lua=''}){
 const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
 let s=e.start(deck,enemy,8000,8000,5,7,[],[],relicScript(artifacts)+'\n'+lua);
 for(let i=0;i<6000&&!s.finished&&e.turn<=turns;i++){const m=e.pending;if(!m)break;const answer=drive(e,m);s=e.respond(answer||e.auto())}
 assert.deepEqual(e.errors||[],[],'no script errors');
 return e;
}
const idle=(m,action,code,list)=>{const at=(m[list]||[]).findIndex(c=>c.code===code);return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}};
const toEnd={type:R.SELECT_IDLECMD,action:I.TO_EP,index:null},noBattle={type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null};
const fill=(...codes)=>Array.from({length:40},(_,n)=>codes[n%codes.length]);
const cards=(e,p,loc,code)=>e.query(p,loc).filter(c=>c&&(!code||c.code===code));
const count=(e,p,loc,code)=>cards(e,p,loc,code).length;
const picks=(m,where)=>m.type===M.SELECT_CARD&&m.selects.length&&m.selects.every(where);

// Anime Rule #3: Summoned Skull (Level 6) is Normal Summoned with no Tribute; 2500 - 1000 without a Field Spell,
// 2500 + 200 with Yami and no loss.
async function animeRule(artifacts,deck){
 let summoned=false,tributes=0;
 const e=await duel({artifacts,deck,enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   const yami=!count(e,0,L.SZONE,YAMI)&&idle(m,I.SELECT_ACTIVATE,YAMI,'activates');if(yami)return yami;
   const skull=!summoned&&idle(m,I.SELECT_SUMMON,SKULL,'summons');if(skull){summoned=true;return skull}
   return toEnd}
  if(m.type===M.SELECT_TRIBUTE)tributes++;
  return null}});
 const skull=cards(e,0,L.MZONE,SKULL)[0];const out={offered:summoned,tributes,attack:skull?.attack??null,defense:skull?.defense??null};e.destroy();return out;
}
const bare=await animeRule(['cursed_anime_rule_3'],fill(SKULL));console.log('Anime Rule #3',bare);
same(bare,{offered:true,tributes:0,attack:1500,defense:200},'Summoned Skull needs no Tribute and loses 1000 ATK and DEF without a Field Spell');
const field=await animeRule(['cursed_anime_rule_3'],fill(YAMI,SKULL));console.log('Anime Rule #3 with Yami',field);
same(field,{offered:true,tributes:0,attack:2700,defense:1400},'a face-up Field Spell you control removes the loss');
same((await animeRule([],fill(SKULL))).offered,false,'without the relic a Level 6 monster needs a Tribute');

// Typhoon: the opponent's End Phase (2026-11-12, was ours), destroy our Set Waboku, then one of their Set Trap Holes.
async function typhoon(artifacts){
 const seen={asked:false,mine:0,theirs:0};let before=-1;
 const e=await duel({artifacts,deck:fill(WABOKU),enemy:fill(TRAP_HOLE),turns:2,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return (count(e,0,L.SZONE)<1&&idle(m,I.SELECT_SPELL_SET,WABOKU,'spell_sets'))||toEnd;
  if(m.type===M.SELECT_BATTLECMD)return noBattle;
  if(picks(m,c=>c.location===L.SZONE&&c.controller===0)){seen.asked=true;seen.turnPlayer=e.player;before=count(e,1,L.SZONE);seen.mine=count(e,0,L.SZONE);return {type:R.SELECT_CARD,indicies:[0]}}
  if(picks(m,c=>c.location===L.SZONE&&c.controller===1))return {type:R.SELECT_CARD,indicies:[0]};
  return null}});
 const out={...seen,mineAfter:count(e,0,L.SZONE),theirsBefore:before,theirsAfter:count(e,1,L.SZONE)};e.destroy();return out;
}
const withTyphoon=await typhoon(['typhoon']);console.log('Typhoon',withTyphoon);
ok(withTyphoon.asked,'the End Phase asks for one of your Spells/Traps once the opponent has one');
same(withTyphoon.turnPlayer,1,"it asks during the opponent's turn");
same(withTyphoon.mineAfter,withTyphoon.mine-1,'your card is destroyed');
same(withTyphoon.theirsAfter,withTyphoon.theirsBefore-1,"then one of your opponent's is destroyed");
same((await typhoon([])).asked,false,'without the relic nothing is asked');

// Machine Duplication: Mechanicalchaser (1850/800) makes a 925/400 Clone Token in Attack Position.
async function duplicate(artifacts){
 let asked=false;
 const e=await duel({artifacts,deck:fill(CHASER),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return (!count(e,0,L.MZONE)&&idle(m,I.SELECT_SUMMON,CHASER,'summons'))||toEnd;
  if(picks(m,c=>c.location===L.MZONE&&c.code===CHASER)){asked=true;return {type:R.SELECT_CARD,indicies:[0]}}
  return null}});
 const token=cards(e,0,L.MZONE).find(c=>c.code!==CHASER);const out={asked,monsters:count(e,0,L.MZONE),token:token?[token.attack,token.defense,token.position]:null};e.destroy();return out;
}
const withCopy=await duplicate(['machine_duplication']);console.log('Machine Duplication',withCopy);
same(withCopy,{asked:true,monsters:2,token:[925,400,1]},'a Clone Token with half the ATK and DEF, in face-up Attack Position');
same((await duplicate([])).monsters,1,'without the relic no Token');

// Ghost Destruction and Dimensional Rift: Fissure clears the opponent's Battle Ox, then our Battle Ox attacks directly.
async function battle(artifacts){
 const seen={asked:false,options:0};
 const e=await duel({artifacts,deck:fill(FISSURE,OX),enemy:fill(OX),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD){
   if(e.turn===1)return toEnd;
   const fissure=count(e,1,L.MZONE)?idle(m,I.SELECT_ACTIVATE,FISSURE,'activates'):null;if(fissure)return fissure;
   const summon=!count(e,0,L.MZONE)?idle(m,I.SELECT_SUMMON,OX,'summons'):null;if(summon)return summon;
   return m.to_bp?{type:R.SELECT_IDLECMD,action:I.TO_BP,index:null}:toEnd}
  if(picks(m,c=>c.location===L.GRAVE)){seen.asked=true;seen.options=m.selects.length;return {type:R.SELECT_CARD,indicies:[0]}}
  return null}});
 const out={...seen,lp:e.lp[1],theirGrave:count(e,1,L.GRAVE),theirBanished:count(e,1,L.REMOVED),ourGrave:count(e,0,L.GRAVE),ourBanished:count(e,0,L.REMOVED)};e.destroy();return out;
}
const ghost=await battle(['ghost_destruction']);console.log('Ghost Destruction',ghost);
ok(ghost.lp<8000&&ghost.asked,'direct battle damage asks for a monster in a GY');
same(ghost.theirBanished,1,"the opponent's Battle Ox is banished");
same(ghost.theirGrave,0,'and leaves the GY');
same((await battle([])).asked,false,'without the relic nothing is asked');
const rift=await battle(['dimensional_rift']);console.log('Dimensional Rift',rift);
same([rift.theirGrave,rift.ourGrave],[0,0],'nothing reaches either GY');
ok(rift.theirBanished>=1&&rift.ourBanished>=1,"the destroyed Battle Ox and the used Fissure are banished instead");

// Omni Banishment: our first Standby Phase banishes 1 card from the Deck.
async function omni(artifacts){
 let asked=false,deckBefore=0;
 const e=await duel({artifacts,deck:fill(OX),enemy:fill(WABOKU),turns:1,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return toEnd;
  if(picks(m,c=>c.location===L.DECK)){asked=true;deckBefore=count(e,0,L.DECK);return {type:R.SELECT_CARD,indicies:[0]}}
  return null}});
 const out={asked,banished:count(e,0,L.REMOVED),deck:deckBefore?deckBefore-count(e,0,L.DECK):0};e.destroy();return out;
}
const withOmni=await omni(['omni_banishment']);console.log('Omni Banishment',withOmni);
same(withOmni,{asked:true,banished:1,deck:1},'1 card goes from the Deck to the banishment');
same((await omni([])).banished,0,'without the relic nothing is banished');

// Spell Provider: Royal Magical Library summoned on turn 1 gets a Spell Counter in our next Standby Phase.
const spellCounters=c=>{const raw=c?.counters||{};return Array.isArray(raw)?raw.filter(x=>(x.type&0xfff)===1).reduce((n,x)=>n+x.count,0):Number(raw[1]??raw['1']??0)||0};
async function provider(artifacts){
 let asked=false;
 const e=await duel({artifacts,deck:fill(LIBRARY),enemy:fill(WABOKU),turns:3,drive(e,m){
  if(m.player!==0)return null;
  if(m.type===M.SELECT_IDLECMD)return (!count(e,0,L.MZONE)&&idle(m,I.SELECT_SUMMON,LIBRARY,'summons'))||toEnd;
  if(m.type===M.SELECT_BATTLECMD)return noBattle;
  if(m.type===M.SELECT_POSITION)return {type:R.SELECT_POSITION,position:1};
  if(picks(m,c=>c.location===L.MZONE)){asked=true;return {type:R.SELECT_CARD,indicies:[0]}}
  return null}});
 const out={asked,counters:spellCounters(cards(e,0,L.MZONE,LIBRARY)[0])};e.destroy();return out;
}
const withProvider=await provider(['spell_provider']);console.log('Spell Provider',withProvider);
same(withProvider,{asked:true,counters:1},'a Spell Counter is placed on Royal Magical Library');
same((await provider([])).counters,0,'without the relic no counter');

// Fairy Box (user, 2026-11-12): the CPU (seat 1) pays 500 LP each Standby Phase while it is behind, and stops paying
// once its board has been the better one at two of its Standby Phases in a row.
async function fairy(deck){
 const lua=`local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_DRAW) e:SetOperation(function(e) e:Reset()
 Duel.MoveToField(Duel.CreateToken(1,${FAIRY_BOX}),1,1,LOCATION_SZONE,POS_FACEUP,true) end) Duel.RegisterEffect(e,0)`;
 const lp=[];
 const e=await duel({deck,enemy:fill(OX),turns:8,lua,drive(e,m){if(e.phase===4&&e.player===1&&lp.at(-1)?.turn!==e.turn)lp.push({turn:e.turn,lp:e.lp[1]});return null}});
 const out={kept:count(e,1,L.SZONE,FAIRY_BOX)>0,paid:lp.filter((x,i)=>i>0&&x.lp===lp[i-1].lp-500).length,lp};e.destroy();return out;
}
const ahead=await fairy(fill(WABOKU));console.log('Fairy Box, CPU ahead',ahead);
ok(!ahead.kept,'with the better board two Standby Phases in a row the CPU lets Fairy Box go');
ok(ahead.paid<=2,'it stops paying 500 LP every turn');
const behind=await fairy(fill(VORSE));console.log('Fairy Box, CPU behind',behind);
ok(behind.kept,'while the opponent has the stronger monster the upkeep keeps being paid');

console.log(`PASS Nov 12 relics: ${checks} checks`);
