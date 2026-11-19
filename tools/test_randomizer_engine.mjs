// Plays randomized cards in the real duel engine (2026-11-15). Both duelists use the game's CPU, except that
// they always prefer to Summon, Set and activate randomized cards (and Polymerization / Ritual Spells for them),
// so every card's effect gets used. Any Lua error, rejected answer or stalled duel is a failure.
//   node tools/test_randomizer_engine.mjs <cards.json> [duels per group] [cards per group]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MobileDuel} from '../android/web/duel.js';
import {M,R} from '../android/web/engine.js';
import {shuffleCPUDeck} from '../android/web/cpu-deck-model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'android', 'web');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const [file, duelsArg, groupArg] = process.argv.slice(2);
const DUELS = Number(duelsArg) || 30, GROUP = Number(groupArg) || 12;
const {cards} = readJson(file);
const meta = readJson(path.join(WEB, 'content.json'));
const data = readJson(path.join(WEB, 'engine-data.json'));
const scripts = readJson(path.join(WEB, 'scripts.json'));
scripts['randomizer.lua'] = fs.readFileSync(path.join(ROOT, 'data', 'randomizer', 'randomizer.lua'), 'utf8');
for (const {card, script} of cards) { data[card.id] = card.data; scripts[`c${card.id}.lua`] = script; }
const engine = await new MobileDuel([...meta.cards, ...(meta.tokenCards || []), ...cards.map(c => c.card)]).init([data, scripts]);
const NEUTRAL = '-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';
const POLY = 24094653;
const isRand = code => code >= 191000000 && code < 192000000;
const byId = new Map(cards.map(c => [c.card.id, c]));

// Material and filler monsters from the game's pool.
const pool = meta.cards.filter(c => c.data && c.data.type & 1 && !(c.data.type & 0x40c0));
const normals = pool.filter(c => c.data.type & 0x10 && c.atk >= 0);
const RACE = {}; for (const c of meta.cards) if (c.data && c.data.type & 1) RACE[c.race] = Number(c.data.race);
function matches(mat, c) {
  const d = c.data, race = Number(d.race);
  return mat.k === 'code' ? c.id === mat.v : mat.k === 'race' ? race === mat.v : mat.k === 'attr' ? d.attribute === mat.v
    : mat.k === 'low' ? d.level <= 4 : mat.k === 'high' ? d.level >= 5 : mat.k === 'normal' ? !!(d.type & 0x10) : false;
}
let rng = 12345; const rand = n => { rng = (Math.imul(rng, 1103515245) + 12345) >>> 0; return rng % n; };
function deckFor(group) {
  const main = [], extra = [];
  for (const {card} of group) {
    const t = card.data.type;
    if (t & 0x40) { extra.push(card.id, card.id); main.push(POLY, POLY);
      for (const mat of card.randomized.materials || []) { const fit = pool.filter(c => matches(mat, c)); for (let i = 0; i < 2; i++) main.push(fit[rand(fit.length)].id); }
    } else main.push(card.id, card.id, card.id);
  }
  // Cards that Fusion Summon (like Polymerization) need a Fusion Monster to make: Flame Swordsman and its materials.
  if (group.some(({parts}) => parts?.acts?.some(p => p.k.startsWith('fusion_summon')))) {
    extra.unshift(45231177, 45231177); main.unshift(34460851, 34460851, 44287299, 44287299);
  }
  // Cards a randomized card names: Exodia pieces, Destiny Board / Sarcophagus pieces and its monster, Huge Revolution's
  // trio, a Great Dezard evolution. Time Wizard tosses coins for "a coin toss lands on Heads".
  for (const {parts} of group) for (const p of [...(parts?.acts || []), ...(parts?.conds || [])]) {
    for (const code of [...(p.pieces || []), ...(p.codes || []), p.payoff, p.code].filter(Boolean)) main.push(code, code);
    if (p.k === 'coin_heads') main.push(71625222, 71625222);
  }
  // Fillers: Level 4 or lower Normal Monsters of many Types, so searches and Tributes have something to use.
  while (main.length < 40) main.push(normals[rand(normals.length)].id);
  return {main: main.slice(0, 60), extra: extra.slice(0, 15)};
}

const stats = new Map(cards.map(c => [c.card.id, {activated: 0, summoned: 0, set: 0, coins: 0, dice: 0, fusions: 0, wins: 0, errors: []}]));
const failures = [];
let chainCodes = [], lastRand = null;
const prevOnMessage = engine.onMessage;
engine.onMessage = function (m) {
  if (m.type === M.CHAINING) { chainCodes.push(m.code); if (isRand(m.code)) { stats.get(m.code).activated++; lastRand = m.code; } }
  if (m.type === M.CHAIN_END) chainCodes = [];
  // Instant wins from randomized cards use their own reason (randomizer.lua R.WIN_REASON).
  // Exodia, Destiny Board and countdowns win outside a chain: credit the group's card that has a win block.
  if (m.type === M.WIN && Number(m.reason) === 0x60) { const code = chainCodes.findLast?.(isRand) || lastRand || currentGroup.find(c => c.parts?.acts?.some(p => WIN_ACTS.has(p.k)))?.card.id; if (stats.get(code)) stats.get(code).wins++; else failures.push({kind: 'win without a card', reason: m.reason}); }
  if ((m.type === M.SUMMONING || m.type === M.SPSUMMONING || m.type === M.FLIPSUMMONING) && isRand(m.code)) stats.get(m.code).summoned++;
  if (m.type === M.TOSS_COIN && isRand(chainCodes.at(-1))) stats.get(chainCodes.at(-1)).coins++;
  if (m.type === M.TOSS_DICE && isRand(chainCodes.at(-1))) stats.get(chainCodes.at(-1)).dice++;
  if (m.type === M.SPSUMMONING && data[m.code]?.type & 0x40 && isRand(chainCodes.at(-1))) stats.get(chainCodes.at(-1)).fusions++;
  return prevOnMessage?.call(this, m);
};
const WIN_ACTS = new Set(['win', 'final_countdown', 'last_turn', 'exodia_head', 'destiny_board']);
let currentGroup = [];
const supports = code => code === POLY || (byId.get(code)?.card.randomized.ritual_for);
function choose() {
  const m = engine.pending, list = engine.choices(m);
  const find = f => list.find(f);
  let pick;
  if (rand(10) < 9) switch (m.type) {
    case M.SELECT_IDLECMD: {
      const flipOrTrap = c => { const t = byId.get(c.code)?.card.data.type || 0; return t & 0x200000 || t & 4; };
      pick = find(c => isRand(c.code) && c.label.startsWith('Activate')) || find(c => supports(c.code) && c.label.startsWith('Activate'))
        || find(c => isRand(c.code) && c.label.startsWith('Special')) || find(c => isRand(c.code) && flipOrTrap(c) && c.label.startsWith('Set'))
        || find(c => isRand(c.code) && c.label.startsWith('Summon')) || find(c => isRand(c.code) && c.label.startsWith('Set'));
      break;
    }
    case M.SELECT_CHAIN: pick = find(c => isRand(c.code)); break;
    case M.SELECT_EFFECTYN: case M.SELECT_YESNO: if (isRand(m.code)) pick = list[0]; break;
    case M.ANNOUNCE_RACE: {
      const available = BigInt(m.available);
      let race = 1n;
      while ((available & race) === 0n) race <<= 1n;
      pick = {response: {type: R.ANNOUNCE_RACE, races: [race]}};
      break;
    }
  }
  const chosen = pick ? pick.response : engine.auto();
  const label = (pick || list.find(c => c.response === chosen))?.label || String(chosen?.type);
  recent.push(`${m.type}:${label}`); if (recent.length > 24) recent.shift();
  return chosen;
}
const recent = [];

const groups = [];
for (let i = 0; i < cards.length; i += GROUP) groups.push(cards.slice(i, i + GROUP));
let duels = 0, finished = 0, capped = 0;
for (const group of groups) {
  currentGroup = group;
  for (let d = 0; d < DUELS; d++) {
    const a = deckFor(group), b = deckFor(group), seed = 1000 + d * 7919;
    // One line per duel on stderr, so a run stuck inside one engine call shows which cards it was on.
    if (process.env.RANDOMIZER_PROGRESS) process.stderr.write(`group ${groups.indexOf(group)} duel ${d} cards ${group.map(c => c.card.id).join(',')}\n`);
    engine.errors.length = 0; chainCodes = []; lastRand = null; duels++;
    let state, steps = 0;
    try {
      // Every third duel starts low on LP so 'LP 2000 or less' and 'less LP than your opponent' conditions come up.
      const lp = [8000, 1900, 3000][d % 3], lp2 = [8000, 6000, 3000][d % 3];
      state = engine.start(shuffleCPUDeck(a.main, seed, 0), shuffleCPUDeck(b.main, seed, 1), lp, lp2, 5, seed, a.extra, b.extra, NEUTRAL);
      while (!state.finished && steps < 6000 && state.turn <= 40) {
        const before = engine.errors.length;
        let response = choose();
        try { state = engine.respond(response); }
        catch (error) { failures.push({kind: 'rejected', seed, card: lastRand, error: String(error.message || error)}); state = engine.respond(engine.auto()); }
        if (engine.errors.length > before) for (const text of engine.errors.slice(before)) {
          const code = Number(/c(19\d{7})\.lua/.exec(text)?.[1]) || chainCodes.findLast?.(isRand) || lastRand;
          (stats.get(code)?.errors || failures).push(text.slice(0, 300));
          if (!stats.get(code)) failures.push({kind: 'lua', seed, error: text.slice(0, 300)});
        }
        steps++;
      }
      if (state.finished) finished++; else capped++;
      if (steps >= 6000) failures.push({kind: 'stall', seed, turn: state.turn, cards: group.map(c => c.card.id), recent: [...recent]});
    } catch (error) {
      failures.push({kind: 'crash', seed, card: lastRand, cards: group.map(c => c.card.id), recent: [...recent], error: String(error.stack || error).slice(0, 400)});
    } finally { try { engine.destroy(); } catch {} }
  }
}
const rows = cards.map(c => ({id: c.card.id, name: c.card.name, type: c.card.type, ...stats.get(c.card.id), errors: stats.get(c.card.id).errors.length, firstError: stats.get(c.card.id).errors[0]}));
const report = {duels, finished, capped, failures, cards: rows};
const out = file.replace(/\.json$/, '.engine.json');
fs.writeFileSync(out, JSON.stringify(report, null, 1));
const bad = rows.filter(r => r.errors);
console.log(`${duels} duels (${finished} finished, ${capped} hit the turn cap), ${failures.length} other failures, ${bad.length}/${rows.length} cards with Lua errors`);
for (const r of rows) console.log(`${r.errors ? 'FAIL' : 'ok  '} ${r.id} ${r.name.padEnd(32)} ${r.type.padEnd(22)} activated ${r.activated}, summoned ${r.summoned}, coins ${r.coins}, dice ${r.dice}${r.wins ? ', wins ' + r.wins : ''}${r.errors ? ' :: ' + r.firstError : ''}`);
for (const f of failures.slice(0, 10)) console.log('  ', JSON.stringify(f));
console.log('report:', out);
