#!/usr/bin/env node
// One PNG per changed CPU deck: the old list (removed copies framed red) beside the current list (added copies
// framed green), with the character portrait and the deck's win rate before and after.
// Usage: deck_diff_images.mjs <old decks folder> <out folder> [baseline report.json]
//   <old decks folder> is a copy of data/decks from before the changes; the current lists come from the game.
//   The baseline report gives the "before" win rate; the newest full or focus report holding the deck gives "after".
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {asset, screenshot} from './tier_images.mjs';
import {loadSettings, listReports, readReport, rateOf} from './sim_core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WEB = path.join(ROOT, 'android', 'web');
const COLS = 8, CARD_W = 78, CARD_H = 114, GAP = 6, PANEL_PAD = 14, HEAD_H = 170, PAD = 28;
const PANEL_W = COLS * CARD_W + (COLS - 1) * GAP + PANEL_PAD * 2;
const WIDTH = PANEL_W * 2 + PAD * 3;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const pct = r => r === null || r === undefined ? '—' : `${(r * 100).toFixed(1)}%`;

function readYdk(file) {
  const out = {main: [], extra: []};
  let zone = 'main';
  for (const raw of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '#main' || line === '#extra') { zone = line.slice(1); continue; }
    if (line === '!side') { zone = null; continue; }
    if (zone && /^\d+$/.test(line)) out[zone].push(Number(line));
  }
  return out;
}

const [oldDirArg, outDirArg, baselineFile] = process.argv.slice(2);
if (!oldDirArg || !outDirArg) { console.error('Usage: deck_diff_images.mjs <old decks folder> <out folder> [baseline report.json]'); process.exit(1); }
// Edge resolves the screenshot path against its own working folder, so pass absolute paths.
const oldDir = path.resolve(oldDirArg), outDir = path.resolve(outDirArg);
const meta = JSON.parse(fs.readFileSync(path.join(WEB, 'content.json'), 'utf8'));
const cards = new Map([...meta.cards, ...meta.tokenCards].map(c => [Number(c.id), c]));
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'card-aliases.json'), 'utf8'));
const canon = id => Number(aliases[id] ?? id);
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'decks', 'index.json'), 'utf8'));
const current = JSON.parse(execFileSync(path.join(ROOT, 'python', 'python.exe'), [path.join(HERE, 'list_active_decks.py')], {cwd: ROOT, maxBuffer: 64 << 20, encoding: 'utf8'})).decks;

// Win rates: the baseline report for "before", the newest report that includes the deck for "after".
const settings = loadSettings();
const rateIn = (report, d) => { const row = report?.decks?.find(x => x.tier === d.tier && x.characterId === d.characterId); return row ? rateOf(row.record.all) : null; };
const baseline = baselineFile ? readReport(settings, baselineFile) : null;
const later = listReports(settings).filter(r => /deck-sim-(full|focus)-/.test(r.file)).map(r => ({file: r.file, report: readReport(settings, r.file)}));

// Monsters by Level (high first), then Spells, then Traps; copies stay together.
const order = id => { const c = cards.get(id) || {}, t = Number(c.data?.type) || 0; return [t & 1 ? 0 : t & 2 ? 1 : 2, -(c.level || 0), c.name || '']; };
const sortIds = ids => [...ids].sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(y[2]) || a - b; });

// Marks `count` copies of each id in `ids` (by canonical card) with the given class.
function mark(ids, diff, cls) {
  const left = new Map(diff);
  return sortIds(ids).map(id => {
    const k = canon(id), n = left.get(k) || 0;
    if (n > 0) { left.set(k, n - 1); return {id, cls}; }
    return {id, cls: ''};
  });
}
const counts = ids => ids.reduce((m, id) => m.set(canon(id), (m.get(canon(id)) || 0) + 1), new Map());
const minus = (a, b) => new Map([...a].map(([k, n]) => [k, n - (b.get(k) || 0)]).filter(([, n]) => n > 0));

function cardImg(id) {
  const file = path.join(WEB, 'assets', 'cards', `${id}.jpg`), alt = path.join(WEB, 'assets', 'cards', `${canon(id)}.jpg`);
  return fs.existsSync(file) ? asset(`assets/cards/${id}.jpg`) : fs.existsSync(alt) ? asset(`assets/cards/${canon(id)}.jpg`) : asset('assets/card-back.jpg');
}

function panel(title, list, extra, note) {
  const rows = Math.ceil(list.length / COLS);
  return {rows, html: `<section class="panel"><h2>${title} <small>${list.length} cards${extra.length ? ` + ${extra.length} Extra` : ''} · ${note}</small></h2>
    <div class="grid">${list.map(c => `<div class="card ${c.cls}"><img src="${cardImg(c.id)}" title="${esc(cards.get(c.id)?.name)}"></div>`).join('')}</div>
    ${extra.length ? `<div class="extra">Extra: ${extra.map(c => `<span class="${c.cls}">${esc(cards.get(c.id)?.name)}</span>`).join(', ')}</div>` : ''}</section>`};
}

fs.mkdirSync(outDir, {recursive: true});
const made = [];
for (const deck of current) {
  const file = (index[deck.deckId] || deck.deckId) + '.ydk';
  const oldFile = path.join(oldDir, file), nowFile = path.join(ROOT, 'data', 'decks', file);
  if (!fs.existsSync(oldFile)) continue;
  const before = readYdk(oldFile), after = readYdk(nowFile);
  const removed = minus(counts(before.main), counts(after.main)), added = minus(counts(after.main), counts(before.main));
  const removedX = minus(counts(before.extra), counts(after.extra)), addedX = minus(counts(after.extra), counts(before.extra));
  if (!removed.size && !added.size && !removedX.size && !addedX.size) continue;
  const n = m => [...m.values()].reduce((a, b) => a + b, 0);
  const left = panel('Before', mark(before.main, removed, 'removed'), mark(before.extra, removedX, 'removed'), `<b class="r">${n(removed) + n(removedX)} removed</b>`);
  const right = panel('After', mark(after.main, added, 'added'), mark(after.extra, addedX, 'added'), `<b class="g">${n(added) + n(addedX)} added</b>`);
  const rows = Math.max(left.rows, right.rows), extraLine = before.extra.length || after.extra.length ? 30 : 0;
  const height = HEAD_H + 46 + rows * CARD_H + (rows - 1) * GAP + PANEL_PAD * 2 + extraLine + PAD;
  const character = meta.characters?.[deck.characterId] || {};
  const rBefore = rateIn(baseline, deck), latest = later.find(r => rateIn(r.report, deck) !== null);
  const rAfter = latest ? rateIn(latest.report, deck) : null;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"YGO Display";src:url('${asset('assets/fonts/BebasNeue-Regular.ttf')}')}
    *{box-sizing:border-box} html,body{margin:0;width:${WIDTH}px;height:${height}px;overflow:hidden}
    body{font-family:Arial,sans-serif;color:#e8f3f1;background:radial-gradient(ellipse at 50% 0,#1d5360cc,#020911f2 70%),url('${asset('assets/character-select-background.png')}') center/cover;padding:${PAD}px}
    header{height:${HEAD_H - PAD}px;display:flex;align-items:center;gap:22px}
    .portrait{width:${HEAD_H - PAD - 10}px;height:${HEAD_H - PAD - 10}px;border:5px solid #aa9b60;border-radius:6px;background:url('${asset(`assets/${character.background || 'character-select-background.png'}`)}') center/cover;overflow:hidden;position:relative;flex:none}
    .portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%}
    h1{font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:60px;letter-spacing:2px;margin:0;color:#efca79;line-height:1;text-shadow:0 3px 10px #000}
    h1 small{font-size:34px;color:#e8f3f1}
    .rates{font-size:20px;margin-top:10px} .rates b{font-family:"YGO Display",Georgia,serif;font-size:34px;letter-spacing:1px;margin:0 6px}
    .sub{opacity:.75;font-size:14px;margin-top:6px}
    .panels{display:flex;gap:${PAD}px}
    .panel{width:${PANEL_W}px;background:#0b1c24e6;border:1px solid #628994;border-radius:8px;padding:${PANEL_PAD}px}
    .panel h2{margin:0 0 12px;font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:30px;letter-spacing:1px;color:#efca79}
    .panel h2 small{font-family:Arial,sans-serif;font-size:14px;color:#cfe3e0;letter-spacing:0;margin-left:8px}
    .grid{display:grid;grid-template-columns:repeat(${COLS},${CARD_W}px);gap:${GAP}px}
    .card{width:${CARD_W}px;height:${CARD_H}px;border-radius:4px;position:relative}
    .card img{width:100%;height:100%;object-fit:cover;border-radius:3px;display:block}
    .card.removed{outline:4px solid #ff4d4d;outline-offset:-1px;box-shadow:0 0 12px #ff4d4dcc}
    .card.removed img{opacity:.8}
    .card.added{outline:4px solid #3ddc6b;outline-offset:-1px;box-shadow:0 0 12px #3ddc6bcc}
    .extra{margin-top:10px;font-size:13px;opacity:.9} .extra .removed{color:#ff7a7a} .extra .added{color:#6ff09a}
    .r{color:#ff7a7a} .g{color:#6ff09a}
  </style></head><body>
    <header><div class="portrait">${character.sprite ? `<img src="${asset(`assets/${character.sprite}`)}">` : ''}</div>
      <div><h1>${esc(deck.character)} <small>· Tier ${deck.tier}</small></h1>
      <div class="rates">Win rate vs Tier ${deck.tier}: <b>${pct(rBefore)}</b> → <b style="color:${rAfter === null ? '#e8f3f1' : rAfter >= .4 && rAfter <= .6 ? '#6ff09a' : '#ffb36b'}">${pct(rAfter)}</b></div>
      <div class="sub">Deck file ${esc(file)} · red frame = removed, green frame = added${latest ? ` · after = ${esc(path.basename(path.dirname(latest.file)))}` : ''}</div></div>
    </header>
    <div class="panels">${left.html}${right.html}</div>
  </body></html>`;
  const slug = `T${deck.tier}-${deck.character}`.replace(/[^\w-]+/g, '-').replace(/-+/g, '-');
  const htmlFile = path.join(outDir, `${slug}.html`), pngFile = path.join(outDir, `${slug}.png`);
  fs.writeFileSync(htmlFile, html);
  try { await screenshot(htmlFile, pngFile, height, WIDTH); made.push(pngFile); console.log(`${pngFile}  (${pct(rBefore)} → ${pct(rAfter)})`); }
  finally { fs.rmSync(htmlFile, {force: true}); }
}
console.log(`${made.length} deck images in ${outDir}`);
