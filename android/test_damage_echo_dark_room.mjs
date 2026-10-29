// Damage Echo with Dark Room of Nightmare must not ping-pong (each reacting to the other's damage) until the
// opponent dies: one burn gives one Echo and one Dark Room hit (user check 2026-10-29).
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M,R,I} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=name=>meta.cards.find(c=>c.name===name).id;
const script=run=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script(${JSON.stringify(run)},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const ROOM=id('Dark Room of Nightmare'),HINOTAMA=id('Hinotama'),FILL=id('Vorse Raider');
const add=(code,player,loc,pos,seq=0)=>`Debug.AddCard(${code},${player},${player},${loc},${seq},${pos})\n`;
const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,99999,0,0)\n'+add(ROOM,0,'LOCATION_SZONE','POS_FACEUP')+add(HINOTAMA,0,'LOCATION_HAND','POS_FACEDOWN')+
 [FILL,FILL].map(c=>add(c,0,'LOCATION_DECK','POS_FACEDOWN')).join('')+add(FILL,1,'LOCATION_DECK','POS_FACEDOWN')+'Debug.ReloadFieldEnd()';
const engine=await new MobileDuel(meta.cards).init([data,scripts]);
try{
 engine.start([],[],8000,99999,0,271828,[],[],setup+'\n'+script({character:0,curses:[],artifacts:['static_coil']}),0);engine.core.startDuel(engine.h);let state=engine.advance();
 for(let i=0;i<100&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());
 const index=state.pending.activates.findIndex(c=>c.code===HINOTAMA);assert(index>=0,'Hinotama can be activated');
 const before=engine.lp[1];state=engine.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index});
 for(let i=0;i<200&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0)&&!engine.finished;i++)state=engine.respond(engine.auto());
 assert(!engine.finished,'the duel did not end from a damage loop');
 // Dark Room only answers card damage, and the Echo is a relic: Hinotama 500, Dark Room 300, Echo 200 on each.
 assert.equal(before-engine.lp[1],500+300+200+200,'one exchange, then it stops');
}finally{engine.destroy()}
console.log('PASS Damage Echo and Dark Room of Nightmare stop after one exchange');
