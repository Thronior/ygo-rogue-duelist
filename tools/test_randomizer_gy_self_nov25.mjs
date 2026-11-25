// A randomized monster whose effect is used from the GY or from banishment can be activated there (Discord Nov 25,
// "Marshmallon": "Once per turn: You can Special Summon this card from your GY, then swap its original ATK and DEF.",
// reported as not working after it was discarded). The cards come from tools/test_randomizer_nonsense_nov25.py
// --engine-cards: that effect, a plain GY revive, and the banished Dinosaur revive, which was an ignition effect on the
// field (it never worked) before its Lua was given LOCATION_REMOVED. Each plays a duel where its deck is that card; a
// Standby Phase script sends (or banishes) the top 3 cards, and on the first Main Phase the card there must be
// activatable and land on the field.
//   runtime/ai/node.exe tools/test_randomizer_gy_self_nov25.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from '../android/web/duel.js';
import {M, R, L, I} from '../android/web/engine.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'android', 'web');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const file = path.join(os.tmpdir(), `randomizer-gy-self-${process.pid}.json`);
execFileSync(path.join(ROOT, 'python', 'python.exe'), [path.join(ROOT, 'tools', 'test_randomizer_nonsense_nov25.py'), '--engine-cards', file], {stdio: 'inherit'});
const cards = readJson(file);
fs.rmSync(file, {force: true});

const meta = readJson(path.join(WEB, 'content.json'));
const data = readJson(path.join(WEB, 'engine-data.json'));
const scripts = readJson(path.join(WEB, 'scripts.json'));
scripts['randomizer.lua'] = fs.readFileSync(path.join(ROOT, 'data', 'randomizer', 'randomizer.lua'), 'utf8');
for (const {card, script} of cards) { data[card.id] = card.data; scripts[`c${card.id}.lua`] = script; }
const engine = await new MobileDuel([...meta.cards, ...(meta.tokenCards || []), ...cards.map(g => g.card)]).init([data, scripts]);
const normals = meta.cards.filter(c => c.data && c.data.type & 0x10 && c.data.type & 1 && c.level <= 4);
const move = where => `-- SHADOW_RUN_RNG 2\ndo local e=Effect.GlobalEffect() e:SetType(EFFECT_TYPE_FIELD|EFFECT_TYPE_CONTINUOUS) e:SetCode(EVENT_PHASE_START|PHASE_STANDBY) e:SetCountLimit(1) e:SetOperation(function() ${where === 'banished' ? 'Duel.Remove(Duel.GetDecktopGroup(0,3),POS_FACEUP,REASON_EFFECT)' : 'Duel.DiscardDeck(0,3,REASON_EFFECT)'} end) Duel.RegisterEffect(e,0) end`;

const fails = [];
for (const {card, where} of cards) {
  const loc = where === 'banished' ? L.REMOVED : L.GRAVE;
  engine.errors.length = 0;
  let state = engine.start(Array(40).fill(card.id), Array.from({length: 40}, (_, i) => normals[i % normals.length].id), 8000, 8000, 5, 7, [], [], move(where));
  let offered = null, steps = 0;
  while (!state.finished && steps++ < 500 && state.turn <= 2 && offered === null) {
    const m = engine.pending;
    let response = null;
    if (m.type === M.SELECT_IDLECMD && m.player === 0) {
      const there = engine.query(0, loc).some(c => c?.code === card.id);
      if (!there) { fails.push(`${card.desc}: no copy reached the ${where} pile`); break; }
      const i = m.activates.findIndex(c => c.code === card.id && c.location === loc);
      offered = i >= 0;
      if (i >= 0) response = {type: R.SELECT_IDLECMD, action: I.SELECT_ACTIVATE, index: i};
    }
    state = engine.respond(response || engine.auto());
  }
  for (let i = 0; i < 60 && engine.pending && engine.pending.type !== M.SELECT_IDLECMD; i++) state = engine.respond(engine.auto());
  const landed = engine.query(0, L.MZONE).find(c => c?.code === card.id);
  console.log(`${where}: ${card.desc} | offered ${offered}, on the field ${!!landed} (${landed?.attack}/${landed?.defense})`);
  if (!offered) fails.push(`${card.desc}: not activatable from the ${where} pile`);
  else if (!landed) fails.push(`${card.desc}: activated, but the card did not reach the field`);
  if (card.desc.includes('swap') && landed && (landed.attack !== 1400 || landed.defense !== 2000)) fails.push(`${card.desc}: ATK/DEF not swapped (${landed.attack}/${landed.defense})`);
  if (engine.errors.length) fails.push(`${card.desc}: Lua errors ${engine.errors.slice(0, 2).join(' | ')}`);
}
engine.destroy?.();
for (const f of fails) console.log('FAIL', f);
if (fails.length) process.exit(1);
console.log(`PASS: ${cards.length} randomized effects used from the GY or banishment reach the field`);
