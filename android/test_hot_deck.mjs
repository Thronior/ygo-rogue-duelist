// Hot Deck in the real core: every draw by the opponent also mills that many cards from their Deck.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {MobileDuel,M,R,I,L} from './web/duel.js';
const root=fileURLToPath(new URL('../',import.meta.url)),json=p=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''));
const meta=json('android/web/content.json'),data=json('android/web/engine-data.json');
const id=n=>{const c=meta.cards.find(c=>c.name===n);assert(c,n);return c.id};
const python=fs.existsSync(root+'python/python.exe')?root+'python/python.exe':'python';
const script=artifacts=>execFileSync(python,['-B','-c',`import sys;sys.path.insert(0,'.');import passives;print(passives.script(${JSON.stringify({curses:[],artifacts,challenge_level:0}).replace(/null/g,'None')}))`],{cwd:root,encoding:'utf8'});
const e=await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,json('android/web/scripts.json')]);
const OX=id('Battle Ox'),POT=id('Pot of Greed');
const until=turn=>{for(let i=0;i<220&&e.turn<turn&&e.pending&&!e.finished;i++)e.respond(e.auto())};
const piles=p=>[L.DECK,L.GRAVE].map(l=>e.core.duelQueryCount(e.h,p,l));
const run=(mine,enemy,relics)=>{e.start(mine,enemy,8000,8000,5,3,[],[],script(relics));return piles(1)};
const ox=Array(40).fill(OX),idle=player=>{for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==player);i++)e.respond(e.auto());return e.pending};
assert.deepEqual(run(ox,ox,[]),[35,0],'baseline: an opening hand of 5');
assert.deepEqual(run(ox,ox,['hot_deck']),[35,0],'the opening hand does not mill');
idle(1);assert.deepEqual(piles(1),[33,1],'Draw Phase: 1 drawn and 1 milled');assert.equal(piles(0)[1],0,'the owner never mills');
// Pot of Greed: 2 drawn and 2 milled on top of the Draw Phase, and the Pot reaches the GY.
run(ox,Array(40).fill(POT),['hot_deck']);const m=idle(1),k=m.activates.findIndex(x=>x.code===POT);assert(k>=0,'Pot of Greed can be activated');
e.respond({type:R.SELECT_IDLECMD,action:I.SELECT_ACTIVATE,index:k});for(let i=0;i<12&&e.pending&&e.pending.type!==M.SELECT_IDLECMD;i++)e.respond(e.auto());
assert.deepEqual(piles(1),[29,4],'1+1 in the Draw Phase, 2+2 from the Pot, plus the Pot itself');
// A short Deck: milling takes what is left, and the duel ends on the next failed draw.
const short=Array(7).fill(OX);let s=e.start(ox,short,8000,8000,5,3,[],[],script(['hot_deck']));
for(let i=0;i<60&&(e.pending?.type!==M.SELECT_IDLECMD||e.pending?.player!==1)&&!s.finished;i++)s=e.respond(e.auto());
assert.deepEqual(piles(1),[0,1],'the last card is milled without an error');assert.ok(!s.finished,'an empty Deck alone does not end the duel');
for(let i=0;i<300&&!s.finished&&e.pending;i++)s=e.respond(e.auto());
assert.ok(s.finished,'the next draw ends the duel');assert.equal(s.finished.player,0,'the relic owner wins by deck-out');
assert.deepEqual(e.errors,[],'no script errors');console.log('PASS Hot Deck: opening hand, Draw Phase, card effects, owner only, deck-out win',JSON.stringify(s.finished));process.exit(0);
