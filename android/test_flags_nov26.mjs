// Behaviour flags of 2026-11-26 (build 0.2.46). Replays the flagged duels up to the CPU's decision and checks what today's
// policy answers there. Skipped when the review folder is not on this machine.
// 1761eff9: the CPU chained Ready for Intercepting on Kycoo, the player's only attacker, then also chained Waboku. It must pass.
// d94caeeb: Negate Attack came back to the CPU's hand and was never Set again, because the last back-row zone was kept free
//           for a Spell the hand did not hold. It must be Set.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M} from './web/duel.js';import {parse} from './web/replays.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const folder='D:/Codex Exports/Replay exports/2026-11-26-review-1/replays/';
if(!fs.existsSync(folder)){console.log('SKIP flags nov26: review folder not present');process.exit(0);}
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
const waboku=answerAt('1761eff9',138);
assert.equal(waboku.prompt.type,M.SELECT_CHAIN);
assert.equal(waboku.answer.index,null,'no Waboku on top of our own Ready for Intercepting on the only attacker');
const negate=answerAt('d94caeeb',61);
assert.equal(negate.prompt.type,M.SELECT_IDLECMD);
assert.equal(negate.answer.action,4,'Negate Attack is Set when the hand holds no Spell');
console.log('PASS flags nov26: no Waboku after Ready for Intercepting, returned Negate Attack is Set again');
