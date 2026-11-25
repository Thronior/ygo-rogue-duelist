// Sandbox duels (2026-11-25): every sandbox relic's script (tools/test_sandbox_nov25.py writes them) runs in a short
// duel on the player's seat and on the CPU's seat, started the way mobile.js startSandbox starts one, with the CPU
// policy answering both seats. Also checks the duel client keeps sandbox duels away from saves, stats and coins.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel,M,R,I} from './web/duel.js';
import {shuffleCPUMainDecks} from './web/cpu-deck-model.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('./web/'+n+'.json',import.meta.url))),meta=read('content'),data=read('engine-data'),scripts=read('scripts');
const cases=JSON.parse(fs.readFileSync('temp/sandbox-relic-scripts.json','utf8'));
const id=name=>meta.cards.find(c=>c.name===name).id;
const deck={main:[...Array(16).fill(id('Battle Ox')),...Array(10).fill(id('Mystical Elf')),...Array(8).fill(id('Pot of Greed')),...Array(6).fill(id('Dark Hole'))],extra:[]};
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);const failed=[];let turns=0;
try{for(const c of cases){
 const main=shuffleCPUMainDecks([deck,deck],c.seed);
 let s=e.start(main[0],main[1],8000,8000,c.draw,c.seed,[],[],c.passives,c.enemyDraw);
 for(let i=0;i<220&&s.turn<6&&!s.finished;i++){const m=e.pending;if(!m)break;const r=m.player===0&&m.type===M.SELECT_IDLECMD&&i%3===2?{type:R.SELECT_IDLECMD,action:I.TO_EP,index:null}:e.auto(m);s=e.respond(r)}
 turns+=s.turn;
 if(e.errors.length)failed.push(`${c.relics.map(x=>x.join('+')||'-').join(' vs ')}: ${String(e.errors[0]).slice(0,160)}`);
 // The CPU starts on tails: the player's first turn is skipped.
 if(c.first===1)assert.ok(c.passives.includes('Coin toss: opponent starts'));
}}finally{e.destroy?.()}
assert.deepEqual(failed,[],failed.join('\n'));
console.log(`PASS ${cases.length} sandbox relic cases ran on both seats without script errors (${turns} turns)`);

// The duel client: a sandbox duel never reaches the backend's run, stats, coins, replays or behaviour flags.
const src=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
const body=name=>{const start=src.indexOf(`async function ${name}(`);assert.ok(start>=0,name);let depth=0;for(let i=src.indexOf('{',start);i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'&&!--depth)return src.slice(start,i+1)}};
for(const name of ['openSandbox','startSandbox','finishSandbox','leaveSandbox']){
 const text=body(name),commands=[...text.matchAll(/command\('([^']+)'/g)].map(m=>m[1]);
 assert.ok(commands.every(c=>['cpu-catalog','sandbox-relics','sandbox-setup'].includes(c)),name+' only asks for setup data: '+commands);
 assert.ok(!/recordStat|recordCpuResult|storeReplay|saveRecording|completeDuel/.test(text),name+' records nothing');
}
assert.ok(body('startSandbox').includes('engine.replayRecord=null'),'no replay is kept');
const respond=body('respond');assert.ok(respond.indexOf('if(sandbox)')>=0&&respond.indexOf('if(sandbox)')<respond.indexOf("command('response'"),'responses stay local');
assert.ok(/!py\|\|lesson\|\|sandbox\)return;/.test(src),'no coin milestones');
assert.ok(src.includes('startStats(()=>!cpuViewer&&!lesson&&!sandbox&&'),'no play time');
assert.ok(src.includes("lesson||sandbox||tagUI||cpuViewer"),'no stall flags');
assert.ok(src.includes("'sandbox-setup','sandbox-relics'].includes(statsRequest.action)"),'setup answers skip the state update');
assert.ok(src.includes('if(sandbox){sandbox.saved={...state,run:sandbox.saved.run};state={...state,run:sandbox.run}}'),'the stand-in run survives other commands');
assert.ok(src.includes("(m[4]!=='sandbox'||sandboxUnlocked())"),'menu card waits for a completed run');
console.log('PASS sandbox duels stay local: no responses, results, stats, coins, replays or flags');
