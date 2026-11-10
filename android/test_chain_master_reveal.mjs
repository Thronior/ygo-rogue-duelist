// Amazoness Chain Master looks at the whole opponent hand, then takes a monster (Discord 2026-11-10, Prunk44: only monsters were shown).
// The reveal window was skipped whenever a hand pick followed; it is now skipped only when the pick lists every revealed card.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I,B,L} from './web/duel.js';
import {revealInPick} from './web/duel-presentation.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url),'utf8'));
const meta=read('content'),all=[...meta.cards,...meta.tokenCards];
const id=n=>{const c=all.find(c=>c.name===n);assert(c,n);return c.id};
let checks=0;const ok=(v,why)=>{assert(v,why);checks++};
const add=(n,o,loc,pos,seq=0)=>`Debug.AddCard(${id(n)},${o},${o},${loc},${seq},${pos})\n`;
let t='Debug.ReloadFieldBegin(DUEL_MODE_MR1,1)\nDebug.SetPlayerInfo(0,8000,0,0)\nDebug.SetPlayerInfo(1,8000,0,0)\n';
t+=add('Amazoness Chain Master',0,'LOCATION_MZONE','POS_FACEUP_ATTACK');
t+=add('Vorse Raider',1,'LOCATION_MZONE','POS_FACEUP_ATTACK');
// Cards the CPU cannot play first: a Level 8 without tributes, Polymerization without Fusions, a Ritual Spell without its monster.
const hand=['Blue-Eyes White Dragon','Polymerization','Black Luster Ritual'];
for(const n of hand)t+=add(n,1,'LOCATION_HAND','POS_FACEDOWN');
for(let i=0;i<10;i++){t+=add('Battle Ox',0,'LOCATION_DECK','POS_FACEDOWN');t+=add('Battle Ox',1,'LOCATION_DECK','POS_FACEDOWN')}
const e=await new MobileDuel(all).init([read('engine-data'),read('scripts')]);
e.start([],[],8000,8000,0,271828,[],[],t+'Debug.ReloadFieldEnd()\n',0);e.core.startDuel(e.h);e.advance();
let reveal=null,pick=null,attacked=false;
for(let i=0;i<200&&e.pending&&!e.finished&&!pick;i++){
 const m=e.pending;
 if(m.player!==0){e.respond(e.auto());continue}
 for(const v of e.visuals.splice(0))if(v.kind==='reveal'&&v.audience===0)reveal=v;
 if(m.type===M.SELECT_IDLECMD){e.respond({type:R.SELECT_IDLECMD,action:m.to_bp&&!attacked?I.TO_BP:I.TO_EP,index:null});continue}
 if(m.type===M.SELECT_BATTLECMD){const a=m.attackable?.findIndex(c=>c.code===id('Amazoness Chain Master'));if(!attacked&&a>=0){attacked=true;e.respond({type:R.SELECT_BATTLECMD,action:B.ATTACK,index:a});}else e.respond({type:R.SELECT_BATTLECMD,action:B.TO_EP,index:null});continue}
 if(m.type===M.SELECT_CHAIN){const k=m.selects.findIndex(c=>c.code===id('Amazoness Chain Master'));e.respond({type:R.SELECT_CHAIN,index:k>=0?k:null});continue}
 if(m.type===M.SELECT_CARD&&m.selects.some(c=>c.controller===1&&c.location===L.HAND)){pick=m;break}
 e.respond(e.auto());
}
ok(pick,'Chain Master asks for a card from the opponent hand');
ok(reveal,'the whole hand is revealed to the player');
const inHand=e.query(1,L.HAND).filter(Boolean),monster=code=>(all.find(c=>c.id===code)?.data?.type&1)===1;
ok(reveal.cards.length===inHand.length,`every hand card is revealed (${reveal.cards.length} of ${inHand.length})`);
ok(reveal.cards.some(c=>c.code===id('Polymerization'))&&reveal.cards.some(c=>c.code===id('Black Luster Ritual')),'Spells are revealed too');
ok(pick.selects.every(c=>monster(c.code))&&pick.selects.length<reveal.cards.length,'only monsters can be taken');
ok(!revealInPick(reveal.cards,pick.selects),'so the reveal window is not skipped');
// Cards that pick from the whole revealed hand still skip the duplicate window.
ok(revealInPick(reveal.cards,reveal.cards.map(c=>({...c}))),'a pick listing every revealed card still skips it');
e.destroy();
console.log(`PASS Amazoness Chain Master reveal (${checks} checks)`);
