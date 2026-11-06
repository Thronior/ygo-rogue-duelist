#!/usr/bin/env node
// Rule coverage for a decklist: for every distinct card, how often the CPU policy files name it, its card text,
// and whether the Collector banlist allows its copies. Cards named nowhere have no CPU rule: they fall back to
// duel.js generic guesses (which refuse any effect whose text says "destroy"). Dev tool, never bundled.
// Usage: coverage.mjs <deck: pasted decklist .txt | .ydk | deck .json>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..', '..');
const {decklistToYdk, parseYdk, cardCatalog} = await import(new URL('../sim_core.mjs', import.meta.url).href);

const file = process.argv[2];
if (!file) { console.error('Usage: coverage.mjs <deck .txt|.ydk|.json>'); process.exit(1); }
const raw = fs.readFileSync(file, 'utf8');
const deck = file.endsWith('.json') ? JSON.parse(raw) : parseYdk(decklistToYdk(raw) ?? raw, path.basename(file), cardCatalog());
const web = path.join(ROOT, 'android', 'web');
const meta = JSON.parse(fs.readFileSync(path.join(web, 'content.json'), 'utf8'));
const cards = new Map(meta.cards.map(c => [Number(c.id), c]));
const scripts = JSON.parse(fs.readFileSync(path.join(web, 'scripts.json'), 'utf8'));
const limits = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'collector-banlist.json'), 'utf8')).names;
const POLICY = ['smart_policy.js', 'deck_policy.js', 'cpu-combos.js', 'cpu-card-plans.js', 'duel.js', 'battle-planner.js'];
const sources = Object.fromEntries(POLICY.map(f => [f, fs.readFileSync(path.join(web, f), 'utf8')]));
const count = (text, n) => text.split(n).length - 1;

const copies = new Map();
for (const id of [...deck.main, ...deck.extra]) copies.set(id, (copies.get(id) || 0) + 1);
const kind = t => t & 0x40 ? 'Fusion' : t & 0x80 ? 'Ritual' : t & 1 ? (t & 0x20 ? 'Effect' : 'Normal') : t & 2 ? 'Spell' : t & 4 ? 'Trap' : '?';
const rows = [...copies].map(([id, n]) => {
  const c = cards.get(id) || {}, t = Number(c.data?.type) || 0;
  const hits = Object.fromEntries(POLICY.map(f => [f, count(sources[f], c.name)]).filter(([, v]) => v));
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  return {id, n, name: c.name, kind: kind(t), level: c.data?.level, stats: t & 1 ? `${c.data?.attack}/${c.data?.defense}` : '', race: c.race, total, hits,
    limit: limits[c.name] ?? 3, lua: !!scripts[`c${id}.lua`], text: (c.desc || '').replace(/\s+/g, ' ')};
}).sort((a, b) => a.total - b.total || String(a.name).localeCompare(String(b.name)));

console.log(`${path.basename(file)}: ${deck.main.length} Main / ${deck.extra.length} Extra, ${rows.length} distinct cards\n`);
for (const r of rows) {
  const tag = r.total === 0 ? (r.kind === 'Normal' ? 'vanilla' : 'NO RULE') : r.total <= 2 ? 'few mentions' : 'covered';
  console.log(`${tag.padEnd(12)} ${String(r.n)}x ${r.name} [${r.id}] ${r.kind}${r.level ? ` L${r.level}` : ''} ${r.stats} ${r.race || ''}`);
  console.log(`             mentions: ${r.total ? Object.entries(r.hits).map(([f, v]) => `${f} ${v}`).join(', ') : 'none'}${r.lua ? '' : ' | NO LUA SCRIPT'}${r.n > r.limit ? ` | OVER COLLECTOR LIMIT (${r.n} > ${r.limit})` : ''}`);
  if (r.total <= 2 && r.kind !== 'Normal') console.log(`             text: ${r.text.slice(0, 330)}`);
}
const over = rows.filter(r => r.n > r.limit);
if (over.length) console.log(`\nOver the Collector banlist: ${over.map(r => `${r.name} ${r.n}/${r.limit}`).join(', ')}. A game deck needs a user-approved limit_exceptions entry.`);
