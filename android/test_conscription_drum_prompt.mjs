// Conscription Drum (Discord 2026-11-11) works exactly like a permanent Double Summon with no activation:
// 2 Normal Summons or Sets per turn in any mix (Summon then Set too), with no "Normal Summon or Resolve effect"
// prompt, and never a third. Without the relic it is 1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';

const root=fileURLToPath(new URL('../',import.meta.url));
const json=path=>JSON.parse(fs.readFileSync(root+path,'utf8').replace(/^﻿/,''));
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,".")\nimport passives\nprint(passives.script(dict(curses=[],artifacts=${JSON.stringify(artifacts)})))`],{cwd:root}).toString();
const cards=json('data/cards.json'),engine=[json('android/web/engine-data.json'),json('android/web/scripts.json')];
const VORSE=14898066,UPSTART=70368879,DOUBLE_SUMMON=43422537;
assert(!cards.some(c=>c.id===DOUBLE_SUMMON),'Double Summon is not in the game, so it never clashes with the relic');

// Player 0's first turn: make the planned plays ('summon' / 'set') while they are offered, then end the turn.
// Returns what was done, the monsters on the field (face-down count) and every option prompt player 0 saw.
async function firstTurn(artifacts,plan){
 const duel=await new MobileDuel(cards).init(engine);
 let state=duel.start(Array(40).fill(VORSE),Array(40).fill(UPSTART),8000,8000,5,7,[],[],script(artifacts),0);
 const done=[],options=[];let offeredAfter=null;
 for(let guard=0;guard<500&&!state.finished;guard++){
  const m=duel.pending;let response=duel.auto();
  if(m.player===0&&m.type===M.SELECT_OPTION)options.push((m.options||[]).map(Number));
  if(m.player===0&&m.type===M.SELECT_IDLECMD){
   const next=plan[done.length];
   if(next==='summon'&&m.summons.length)response={type:R.SELECT_IDLECMD,action:I.SELECT_SUMMON,index:0};
   else if(next==='set'&&m.monster_sets.length)response={type:R.SELECT_IDLECMD,action:I.SELECT_MONSTER_SET,index:0};
   else{offeredAfter={summons:m.summons.length,sets:m.monster_sets.length};response={type:R.SELECT_IDLECMD,action:m.to_ep?I.TO_EP:I.TO_BP,index:null}}
   if(response.action===I.SELECT_SUMMON||response.action===I.SELECT_MONSTER_SET)done.push(next);
  }
  state=duel.respond(response);
  if(offeredAfter)break;
 }
 const field=duel.query(0,L.MZONE).filter(Boolean);
 duel.destroy();
 return {done,monsters:field.length,faceDown:field.filter(c=>c.position&0xa).length,options,offeredAfter};
}

const drum=['cursed_conscription_drum'];
let r=await firstTurn(drum,['summon','set']);
assert.deepEqual(r.done,['summon','set'],'Set after a Normal Summon');assert.equal(r.monsters,2);assert.equal(r.faceDown,1);
r=await firstTurn(drum,['set','summon']);
assert.deepEqual(r.done,['set','summon'],'Normal Summon after a Set');assert.equal(r.monsters,2);
r=await firstTurn(drum,['summon','summon','summon']);
assert.deepEqual(r.done,['summon','summon'],'two Normal Summons, never a third');assert.equal(r.monsters,2);
assert.deepEqual(r.offeredAfter,{summons:0,sets:0},'nothing more is offered after two');
assert.deepEqual(r.options,[],'no "Normal Summon or Resolve effect" prompt');
r=await firstTurn(drum,['set','set','set']);
assert.deepEqual(r.done,['set','set'],'two Sets');assert.equal(r.faceDown,2);
r=await firstTurn([],['summon','set']);
assert.deepEqual(r.done,['summon'],'without the relic: one Normal Summon or Set a turn');
console.log('PASS Conscription Drum: like Double Summon with no activation, 2 Normal Summons or Sets a turn in any mix, no prompt, no third; 1 without it');
