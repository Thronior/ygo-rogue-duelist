#!/usr/bin/env node
// Smallest complete use of the Dueling AI: two .ydk decks, the AI plays both sides.
// See docs/DUELING-AI.md. Usage:
//   node tools/dueling_ai_demo.mjs [deck-a.ydk] [deck-b.ydk] [seed]
import fs from 'node:fs';
import {MobileDuel} from '../android/web/duel.js';
import {shuffleCPUDeck} from '../android/web/cpu-deck-model.js';

const root = new URL('../', import.meta.url);
const readJson = path => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8').replace(/^\uFEFF/, ''));

// .ydk: card IDs under #main and #extra, one per copy. !side and comments are ignored.
function readYdk(file) {
  const deck = {main: [], extra: []};
  let section = null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '#main' || line === '#extra') section = line.slice(1);
    else if (line.startsWith('!')) section = null;
    else if (section && /^\d+$/.test(line)) deck[section].push(Number(line));
  }
  return deck;
}

const [deckA = 'data/decks/bonz-tier-1.ydk', deckB = 'data/decks/espa-roba-tier-1.ydk', seedArg] = process.argv.slice(2);
const decks = [readYdk(deckA), readYdk(deckB)];
const seed = Number(seedArg ?? Date.now()) >>> 0;

// 1. Card metadata: names, text and stats. The AI reads names and text to recognise cards.
const cards = readJson('data/cards.json');
const known = new Set(cards.map(card => card.id));
const missing = decks.flatMap(deck => [...deck.main, ...deck.extra]).filter(id => !known.has(id));
if (missing.length) throw new Error(`These card IDs are not in data/cards.json: ${[...new Set(missing)].join(', ')}`);

// 2. Engine resources: per-card engine data and the Lua card scripts.
const resources = [readJson('android/web/engine-data.json'), readJson('android/web/scripts.json')];
const duel = await new MobileDuel(cards).init(resources);

// 3. Start a duel: 8000 LP each, 5-card opening hands. The engine draws the Main Decks in the
// order given, so shuffle them first. The same seed always replays the same duel.
const main = decks.map((deck, seat) => shuffleCPUDeck(deck.main, seed, seat));
let state = duel.start(main[0], main[1], 8000, 8000, 5, seed, decks[0].extra, decks[1].extra);

// 4. Whenever the engine waits for a decision, ask the AI and send its answer back.
let decisions = 0;
while (!state.finished && decisions < 5000) {
  state = duel.respond(duel.auto());
  decisions++;
}

const winner = state.finished?.player;
console.log(`Seed ${seed}: ${state.finished ? (winner === 0 || winner === 1 ? `player ${winner} (${[deckA, deckB][winner]}) wins` : 'draw') : 'stopped without a result'}`);
console.log(`Turns: ${state.turn}, decisions: ${decisions}, LP: ${state.lp.join(' / ')}`);
duel.destroy();
