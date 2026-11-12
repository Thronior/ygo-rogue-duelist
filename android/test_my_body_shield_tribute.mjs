// My Body as a Shield answers the opponent's Tribute to the Doomed (Discord 2026-11-12, Dragunfire: could not activate it).
// Staged in the real core: the CPU (player 1) holds Tribute to the Doomed and a card to discard; the player has a
// monster and My Body as a Shield Set. The player must be offered My Body as a Shield in answer, and it must negate.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
let t='Debug.ReloadFieldBegin(DUEL_MODE_MR1,2)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n';
t+=add('Summoned Skull',0,'LOCATION_MZONE','POS_FACEUP_ATTACK');
t+=add('My Body as a Shield',0,'LOCATION_SZONE','POS_FACEDOWN');
t+=add('Tribute to the Doomed',1,'LOCATION_HAND','POS_FACEDOWN');t+=add('Battle Ox',1,'LOCATION_HAND','POS_FACEDOWN');
for(let i=0;i<10;i++){t+=add('Battle Ox',0,'LOCATION_DECK','POS_FACEDOWN');t+=add('Battle Ox',1,'LOCATION_DECK','POS_FACEDOWN')}
const e=await new MobileDuel(all).init([read('engine-data'),read('scripts')]);
e.start([],[],8000,8000,0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
const SHIELD=id('My Body as a Shield'),TTD=id('Tribute to the Doomed');let offered=false,activated=false,trace=[];
for(let i=0;i<300&&e.pending&&!e.finished&&e.turn<=2;i++){
 const m=e.pending;trace.push(`T${e.turn} P${m.player} ${m.type}`);
 if(m.player===1){
  // The CPU plays Tribute to the Doomed on its first chance.
  if(m.type===M.SELECT_IDLECMD){const at=(m.activates||[]).findIndex(c=>c.code===TTD);if(at>=0){e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:at});continue}}
  e.respond(e.auto());continue}
 // The only chain the player can answer on the CPU's turn is Tribute to the Doomed's activation.
 if(m.type===M.SELECT_CHAIN&&e.turn===2&&m.selects.some(c=>c.code===SHIELD)){offered=activated=true;e.respond({type:R.SELECT_CHAIN,index:m.selects.findIndex(c=>c.code===SHIELD)});continue}
 e.respond(e.auto());
}
const skull=e.query(0,L.MZONE).some(c=>c&&c.code===id('Summoned Skull')),ttdUsed=e.query(1,L.GRAVE).some(c=>c&&c.code===TTD);
console.log({offered,activated,skullAlive:skull,ttdInGY:ttdUsed,lp:e.lp});
if(!offered)console.log(trace.slice(-30).join(' | '));
assert(ttdUsed,'the CPU activated Tribute to the Doomed');assert(offered,'My Body as a Shield was offered in answer');assert(skull,'Summoned Skull survived');
console.log('PASS My Body as a Shield answers Tribute to the Doomed');e.destroy();process.exit(0);
