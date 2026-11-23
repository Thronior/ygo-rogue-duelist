// Behaviour flags 2026-11-23 (third check).
// c81f6011: Dimensional Rift let Set cards destroyed face-down go to the GY (Macro Cosmos's SET_AVAILABLE was missing).
// 32806f04: the CPU's Shallow Grave counted Harpie Lady Sisters, which cannot be revived, and handed back a Destroyer Golem.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,L} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const cards=json('android/web/content.json').cards,id=n=>cards.find(c=>c.name===n).id;
const relicScript=keys=>execFileSync(python,['-B','-c',`
import sys;sys.path.insert(0,'.')
import passives
print(passives.script({'curses':[],'artifacts':${JSON.stringify(keys)}},telemetry=False))`],{cwd:root}).toString();
const duel=await new MobileDuel(cards).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const add=(n,p,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${p},${p},LOCATION_${loc},${seq},POS_${pos})\n`;
const field=body=>{let s='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+body;for(const p of [0,1])for(let i=0;i<10;i++)s+=add('Kuriboh',p,'DECK','FACEDOWN');return s+'Debug.ReloadFieldEnd()\n'};

// Dimensional Rift: Harpie's Feather Duster banishes the face-up and the Set cards alike.
{
 duel.start([],[],8000,8000,0,7,[],[],field(add("Harpie's Feather Duster",0,'HAND','FACEDOWN')+add('Mystical Space Typhoon',1,'SZONE','FACEDOWN',1)+add('Wave-Motion Cannon',1,'SZONE','FACEUP',2)+add('Trap Hole',1,'SZONE','FACEDOWN',3))+relicScript(['dimensional_rift']),0);
 duel.core.startDuel(duel.h);duel.advance();
 for(let i=0;i<20&&duel.pending&&duel.turn<2;i++){const m=duel.pending;
  duel.respond(m.type===M.SELECT_IDLECMD&&m.player===0&&m.activates?.length?{type:1,action:5,index:0}:m.type===M.SELECT_CHAIN?{type:8,index:null}:duel.auto());
  if(!duel.query(1,L.SZONE).some(Boolean))break}
 assert.deepEqual(duel.query(1,L.GRAVE).filter(Boolean).map(c=>duel.name(c.code)),[],'nothing reaches the GY');
 assert.equal(duel.query(1,L.REMOVED).filter(Boolean).length,3,'all three are banished');
 assert.ok(duel.query(0,L.REMOVED).some(c=>c&&duel.name(c.code)==="Harpie's Feather Duster"),'the resolved Spell is banished too');
}

// Shallow Grave: with only Harpie Lady revivable for the CPU, giving back Destroyer Golem is not worth it.
const shallowGrave=ours=>{
 duel.start([],[],8000,8000,0,7,[],[],field(add('The Shallow Grave',1,'HAND','FACEDOWN')+ours.map(n=>add(n,1,'GRAVE','FACEUP')).join('')+add('Destroyer Golem',0,'GRAVE','FACEUP')+add('Dice Jar',0,'MZONE','FACEDOWN_DEFENSE',1)),0);
 duel.core.startDuel(duel.h);duel.advance();let used=false;
 for(let i=0;i<80&&duel.pending&&duel.turn<3;i++){const m=duel.pending;
  if(m.player===0){duel.respond(m.type===M.SELECT_IDLECMD?{type:1,action:7,index:null}:m.type===M.SELECT_CHAIN?{type:8,index:null}:duel.auto());continue}
  const r=duel.auto(m);if(m.type===M.SELECT_IDLECMD&&r.action===5&&duel.name(m.activates[r.index].code)==='The Shallow Grave')used=true;duel.respond(r)}
 return used;
};
assert.equal(shallowGrave(['Harpie Lady','Harpie Lady Sisters']),false,'Harpie Lady Sisters cannot be revived, so it does not count');
assert.equal(shallowGrave(['Blue-Eyes White Dragon']),true,'a stronger revivable monster still makes it worth it');
// b1e7ee57: The Third Gate's redirect was asked with no card by Gravekeeper's Servant's attack cost check
// (IsPlayerCanDiscardDeckAsCost), threw, and the player could not declare any attack.
{
 duel.start([],[],8000,8000,0,7,[],[],field(add('Vorse Raider',0,'MZONE','FACEUP_ATTACK',2)+add("Gravekeeper's Servant",1,'SZONE','FACEUP',0))+relicScript(['third_gate']),0);
 duel.core.startDuel(duel.h);duel.advance();const errors=[];const log=console.error;console.error=(...a)=>{errors.push(a.join(' '));};
 let attacks=null;
 try{for(let i=0;i<80&&duel.pending&&attacks===null;i++){const m=duel.pending;
  if(m.type===M.SELECT_BATTLECMD&&m.player===0){attacks=m.attacks.length;break}
  duel.respond(m.type===M.SELECT_IDLECMD&&m.player===0?{type:1,action:m.to_bp?6:7,index:null}:duel.auto())}}finally{console.error=log}
 assert.equal(attacks,1,'Vorse Raider can attack under Gravekeeper\'s Servant with The Third Gate');
 assert.ok(!errors.some(x=>/table index is nil/.test(x)),'no script error');
}
duel.destroy();
console.log('PASS flags Nov 23 (3rd): Dimensional Rift banishes Set cards, Shallow Grave counts only revivable monsters, The Third Gate allows attacks');
