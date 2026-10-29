import fs from 'node:fs';import assert from 'node:assert/strict';
// draftOrder now calls shared helpers (search filter, frame/level/name default order, attribute order and
// relic-aware deck stats), so the extracted body runs against the real helper modules.
import {frameLevelName,deckStats,attributeOrder} from './web/feedback-ui.js';
const src = fs.readFileSync(new URL('./web/mobile.js', import.meta.url), 'utf8');
const start = src.indexOf('function draftOrder(');
assert(start >= 0, 'draftOrder missing');
let depth = 0, end = -1, open = src.indexOf('{', start);
for (let i = open; i < src.length; i++) {
  if (src[i] === '{') depth++;
  if (src[i] === '}') { depth--; if (!depth) { end = i; break; } }
}
const body = src.slice(open + 1, end);
const MON = [
  { name: 'Zebra', data: { type: 0x11, attribute: 1, race: 0 }, type: 'Normal', race: 'Beast', atk: 1500, defense: 1200, level: 4 },
  { name: 'Apple', data: { type: 2 }, type: '', race: '', atk: 0, defense: 0, level: 0 },
  { name: 'Mango', data: { type: 4 }, type: '', race: '', atk: 0, defense: 0, level: 0 },
  { name: 'Zebra', data: { type: 0x11, attribute: 1, race: 0 }, type: 'Normal', race: 'Beast', atk: 1500, defense: 1200, level: 4 },
  { name: 'Beta', data: { type: 0x21, attribute: 32, race: 0 }, type: 'Effect', race: 'Dragon', atk: 2500, defense: 2000, level: 7 },
].map((c, i) => ({ ...c, id: 10 + i, desc: '' }));
const card = id => MON[id - 10];
const pool = [10, 11, 12, 13, 14], selected = [0, 4];
const helpers = { matchesSearch: () => true, frameLevelName, deckStats, attributeOrder, state: { run: { artifacts: [] } }, content: { artifactInfo: {} } };
const run = (tab, sort) => new Function('card', 'draftTab', 'draftSort', 'pool', 'selected', ...Object.keys(helpers), body)(card, tab, sort, pool, selected, ...Object.values(helpers));
// Default is frame (Normal, Effect, ..., Spell, Trap), then level, then name since v0.1.85 (was first-seen grouping).
assert.deepEqual(run('All', 'Default'), [0, 3, 4, 1, 2]);
assert.deepEqual(run('Monster', 'Default'), [0, 3, 4]);
assert.deepEqual(run('Spell', 'Default'), [1]);
assert.deepEqual(run('Deck', 'Default'), [0, 4]);
assert.deepEqual(run('All', 'Name'), [1, 4, 2, 0, 3]);
assert.deepEqual(run('All', 'ATK'), [4, 0, 3, 1, 2]);
assert.deepEqual(run('All', 'Type'), [4, 0, 3, 1, 2]);
assert.deepEqual(run('All', 'Newest'), [4, 0, 3, 2, 1]);
assert.deepEqual(run('All', 'Attribute'), [0, 3, 4, 1, 2]);
console.log('PASS mobile draft tabs + sorts');
