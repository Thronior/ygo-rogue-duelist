// Behaviour flags of 2026-11-26, evening (build 0.2.46). Replays the flagged duels up to the CPU's decision and checks what
// today's policy answers there. Skipped when the review folder is not on this machine.
// 38896d7b: Obelisk's cost Tributed Obelisk itself instead of Twin-Headed Behemoth, throwing away a lethal attack.
// b394b63c: Newdoria destroyed the monster that had already attacked; the other one then attacked for lethal.
// 170d9f3c: Juragedo was Tributed for a boost that still left Snipe Hunter below the attacker.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M} from './web/duel.js';import {parse} from './web/replays.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const folder='D:/Codex Exports/Replay exports/2026-11-26-review-2/replays/';
if(!fs.existsSync(folder)){console.log('SKIP flags nov26b: review folder not present');process.exit(0);}
const meta=json('android/web/content.json'),cards=[...meta.cards,...(meta.tokenCards||[])];
const duel=await new MobileDuel(cards).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
const file=prefix=>fs.readdirSync(folder).find(f=>f.startsWith(prefix));
function answerAt(prefix,step){
 const rec=parse(gunzipSync(fs.readFileSync(folder+file(prefix))).toString());
 duel.start(...rec.start);
 for(let i=0;i<rec.responses.length;i++){
  const m=duel.pending,r=rec.responses[i];assert(m,`no prompt at ${i}`);
  if(r.type===8&&r.index==null&&m.type!==M.SELECT_CHAIN)continue;
  if(m.type===M.SELECT_CHAIN&&r.type!==8){duel.respond({type:8,index:null});i--;continue;}
  if(i===step){assert.equal(m.player,1,'the CPU answers this prompt');return {prompt:m,answer:duel.auto()};}
  duel.respond(r);
 }
 throw Error(`step ${step} not reached`);
}
const obelisk=answerAt('38896d7b',253);
assert.equal(obelisk.prompt.type,M.SELECT_UNSELECT_CARD);
assert.notEqual(duel.name((obelisk.prompt.select_cards[obelisk.answer.index]||{}).code),'Obelisk the Tormentor','Obelisk never Tributes itself');
const newdoria=answerAt('b394b63c',138);
assert.deepEqual(newdoria.answer.indicies,[1],'Newdoria takes the monster that can still attack');
const juragedo=answerAt('170d9f3c',58);
assert.equal(juragedo.answer.index,null,'no Juragedo Tribute that still loses the battle');
// dd0bd09e: with the player's field empty, Flying Penguin was Tributed in Main Phase 2 to Set Rude Kaiser (user: keep attacking).
const kaiser=answerAt('dd0bd09e',160),k=kaiser.prompt,a=kaiser.answer;
const picked=a.action===3?k.monster_sets?.[a.index]:a.action===0?k.summons?.[a.index]:null;
assert.notEqual(duel.name(picked?.code),'Rude Kaiser','no Tribute of the unopposed attacker for a slightly bigger monster');
console.log('PASS flags nov26b: Obelisk keeps itself, Newdoria takes the live attacker, no losing Juragedo Tribute, no weak Tribute Set against an empty field');
