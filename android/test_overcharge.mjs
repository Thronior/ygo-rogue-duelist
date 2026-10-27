// Overcharge: Thunder monsters you control gain 200 ATK for each other face-up Thunder monster you control, inside the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=name=>meta.cards.find(c=>c.name===name).id;
const generated=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',"import passives;print(passives.script({'character':16,'artifacts':['overcharge'],'curses':[]},telemetry=False))"],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
assert.equal(generated.status,0,generated.stderr);
const BALL=id('Mega Thunderball'),KURIBOH=id('Kuriboh');
const add=(code,player,loc,pos,seq=0)=>`Debug.AddCard(${code},${player},${player},${loc},${seq},${pos})\n`;
const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+
 [BALL,BALL,BALL,KURIBOH].map((c,i)=>add(c,0,'LOCATION_MZONE','POS_FACEUP_ATTACK',i)).join('')+add(BALL,1,'LOCATION_MZONE','POS_FACEUP_ATTACK')+
 [KURIBOH,KURIBOH,KURIBOH].map(c=>add(c,0,'LOCATION_DECK','POS_FACEDOWN')).join('')+add(KURIBOH,1,'LOCATION_DECK','POS_FACEDOWN')+'Debug.ReloadFieldEnd()';
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
try{
 engine.start([],[],8000,8000,0,271828,[],[],setup+'\n'+generated.stdout,0);engine.core.startDuel(engine.h);let state=engine.advance();
 for(let i=0;i<100&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());
 const own=state.players[0].monsters.filter(Boolean),theirs=state.players[1].monsters.filter(Boolean);
 const balls=own.filter(c=>c.code===BALL);assert.equal(balls.length,3);
 for(const c of balls)assert.deepEqual([c.attack,c.defense],[1150,600],'each Mega Thunderball gains 400 ATK from the two others, DEF unchanged');
 const kuriboh=own.find(c=>c.code===KURIBOH);assert.deepEqual([kuriboh.attack,kuriboh.defense],[300,200],'non-Thunder monsters are unaffected');
 assert.deepEqual([theirs[0].attack,theirs[0].defense],[750,600],'opponent Thunder monsters are unaffected');
 assert.deepEqual(engine.errors.filter(x=>x.trim()),[]);
 console.log('PASS Overcharge: +200 ATK per other face-up Thunder you control; DEF, non-Thunders and the opponent unaffected');
}finally{try{engine.destroy()}catch{}}
