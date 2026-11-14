// Discord #cpu-improvement (2026-11-14): "CPU damages itself with Ultimate Offering and only summons once. It skips
// summoning for the turn as well." Idle "activates" entries carry no position, so the policy read a face-up Ultimate
// Offering as face-down and paid 500 LP for a summon before its free Normal Summon. It now spends the Normal Summon
// first, and every 500 LP it pays is followed by a summon.
import fs from 'node:fs';import assert from 'node:assert/strict';import {MobileDuel,M} from './web/duel.js';
const read=f=>JSON.parse(fs.readFileSync(new URL('./web/'+f,import.meta.url)));
const meta=read('content.json'),data=read('engine-data.json'),scripts=read('scripts.json'),id=n=>meta.cards.find(c=>c.name===n).id;
const e=await new MobileDuel([...meta.cards,...(meta.tokenCards||[])]).init([data,scripts]);
const cpuDeck=Array.from({length:40},(_,i)=>i%5===0?'Ultimate Offering':i%5===1?'Summoned Skull':'Vorse Raider').map(id);
e.start(Array(40).fill(id('Battle Ox')),cpuDeck,8000,8000,5,1,[],[],'',5,null,null);
for(let step=0;e.pending&&step<400&&e.turn<=4;step++)e.respond(e.auto(e.pending));
const logs=[...e.logs].reverse(),start=logs.indexOf('Turn 4 · Opponent’s turn');
assert.ok(start>=0,'the duel reached the CPU turn with Ultimate Offering set');
const turn=logs.slice(start+1,logs.findIndex((l,i)=>i>start&&/^Turn /.test(l))>>>0);
const summons=turn.filter(l=>/^Opponent (\w+ Summons|sets)/.test(l)).length,pays=turn.filter(l=>l==='Opponent pays 500 LP.').length;
assert.ok(summons>=1,'it summoned');
assert.ok(turn.findIndex(l=>/^Opponent (\w+ Summons|sets)/.test(l))<turn.indexOf('Opponent pays 500 LP.')||pays===0,'the free Normal Summon comes before any 500 LP payment');
assert.equal(pays,summons-1,'each 500 LP paid buys exactly one extra summon');
e.destroy();
console.log('ultimate offering cpu ok',{summons,pays});
