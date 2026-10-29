// Name Changer: every monster in your hand, Deck, GY and on the field is also treated as the chosen archetype,
// in the real core (Discord 2026-10-29: Rite of Spirit with Gravekeeper's).
import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';import {MobileDuel,M} from './web/duel.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./web/'+name+'.json',import.meta.url),'utf8'));
const meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const id=name=>meta.cards.find(c=>c.name===name).id;
const script=run=>{const r=spawnSync(fileURLToPath(new URL('../python/python.exe',import.meta.url)),['-B','-c',`import passives;print(passives.script(${JSON.stringify(run)},telemetry=False))`],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout};
const RITE=id('Rite of Spirit'),VORSE=id('Vorse Raider');
const add=(code,player,loc,pos,seq=0)=>`Debug.AddCard(${code},${player},${player},${loc},${seq},${pos})\n`;
const setup='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n'+add(RITE,0,'LOCATION_SZONE','POS_FACEDOWN')+add(VORSE,0,'LOCATION_GRAVE','POS_FACEUP')+
 [VORSE,VORSE].map(c=>add(c,0,'LOCATION_DECK','POS_FACEDOWN')).join('')+add(VORSE,1,'LOCATION_DECK','POS_FACEDOWN')+'Debug.ReloadFieldEnd()';
async function riteOffered(run){
 const engine=await new MobileDuel(meta.cards).init([data,scripts]);
 try{
  engine.start([],[],8000,8000,0,271828,[],[],setup+'\n'+script(run),0);engine.core.startDuel(engine.h);let state=engine.advance();
  for(let i=0;i<100&&!(state.pending?.type===M.SELECT_IDLECMD&&state.pending.player===0);i++)state=engine.respond(engine.auto());
  return state.pending.activates.some(c=>c.code===RITE);
 }finally{engine.destroy()}
}
const base={character:0,curses:[]};
assert.equal(await riteOffered({...base,artifacts:[]}),false,'Vorse Raider is not a Gravekeeper\'s monster by itself');
assert.equal(await riteOffered({...base,artifacts:['name_changer'],name_changes:[0x2e]}),true,'with Name Changer it is, even in the GY');
console.log('PASS Name Changer makes GY monsters count as the chosen archetype for Rite of Spirit');
