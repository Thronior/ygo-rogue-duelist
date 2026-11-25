// Behaviour flags of 2026-11-25 (review 3, build 0.2.45). Replays the two flagged duels up to the CPU's decision and checks
// what today's policy answers there. Skipped when the review folder is not on this machine.
// cc774753: the CPU's Dust Tornado already targeted the player's Nightmare Wheel (a Continuous Trap) when the player chained
//           it; the CPU then also chained Seven Tools of the Bandit, wasting the card and 1000 LP. It must pass.
// 3c08eea2: Flying Kamakiri #1 died in battle and the CPU floated Twin-Headed Behemoth into face-up Attack Position, which
//           Ryu Kokki ran over for lethal; without it only a face-down monster was left. It must decline.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {MobileDuel,M} from './web/duel.js';import {parse} from './web/replays.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const folder='D:/Codex Exports/Replay exports/2026-11-25-review-3/replays/';
if(!fs.existsSync(folder)){console.log('SKIP flags nov25c: review folder not present');process.exit(0);}
const meta=json('android/web/content.json'),cards=[...meta.cards,...(meta.tokenCards||[])];
const duel=await new MobileDuel(cards).init([json('android/web/engine-data.json'),json('android/web/scripts.json')]);
// The run's randomized cards are not in the replay; a stand-in with the same card type keeps the responses legal.
function answerAt(file,step,map={}){
 const rec=parse(gunzipSync(fs.readFileSync(folder+file)).toString());
 for(const k of [0,1,6,7])if(Array.isArray(rec.start[k]))rec.start[k]=rec.start[k].map(c=>map[c]||c);
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
const tools=answerAt('cc774753c263b8caa9ca57d08385a2f2ccb5e200b618fd72e5c0fddbc3441bb1.ygr',71);
assert.equal(tools.prompt.type,M.SELECT_CHAIN);
assert.equal(tools.answer.index,null,'Seven Tools is not chained onto a Nightmare Wheel our Dust Tornado already destroys');
const kamakiri=answerAt('3c08eea2525587207b526f9d275eadbacdcc3c9f99154dc39002f11cbcad96fd.ygr',167,{191000001:12607053});
assert.equal(duel.name(kamakiri.prompt.code),'Flying Kamakiri #1');
assert.equal(kamakiri.answer.yes,false,'Flying Kamakiri #1 does not float a monster that Ryu Kokki runs over for lethal');
console.log('PASS flags nov25c: Seven Tools vs a doomed Continuous Trap, Flying Kamakiri float into lethal');
