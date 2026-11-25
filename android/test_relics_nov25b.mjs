// Relic changes of 2026-11-25 (second batch, user). Relic scripts come from passives.py, as in test_relics_nov25.mjs.
// Exile Standard: counts every banished monster, face-down ones too (was face-up only). Spells and Traps still do not count.
// Boss Monster: negates the first opponent's card or effect that targets a Level 7+ monster you control and destroys that
//               card, so a monster effect (Relinquished) is dealt with too, not only Spell/Trap activations.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^﻿/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json'),scripts=json('android/web/scripts.json');
const all=[...meta.cards,...(meta.tokenCards||[])],id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const py=code=>execFileSync(python,['-B','-c',"import sys;sys.path.insert(0,'.');"+code],{cwd:root,encoding:'utf8'});
const run=relics=>`{'artifacts':${JSON.stringify(relics)},'curses':[],'round':1,'character':0,'lp':8000}`;
const lua=relics=>relics.length?py(`import passives;print(passives.script(${run(relics)},telemetry=False))`):'';
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const e=await new MobileDuel(all).init([data,scripts]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};
const begin=(body,relics)=>{e.start([],[],8000,8000,0,7,[],[],field(body)+'\n'+lua(relics),0);e.core.startDuel(e.h);e.advance()};
const mine=name=>e.query(0,L.MZONE).find(c=>c&&e.name(c.code)===name);
const inGrave=(p,name)=>e.query(p,L.GRAVE).some(c=>c&&e.name(c.code)===name);

// Exile Standard: 1 face-up and 1 face-down banished monster (either player) = +100; a banished Spell adds nothing.
for(const relics of [['exile_standard'],[]]){
 begin(add('Blue-Eyes White Dragon',0,'MZONE','FACEUP_ATTACK',2)+add('Kuriboh',0,'REMOVED','FACEUP')+add('Battle Ox',1,'REMOVED','FACEDOWN')+add('Dark Hole',1,'REMOVED','FACEUP'),relics);
 const atk=mine('Blue-Eyes White Dragon')?.attack;
 ok(atk===3000+(relics.length?100:0),`Exile Standard ${relics.length?'on':'off'}: Blue-Eyes ${atk} ATK with 1 face-up and 1 face-down banished monster`);
}

// Boss Monster: the opponent activates a card or effect that targets Blue-Eyes. Without the relic it works (control).
const opponentUses=card=>{let used=false;
 for(let i=0;i<80&&e.pending&&e.turn<3;i++){const m=e.pending;
  if(m.player===0){e.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:e.auto(m));continue}

  const k=m.type===M.SELECT_IDLECMD&&e.phase===4&&!used?(m.activates||[]).findIndex(c=>e.name(c.code)===card):-1;
  if(k>=0){used=true;e.respond({type:1,action:5,index:k});continue}
  e.respond(e.auto(m))}
 return used};
for(const relics of [['boss_monster'],[]]){
 const on=relics.length>0;
 // Relinquished (a monster that stays on the field): "target 1 monster your opponent controls; equip that target".
 begin(add('Blue-Eyes White Dragon',0,'MZONE','FACEUP_ATTACK',2)+add('Relinquished',1,'MZONE','FACEUP_ATTACK',2),relics);
 ok(opponentUses('Relinquished'),'Relinquished activated its effect');
 const relinquished=e.query(1,L.MZONE).some(c=>c&&e.name(c.code)==='Relinquished');
 if(on)ok(mine('Blue-Eyes White Dragon')&&!relinquished&&inGrave(1,'Relinquished'),'Boss Monster: Relinquished is negated and destroyed, Blue-Eyes stays');
 else ok(!mine('Blue-Eyes White Dragon')&&relinquished,'control: without Boss Monster, Relinquished takes Blue-Eyes');
 // Snatch Steal (an Equip Spell) is still stopped and goes to the GY.
 begin(add('Blue-Eyes White Dragon',0,'MZONE','FACEUP_ATTACK',2)+add('Snatch Steal',1,'HAND','FACEDOWN'),relics);
 ok(opponentUses('Snatch Steal'),'Snatch Steal was activated');
 if(on)ok(mine('Blue-Eyes White Dragon')&&inGrave(1,'Snatch Steal'),'Boss Monster: Snatch Steal is negated and destroyed, Blue-Eyes stays');
 else ok(!mine('Blue-Eyes White Dragon'),'control: without Boss Monster, Snatch Steal takes Blue-Eyes');
}
// Once per Duel: of two targeting Spells in the same Duel, only the first is negated.
{
 begin(add('Blue-Eyes White Dragon',0,'MZONE','FACEUP_ATTACK',2)+add('Red-Eyes Black Dragon',0,'MZONE','FACEUP_ATTACK',3)+add('Snatch Steal',1,'HAND','FACEDOWN')+add('Change of Heart',1,'HAND','FACEDOWN'),['boss_monster']);
 let used=[];
 for(let i=0;i<120&&e.pending&&e.turn<3;i++){const m=e.pending;
  if(m.player===0){e.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:m.type===M.SELECT_BATTLECMD?{type:0,action:3,index:null}:e.auto(m));continue}
  const k=m.type===M.SELECT_IDLECMD&&e.phase===4?(m.activates||[]).findIndex(c=>['Snatch Steal','Change of Heart'].includes(e.name(c.code))&&!used.includes(e.name(c.code))):-1;
  if(k>=0){used.push(e.name(m.activates[k].code));e.respond({type:1,action:5,index:k});continue}
  e.respond(e.auto(m))}
 const left=['Blue-Eyes White Dragon','Red-Eyes Black Dragon'].filter(n=>mine(n)).length;
 ok(used.length===2&&left===1,`Boss Monster works once per Duel (${used.join(', ')}; ${left} of 2 dragons stay)`);
}
e.destroy();
console.log(`PASS relics Nov 25b (${checks} checks): Exile Standard counts face-down banished monsters, Boss Monster negates and destroys (Relinquished, Snatch Steal), once per Duel`);
