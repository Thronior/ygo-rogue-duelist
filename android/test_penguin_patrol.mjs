// Penguin Patrol: A Legendary Ocean drops Nightmare Penguin to Level 3, so Tiny Courage boosts it, inside the real core.
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=name=>meta.cards.find(c=>c.name===name).id;
const script=artifacts=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script({'character':18,'artifacts':${JSON.stringify(artifacts)},'curses':[]},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const PENGUIN=id('Nightmare Penguin'),OCEAN=id('A Legendary Ocean'),KURIBOH=id('Kuriboh');
const add=(code,player,loc,pos,seq=0)=>`Debug.AddCard(${code},${player},${player},${loc},${seq},${pos})\n`;
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
function penguin(ocean,artifacts){
 const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+add(PENGUIN,0,'LOCATION_MZONE','POS_FACEUP_ATTACK')+(ocean?add(OCEAN,0,'LOCATION_SZONE','POS_FACEUP',5):'')+
  [KURIBOH,KURIBOH,KURIBOH].map(c=>add(c,0,'LOCATION_DECK','POS_FACEDOWN')).join('')+add(KURIBOH,1,'LOCATION_DECK','POS_FACEDOWN')+'Debug.ReloadFieldEnd()';
 engine.start([],[],8000,8000,0,271828,[],[],setup+'\n'+script(artifacts),0);engine.core.startDuel(engine.h);let state=engine.advance();
 for(let i=0;i<100&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());
 const c=state.players[0].monsters.find(x=>x?.code===PENGUIN);assert.deepEqual(engine.errors.filter(x=>x.trim()),[]);engine.destroy();return {level:c.level,attack:c.attack};
}
try{
 // Nightmare Penguin also boosts WATER monsters you control, itself included.
 const alone=penguin(false,[]),aloneRelic=penguin(false,['small']),ocean=penguin(true,[]),oceanRelic=penguin(true,['small']);
 assert.equal(alone.level,4);assert.equal(aloneRelic.attack,alone.attack,'Level 4 on its own: no Tiny Courage boost');
 assert.equal(ocean.level,3,'A Legendary Ocean lowers it to Level 3');
 assert.equal(oceanRelic.attack,ocean.attack+400,'with A Legendary Ocean, Tiny Courage adds 400');
 console.log(`PASS Penguin Patrol: A Legendary Ocean lowers Nightmare Penguin to Level 3, so Tiny Courage adds 400 ATK (${alone.attack} alone, ${oceanRelic.attack} with both)`);
}finally{try{engine.destroy()}catch{}}
