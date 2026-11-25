// Relic fixes of 2026-11-25. Relic scripts come from passives.py, as in test_loyalty_facedown_nov24.mjs.
// f6bdd8f9: Scapegoat Pasture changed nothing on the Sheep Token beside Iron Silence: its copied stats were the token's own
//           effects, which Iron Silence negates. They cannot be disabled now (the Moth and Machine Duplication tokens too).
// Discord: Boss Monster negated Snatch Steal's effect, yet the Equip Spell still equipped and took the monster; a Spell or Trap
//          Card's activation is negated as an activation now.
// Discord: Pyramid of Lightning and Toon Premiere worked in Draft only for the player going first: seat 1's MoveToField and
//          GetFirstMatchingCard kept player 0.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const all=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');"+code],{cwd:root,encoding:'utf8'});
const run=relics=>`{'artifacts':${JSON.stringify(relics)},'curses':[],'round':1,'character':0,'lp':8000}`;
const lua=relics=>py(`import passives;print(passives.script(${run(relics)},telemetry=False))`);
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const e=await new MobileDuel(all).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
const begin=(body,relics)=>{e.start([],[],8000,8000,0,7,[],[],field(body)+'\n'+lua(relics),0);e.core.startDuel(e.h);e.advance()};

// Scapegoat Pasture copies Five-Headed Dragon onto the Sheep Token, with or without Iron Silence.
for(const relics of [['scapegoat_pasture'],['scapegoat_pasture','cursed_iron_silence']]){
 begin(add('Sheep Token',0,'MZONE','FACEUP_DEFENSE',1)+add('Five-Headed Dragon',1,'MZONE','FACEUP_ATTACK',2),relics);
 for(let i=0;i<30&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;i++){const m=e.pending;
  e.respond(m.type===M.SELECT_CARD?{type:5,indicies:[m.selects.findIndex(c=>e.name(c.code)==='Five-Headed Dragon')]}:e.auto(m))}
 const t=e.query(0,L.MZONE).filter(Boolean)[0],silence=relics.length>1;
 const n=e.errors.length;e.core.loadScript(e.h,'probe.lua','Debug.Message("code="..Duel.GetFieldCard(0,LOCATION_MZONE,1):GetCode())');
 ok(e.errors.slice(n).includes('code='+id('Five-Headed Dragon'))&&t.level===12&&BigInt(t.race)===8192n&&t.attack===5000+(silence?600:0),`f6bdd8f9: ${relics.join(' + ')} makes the token a Five-Headed Dragon (L${t.level} ${t.attack} ${e.errors.slice(n)})`);
}
// Boss Monster stops Snatch Steal (an Equip Spell) and Change of Heart from taking the Level 7+ monster.
for(const spell of ['Snatch Steal','Change of Heart']){
 begin(add('Blue-Eyes White Dragon',0,'MZONE','FACEUP_ATTACK',2)+add(spell,1,'HAND','FACEDOWN'),['boss_monster']);
 let used=false;
 for(let i=0;i<80&&e.pending&&e.turn<3;i++){const m=e.pending;
  if(m.player===0){e.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:e.auto(m));continue}
  const k=m.type===M.SELECT_IDLECMD&&e.phase===4&&!used?m.activates.findIndex(c=>e.name(c.code)===spell):-1;
  if(k>=0){used=true;e.respond({type:1,action:5,index:k});continue}
  e.respond(e.auto(m))}
 ok(used,spell+' was activated');
 ok(e.query(0,L.MZONE).some(c=>c&&e.name(c.code)==='Blue-Eyes White Dragon')&&e.query(1,L.GRAVE).some(c=>c&&e.name(c.code)===spell),'Boss Monster: '+spell+' is negated and Blue-Eyes stays');
}
// Draft: the second seat's starting Pyramid of Light and Toon World go to its own Spell & Trap Zone.
{
 const seat1=relic=>py(`import draft_relics as d,passives;print(passives.multiplayer_script(dict(d._base(0),artifacts=['${relic}']),1))`);
 const deck=Array(40).fill(id('Battle Ox')),toon=[id('Toon World'),...Array(39).fill(id('Battle Ox'))];
 for(const [relic,card,enemy] of [['pyramid_of_lightning','Pyramid of Light',deck],['toon_premiere','Toon World',toon]]){
  e.start(deck,enemy,8000,8000,5,7,[],[],seat1(relic),5);
  for(let i=0;i<50&&e.pending&&!(e.pending.player===0&&e.pending.type===M.SELECT_IDLECMD);i++)e.respond(e.auto());
  ok(e.query(1,L.SZONE).some(c=>c&&e.name(c.code)===card)&&!e.query(0,L.SZONE).some(c=>c&&e.name(c.code)===card),`Draft seat 1 (${relic}): ${card} is on seat 1's field`);
 }
}
e.destroy();
console.log(`PASS relics Nov 25 (${checks} checks): Scapegoat Pasture with Iron Silence, Boss Monster vs Snatch Steal, Draft seat 1 starting cards`);
