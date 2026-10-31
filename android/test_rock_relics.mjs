// Granite Heart and Restless Stone in real engine duels: Rock monsters only, and only for their owner.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,".")\nimport passives\nprint(passives.script(dict(character=0,artifacts=${JSON.stringify(artifacts)},round=0,curses=[])))`],{cwd:root}).toString();
const cards=json('data/era-cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const ROCK=13039848,VORSE=14898066; // Giant Soldier of Stone, Vorse Raider

const idle=(duel,state)=>{for(let guard=0;guard<200&&!state.finished;guard++){const m=duel.pending;if(m.player===0&&m.type===M.SELECT_IDLECMD)return state;state=duel.respond(duel.auto())}throw Error('no idle prompt')};
const place=(duel,action,index)=>{let state=duel.respond({type:R.SELECT_IDLECMD,action,index});for(let guard=0;guard<40&&!(duel.pending?.player===0&&duel.pending.type===M.SELECT_IDLECMD);guard++)state=duel.respond(duel.auto());return state};
async function firstTurn(artifacts,code,action,list){
 const duel=await new MobileDuel(cards).init(engine);
 let state=idle(duel,duel.start(Array(40).fill(code),Array(40).fill(VORSE),8000,8000,5,7,[],[],script(artifacts),0));
 state=place(duel,action,duel.pending[list].findIndex(c=>c.code===code));
 return {duel,moves:duel.pending.pos_changes||[],atk:duel.query(0,L.MZONE).find(Boolean)?.attack};
}
const summon=[I.SELECT_SUMMON,'summons'],set=[I.SELECT_MONSTER_SET,'monster_sets'];

let row=await firstTurn([],ROCK,...summon);
assert.equal(row.moves.length,0,'a Summoned monster normally cannot change position');
row=await firstTurn([],ROCK,...set);
assert.equal(row.moves.length,0,'a Set monster normally cannot change position');
row=await firstTurn(['restless_stone'],ROCK,...summon);
assert.equal(row.moves.length,1,'Rock can change position the turn it is Summoned');
row.duel.respond({type:R.SELECT_IDLECMD,action:I.SELECT_POS_CHANGE,index:0});
assert.equal(row.duel.pending.player,0);
assert.ok(row.duel.query(0,L.MZONE).find(Boolean).position&12,'the position change resolves');
row=await firstTurn(['restless_stone'],ROCK,...set);
assert.equal(row.moves.length,1,'Rock can change position the turn it is Set');
row=await firstTurn(['restless_stone'],VORSE,...summon);
assert.equal(row.moves.length,0,'other Types are unaffected');
const base=(await firstTurn([],ROCK,...summon)).atk,boosted=(await firstTurn(['stone'],ROCK,...summon)).atk;
assert.equal(boosted-base,300,'Granite Heart adds 300 ATK');
assert.equal((await firstTurn(['stone'],VORSE,...summon)).atk,1900,'other Types keep their ATK');
console.log('PASS Granite Heart and Restless Stone affect Rock monsters only, in real engine duels');
