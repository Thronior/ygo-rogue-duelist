// Restless Dead revives one random Zombie from your GY in Defense Position at your Standby Phase, only while you control no monsters.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,L} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=name=>meta.cards.find(c=>c.name===name).id;
const generated=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',"import passives;print(passives.script({'character':9,'artifacts':['restless_dead'],'curses':[]},telemetry=False))"],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const ZOMBIE=id('Pyramid Turtle'),OTHER=id('Kuriboh'),GUARD=id('Battle Ox');
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
// Debug setup: player 0 goes first and reaches Main Phase 1 after its first Standby Phase.
function firstMain(grave,field){
 const add=(code,loc,pos)=>`Debug.AddCard(${code},0,0,${loc},0,${pos})\n`;
 const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+grave.map(c=>add(c,'LOCATION_GRAVE','POS_FACEUP')).join('')+field.map(c=>add(c,'LOCATION_MZONE','POS_FACEUP_ATTACK')).join('')+
  [OTHER,OTHER,OTHER].map(c=>add(c,'LOCATION_DECK','POS_FACEDOWN')).join('')+`Debug.AddCard(${OTHER},1,1,LOCATION_DECK,0,POS_FACEDOWN)\nDebug.ReloadFieldEnd()`;
 engine.start([],[],8000,8000,0,271828,[],[],setup+'\n'+generated.stdout,0);engine.core.startDuel(engine.h);let state=engine.advance();
 for(let i=0;i<100&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());
 const monsters=state.players[0].monsters.filter(Boolean);assert.deepEqual(engine.errors.filter(x=>x.trim()),[]);engine.destroy();return monsters;
}
try{
 const revived=firstMain([ZOMBIE,OTHER],[]);
 assert.equal(revived.length,1,'one monster revived onto an empty field');
 assert.equal(revived[0].code,ZOMBIE,'only the Zombie is revived');
 assert.ok(revived[0].position&(4|8),'revived in Defense Position');
 assert.deepEqual(firstMain([ZOMBIE],[GUARD]).map(c=>c.code),[GUARD],'no revival while you control a monster');
 assert.deepEqual(firstMain([OTHER],[]),[],'no Zombie in the GY means no revival');
 console.log('PASS Restless Dead: revives one GY Zombie in Defense Position at your Standby Phase only while your field is empty');
}finally{try{engine.destroy()}catch{}}
