// A randomized monster whose effect is "<cost from the hand>; Special Summon 1 <card> from your hand, Deck, or GY"
// must offer its activation from the hand whenever that card is there to Summon (Discord Nov 24, Goldlibra:
// "Magical Scientist" only offered Summon / Set / Inspect; its Lua took 1 dealt card the text did not name).
// The cards come from tools/test_randomizer_wording_nov24.py --hand-summon-cards: the reported pieces with each hand
// cost and zone, plus every such effect a full deal of 3 seeds made. Each plays in a duel where its deck is that card
// and the card it Summons; on its controller's first Main Phase the hand card must be activatable, and activating it
// must Special Summon the named card.
//   runtime/ai/node.exe tools/test_randomizer_hand_summon_nov24.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from '../android/web/duel.js';
import {M, R, L} from '../android/web/engine.js';
import {shuffleCPUDeck} from '../android/web/cpu-deck-model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'android', 'web');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const file = path.join(os.tmpdir(), `randomizer-hand-summon-${process.pid}.json`);
execFileSync(path.join(ROOT, 'python', 'python.exe'), [path.join(ROOT, 'tools', 'test_randomizer_wording_nov24.py'), '--hand-summon-cards', file], {stdio: 'inherit'});
const {cards} = readJson(file);
fs.rmSync(file, {force: true});

const meta = readJson(path.join(WEB, 'content.json'));
const data = readJson(path.join(WEB, 'engine-data.json'));
const scripts = readJson(path.join(WEB, 'scripts.json'));
scripts['randomizer.lua'] = fs.readFileSync(path.join(ROOT, 'data', 'randomizer', 'randomizer.lua'), 'utf8');
const all = new Map();
for (const c of cards) for (const g of [c.test, c.target].filter(Boolean)) all.set(g.card.id, g);
for (const {card, script} of all.values()) { data[card.id] = card.data; scripts[`c${card.id}.lua`] = script; }
const engine = await new MobileDuel([...meta.cards, ...(meta.tokenCards || []), ...[...all.values()].map(g => g.card)]).init([data, scripts]);
const NEUTRAL = '-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';
const normals = meta.cards.filter(c => c.data && c.data.type & 0x10 && c.data.type & 1 && c.atk >= 0 && c.level <= 4);

const fails = [];
let checked = 0;
for (const {test, target} of cards) {
  const a = test.card.id, b = target?.card.id;
  // the card it Summons: the named one, or for "1 monster" a plain Normal Monster
  const summonable = b || normals[0].id;
  const mine = [...Array(30).fill(a), ...Array(10).fill(summonable)];
  const theirs = Array.from({length: 40}, (_, i) => normals[i % normals.length].id);
  engine.errors.length = 0;
  let state = engine.start(shuffleCPUDeck(mine, 7, 0), shuffleCPUDeck(theirs, 7, 1), 8000, 8000, 5, 7, [], [], NEUTRAL);
  let offered = null, summoned = false, steps = 0, inHand = false, activated = false;
  while (!state.finished && steps++ < 400 && state.turn <= 3) {
    const m = engine.pending;
    let response;
    if (m.type === M.SELECT_IDLECMD && m.player === 0 && !activated) {
      inHand = engine.query(0, L.HAND).some(c => c?.code === a);
      const free = engine.query(0, L.MZONE).slice(0, 5).some(c => !c);
      const there = engine.query(0, L.HAND).concat(engine.query(0, L.GRAVE)).some(c => c?.code === summonable) || engine.deckCount(0) > 0;
      if (inHand && free && there) {
        const pick = engine.choices(m).find(c => c.code === a && c.label.startsWith('Activate'));
        offered = !!pick;
        if (!pick) break;
        response = pick.response; activated = true;
      }
    }
    if (m.type === M.SPSUMMONING && m.code === summonable && activated) summoned = true;
    state = engine.respond(response || engine.auto());
    if (engine.pending?.type === M.SPSUMMONING && engine.pending.code === summonable) summoned = true;
    // "1 monster" may Summon another copy of the card itself
    if (activated && engine.query(0, L.MZONE).some(c => c && (b ? c.code === b : true))) { summoned = true; break; }
  }
  const errors = [...engine.errors];
  try { engine.destroy(); } catch {}
  checked++;
  const why = !inHand ? 'never in the opening hand' : offered === false ? 'activation not offered from the hand'
    : offered === null ? 'no Main Phase to check' : !summoned ? 'activated but did not Special Summon the card' : errors.length ? 'Lua error: ' + errors[0].slice(0, 200) : '';
  console.log(`${why ? 'FAIL' : 'ok  '} ${a} ${test.card.desc.slice(0, 110)}${why ? ' :: ' + why : ''}`);
  if (why) fails.push(a);
}
if (fails.length) { console.log(`${fails.length}/${checked} hand Special Summon effects could not be used`); process.exit(1); }
console.log(`PASS: ${checked} randomized "<cost from the hand>; Special Summon 1 <card> ..." effects offer their activation from the hand and Summon their card`);
