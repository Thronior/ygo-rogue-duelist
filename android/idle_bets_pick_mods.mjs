// Shadow Betting character upgrades: pick each character's relics, curses and signature card by simulation.
// User, 2026-11-26: "emulate duels with each character with 10 different combinations and keep the ones that gave the
// most of an increase in winrate (across the same seeds)".
//
// Input: the candidates file from `tools/build_shadow_betting_mods.py --candidates <file>` (10 combinations per
// character, the first being the strategy pick, plus every duel script). Each character plays SEEDS duels with no
// upgrades and SEEDS duels with each combination fully bought (signature card in hand, 3 relics, 3 curses on the
// opponent), against the same opponents, decks, seats and seeds every time; the combination with the most wins is kept.
// Output: tools/shadow-betting-mod-picks.json, read by the plain build.
//
// Usage: runtime/ai/node.exe android/idle_bets_pick_mods.mjs android/web <candidates.json> <picks.json> [seeds=40] [threads]
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {pathToFileURL} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';

if(isMainThread){
 const [web,candPath,outPath,seedArg,threadArg]=process.argv.slice(2);
 const seeds=Number(seedArg)||40,threads=Number(threadArg)||Math.max(1,os.cpus().length-2);
 const cand=JSON.parse(fs.readFileSync(candPath,'utf8'));const ids=Object.keys(cand.chars).slice(0,Number(process.env.LIMIT)||Infinity);
 const results={};let done=0;const t0=Date.now();
 await Promise.all(Array.from({length:threads},(_,w)=>new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{workerData:{web,candPath,seeds,ids:ids.filter((_,i)=>i%threads===w),all:ids}});
  worker.on('message',m=>{results[m.cid]=m;done++;process.stdout.write(`\r${done}/${ids.length} characters · ${Math.round((Date.now()-t0)/1000)}s   `)});
  worker.on('error',reject);worker.on('exit',resolve)})));
 const picks={};
 for(const cid of ids){const r=results[cid];if(!r)continue;const best=r.wins.reduce((b,w,i)=>w>r.wins[b]?i:b,0),[relics,curses,card]=cand.chars[cid].combos[best];
  picks[cid]={relics,curses,card,base:r.base,best:r.wins[best],combo:best,wins:r.wins,seeds}}
 fs.writeFileSync(outPath,JSON.stringify(picks,null,0).replace(/\},"/g,'},\n"'));
 const gain=Object.values(picks).map(p=>p.best-p.base);
 console.log(`\n${Object.keys(picks).length} characters, ${seeds} seeds each: average win rate ${(100*Object.values(picks).reduce((a,p)=>a+p.base,0)/Object.keys(picks).length/seeds).toFixed(1)}% -> ${(100*Object.values(picks).reduce((a,p)=>a+p.best,0)/Object.keys(picks).length/seeds).toFixed(1)}% fully upgraded; the strategy pick won ${Object.values(picks).filter(p=>p.combo===0).length} times; ${gain.filter(g=>g<=0).length} characters gain nothing -> ${outPath}`);
}else{
 const {web,candPath,seeds,ids,all}=workerData;const read=n=>JSON.parse(fs.readFileSync(path.join(web,n),'utf8'));
 const M=await import(pathToFileURL(path.join(web,'idle-bets-model.js')));
 const {MobileDuel}=await import(pathToFileURL(path.join(web,'duel.js')));const {recordDuel}=await import(pathToFileURL(path.join(web,'idle-bets-sim.js')));
 const meta=read('content.json'),data=read('engine-data.json'),scripts=read('scripts.json'),cand=JSON.parse(fs.readFileSync(candPath,'utf8'));
 const cards=[...meta.cards,...(meta.tokenCards||[])];
 const decksOf=id=>(meta.cpuWatchDecks[id]||[]).map((r,tier)=>({r,tier})).filter(x=>x.r?.main?.length);
 const hash=s=>[...String(s)].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
 for(const cid of ids){
  const mine=decksOf(cid),opps=all.filter(x=>x!==cid&&decksOf(x).length),start=hash(cid);
  // The same duels for every configuration: opponent, decks, seats and seed depend only on the duel number.
  const duels=Array.from({length:seeds},(_,i)=>{const o=opps[(start+i*7)%opps.length],od=decksOf(o);return {o,me:mine[i%mine.length],op:od[(start+i*3)%od.length],seat:i%2,seed:7000+i}});
  const play=async combo=>{let wins=0;
   const mods={chars:{},relics:cand.relics,curses:cand.curses};if(combo)mods.chars[cid]={card:combo[2],field:combo[3],relics:combo[0],curses:combo[1]};M.registerMods(mods);
   const s=M.newState();if(combo)s.chars[cid]={card:combo[2]?1:0,relics:combo[0],curses:combo[1]};
   for(const d of duels){const ids2=d.seat===0?[cid,d.o]:[d.o,cid],dk=d.seat===0?[d.me,d.op]:[d.op,d.me];
    const dm=M.duelMods(s,ids2);
    try{const engine=await new MobileDuel(cards).init([data,scripts]);const tl=recordDuel(engine,dk.map(x=>x.r),[{id:+ids2[0],tier:dk[0].tier},{id:+ids2[1],tier:dk[1].tier}],d.seed,{lp:dm.lp,passives:dm.passives});if(tl.winner===d.seat)wins++}catch{}}
   return wins};
  const base=await play(null),wins=[];for(const c of cand.chars[cid].combos)wins.push(await play(c));
  parentPort.postMessage({cid,base,wins})}
}
