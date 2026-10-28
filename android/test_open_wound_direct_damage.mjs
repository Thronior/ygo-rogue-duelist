import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MobileDuel,M,R,B,L} from './web/duel.js';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('./web/',import.meta.url));
const repo=fileURLToPath(new URL('../',import.meta.url));
const content=JSON.parse(fs.readFileSync(root+'content.json','utf8'));
const data=JSON.parse(fs.readFileSync(root+'engine-data.json','utf8'));
const scripts=JSON.parse(fs.readFileSync(root+'scripts.json','utf8'));
const id=name=>content.cards.find(c=>c.name===name).id;
const python=fileURLToPath(new URL('../python/python.exe',import.meta.url));
const generated=spawnSync(python,['-B','-c',"import passives; print(passives.script({'character':0,'artifacts':[],'curses':['exposed'],'challenge_level':2},telemetry=False))"],{cwd:repo,encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);

const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\n'+
 'Debug.SetPlayerInfo(0,8000,0,0)\n'+
 'Debug.SetPlayerInfo(1,8000,0,0)\n'+
 'Debug.AddCard('+id('Acrobat Monkey')+',1,1,LOCATION_MZONE,0,POS_FACEUP_ATTACK)\n'+
 'Debug.ReloadFieldEnd()';
const engine=await new MobileDuel(content.cards).init([data,scripts]);
try{
 let state=engine.start([],[],8000,8000,0,271828,[],[],setup+'\n'+generated.stdout,0);
 engine.core.startDuel(engine.h);
 state=engine.advance();
 let attacks=0,steps=0;
 while(!state.finished&&state.lp[0]===8000&&steps++<100){
  const m=engine.pending;
  assert.ok(m,'The duel must stop on a recognized response');
  let response=engine.auto(m);
  if(m.type===M.SELECT_BATTLECMD){
   const index=m.attacks.findIndex(c=>c.code===id('Acrobat Monkey'));
   if(index>=0){response={type:R.SELECT_BATTLECMD,action:B.SELECT_BATTLE,index};attacks++;}
  }
  state=engine.respond(response);
 }
 assert.equal(attacks,1,'The 1,000 ATK monster should make one direct attack');
 assert.equal(state.lp[0],6000,'Amplified Open Wound should turn 1,000 direct damage into 2,000 exactly once');
 assert.equal(state.lp[1],8000,'No other effect should change the attacker LP');
 assert.deepEqual(engine.errors,[]);
 console.log('PASS actual OCG duel: Acrobat Monkey direct attack, 8000 -> 6000 LP (2,000 damage), one Open Wound curse, no relics');
}finally{engine.destroy()}