// Draft relics work for their owner from either seat (Nori, Discord 2026-11-21; user 2026-11-22): Mulligan's Offer lets
// only its owner choose and the owner draws; a relic's Special Summon lands on its owner's field; Broke Man's Rulebook
// makes both players open with 1 card whichever human owns it.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const { MobileDuel, M, R, L } = await import(new URL('./web/duel.js', import.meta.url));
const json = file => JSON.parse(fs.readFileSync(path.join(root,file), 'utf8').replace(/^﻿/, ''));
const meta = json('android/web/content.json'), data = json('android/web/engine-data.json'), scripts = json('android/web/scripts.json');
const id = name => meta.cards.find(c => c.name === name).id;
const python = fs.existsSync(path.join(root,'python/python.exe')) ? path.join(root,'python/python.exe') : 'python';
const py = code => execFileSync(python, ['-B','-c',code], { cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } }).trim();
const lua = (keys, side) => py(`import passives,draft_relics,json; print(passives.multiplayer_script(dict(draft_relics._base(0),artifacts=${JSON.stringify(keys)}),${side}))`);
const fill = name => Array(40).fill(id(name));
const query = (e,p,zone) => e.query(p,zone).filter(Boolean);

async function duel({script, decks, turns, driver}) {
  const e = await new MobileDuel([...meta.cards,...meta.tokenCards]).init([data,scripts]);
  let state = e.start(...decks,8000,8000,5,5,[],[],script), steps = 0;
  while (!state.finished && e.pending && e.turn<=turns && ++steps<3000) state = e.respond(driver?.(e,e.pending) || e.auto());
  assert(steps<3000,'duel failed to progress');
  assert.deepEqual(e.errors||[],[],'script errors');
  return e;
}

for (const owner of [0,1]) {
  // Mulligan's Offer: the owner returns 2 cards at their first Standby Phase and draws 2; the other human is never asked.
  const other = 1-owner, prompts = [];
  let handBefore = null;
  const e = await duel({script: lua(['cursed_mulligans_offer'],owner), decks: [fill('Waboku'),fill('Waboku')], turns: owner+1, driver(e,m) {
    if (m.type===M.SELECT_CARD && m.selects?.length && m.selects.every(c=>c.location===L.HAND)) {
      prompts.push(m.player);
      if (m.player===owner) { handBefore = query(e,owner,L.HAND).length; return {type:R.SELECT_CARD,indicies:[0,1]}; }
    }
  }});
  assert.deepEqual(prompts,[owner],`only the owner (seat ${owner}) chooses, got ${prompts}`);
  assert(handBefore!==null);
  e.destroy();
  console.log(`PASS Mulligan's Offer asks only its owner in seat ${owner}`);
  void other;
}

for (const owner of [0,1]) {
  // The Creator's Special Summon lands on its owner's field, not the other human's.
  const scriptText = lua(['token_defender'],owner);
  const e = await duel({script: scriptText, decks: [fill('Waboku'),fill('Waboku')], turns: 2});
  const mine = query(e,owner,L.MZONE).length, theirs = query(e,1-owner,L.MZONE).length;
  assert(mine>=1 && theirs===0, `Token Defender's token is on seat ${owner}'s field (${mine} vs ${theirs})`);
  e.destroy();
  console.log(`PASS Token Defender summons for its owner in seat ${owner}`);
}

// Broke Man's Rulebook: both players open with 1 card whichever seat owns it.
for (const owner of [0,1]) {
  const relics = owner ? [[],['rulebook']] : [['rulebook'],[]];
  const out = JSON.parse(py(`import draft_relics,json; print(json.dumps(draft_relics.duel_setup(dict(relics=${JSON.stringify(relics)},characters=[0,0],decks=[{'main':[]},{'main':[]}],seed=1))))`));
  assert.equal(out.draw,1); assert.equal(out.enemyDraw,1);
}
console.log('PASS Broke Man’s Rulebook gives both players 1 card from either seat');

// Stars Aligned picks a player it works out itself (the turn player). Flipping that at run time sent the summon to the
// other field (behaviour flag 18fd8685, 2026-11-22: the CPU's copy summoned the player's monster to its side). Only the
// owner is asked, from their own hand, and the monster lands on the owner's field.
for (const owner of [0,1]) {
  const OX=id('Battle Ox'), FOOLISH=id('Foolish Burial'), prompts=[];
  const deck = Array.from({length:40},(_,n)=>n%3===2?FOOLISH:OX);
  const pick = (m,list,code,action) => { const at=(m[list]||[]).findIndex(c=>c.code===code); return at<0?null:{type:R.SELECT_IDLECMD,action,index:at}; };
  const e = await duel({script: lua(['stars_aligned'],owner), decks: [deck,deck], turns: owner+1, driver(e,m) {
    // The owner sends a Battle Ox to the GY, summons one, then ends the turn (the relic needs both at the same Level).
    if (m.player===owner && m.type===M.SELECT_IDLECMD && e.turn===owner+1)
      return (!query(e,owner,L.GRAVE).some(c=>c.code===OX)&&pick(m,'activates',FOOLISH,5)) || (!query(e,owner,L.MZONE).length&&pick(m,'summons',OX,0)) || {type:R.SELECT_IDLECMD,action:7,index:null};
    if (m.player===owner && m.type===M.SELECT_CARD && m.selects?.every(c=>c.location===L.DECK)) return {type:R.SELECT_CARD,indicies:[m.selects.findIndex(c=>c.code===OX)]};
    if (m.type===M.SELECT_CARD && m.selects?.length && m.selects.every(c=>c.location===L.HAND)) {
      prompts.push([m.player,...new Set(m.selects.map(c=>c.controller))].join(':'));
      return {type:R.SELECT_CARD,indicies:[0]};
    }
  }});
  assert.deepEqual(prompts,[`${owner}:${owner}`],`only the owner (seat ${owner}) chooses, from their own hand: ${prompts}`);
  assert.equal(query(e,owner,L.MZONE).filter(c=>c.code===OX).length,2,`the second Battle Ox lands on seat ${owner}'s field`);
  assert(query(e,1-owner,L.MZONE).length<=1,'the relic adds nothing to the other field (at most its own Normal Summon)');
  e.destroy();
}
console.log('PASS Stars Aligned summons from its owner\'s hand to its owner\'s field in either seat');
