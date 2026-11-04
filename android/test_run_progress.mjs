// Run progress strip between duels: the run card's VICTORIES row for the run in progress (run-progress.js).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runProgress,runProgressMarkup} from './web/run-progress.js';
import {runCardData,runDuels,bossDuel} from './web/run-card.js';

const content=JSON.parse(fs.readFileSync(new URL('./web/content.json',import.meta.url),'utf8'));
const deps={content};
const duel=(n,opponent,won=true,lp=8000,loop=1)=>({duel:n,loop,opponent,won,lp_before_healing:lp,lp_after_healing:lp,coins:0,turns:5});
const states=r=>runProgress(r,deps).map(x=>x.state).join(' ');
const name=id=>content.characters[id].name;

assert.deepEqual([1,2,3,6,9].map(bossDuel),[false,false,true,true,true]);

// Between Duel 4 and Duel 5: four wins with the Duel 3 boss behind, the next duel ringed, the rest ahead.
const mid={round:4,loop:0,timeline:[duel(1,9),duel(2,75,true,6200),duel(3,83),duel(4,1,true,3100)]};
assert.equal(states(mid),'won won won won next ahead ahead ahead ahead');
assert.deepEqual(runProgress(mid,deps).map(x=>x.boss),[false,false,true,false,false,true,false,false,true]);
const html=runProgressMarkup(mid,deps);
assert.match(html,/aria-label="Run progress: 4 of 9 victories, Duel 5 next"/);
assert.match(html,/<b class="run-strip-count">4 \/ 9<\/b>/);
assert.match(html,/style="--n:9;--done:4"/,'the track fills up to the next duel');
assert.match(html,new RegExp(`<i class="won boss" title="Duel 3 · ${name(83)} · Win · 8,000 LP · Boss">`));
assert.match(html,/<i class="next" title="Duel 5 · Next duel">/);
assert.match(html,/<i class="ahead boss" title="Duel 6 · Boss">/);
assert.equal((html.match(/<i /g)||[]).length,9);
assert.doesNotMatch(runProgressMarkup(mid,deps),/compact/);
assert.match(runProgressMarkup(mid,deps,{compact:true}),/^<div class="run-strip compact"/);

// The first duel of a run: nothing won, the track empty.
assert.equal(states({round:0,timeline:[]}),'next ahead ahead ahead ahead ahead ahead ahead ahead');
assert.match(runProgressMarkup({round:0,timeline:[]},deps),/--done:0".*0 \/ 9/);

// A later loop shows only that loop's duels, not the nine won in the loop before.
const loop2={round:2,loop:1,timeline:[...Array.from({length:9},(_,i)=>duel(i+1,9)),duel(1,75,true,8000,2),duel(2,1,true,8000,2)]};
assert.equal(states(loop2),'won won next ahead ahead ahead ahead ahead ahead');
assert.match(runProgressMarkup(loop2,deps),new RegExp(`title="Duel 2 · ${name(1)} · Win`));

// Runs from before the timeline existed still mark the duels already played.
assert.equal(states({round:3,timeline:[]}),'won won won next ahead ahead ahead ahead ahead');
assert.match(runProgressMarkup({round:3,timeline:[]},deps),/title="Duel 2 · Win"/);

// A recorded loss stays red if the run goes on, and all nine won leaves no next duel (the encore).
assert.equal(states({round:2,timeline:[duel(1,9),duel(2,75,false,0)]}),'won lost next ahead ahead ahead ahead ahead ahead');
const done={round:9,timeline:Array.from({length:9},(_,i)=>duel(i+1,9))};
assert.equal(states(done),'won won won won won won won won won');
assert.match(runProgressMarkup(done,deps),/aria-label="Run progress: 9 of 9 victories"/);
assert.match(runProgressMarkup(done,deps),/--done:8"/);

// One source for both: the run card's duels are runDuels() for the latest loop.
const card=runCardData({...mid,stage:'gameover',character:35,round:4,timeline:[...mid.timeline,duel(5,41,false,0)]},{...deps,character:content.characters[35],card:()=>null,cardImage:x=>x,relicImage:x=>x});
assert.deepEqual(card.duels,runDuels({timeline:[...mid.timeline,duel(5,41,false,0)]},{content,played:5}).duels);
assert.equal(card.duels[4].won,false);

console.log('run progress ok');
