#!/usr/bin/env node
// Renders a .ydk as a decklist PNG: deck name and counts on top, then every copy of every card in one continuous
// grid, monsters first (highest level first), then spells, then traps; the Extra Deck follows in its own row.
// Rendered with Edge's headless screenshot, like the tier images.
// Usage: decklist_image.mjs <deck.ydk> [out.png] [title]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {asset, screenshot} from './tier_images.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WEB = path.join(ROOT, 'android', 'web');
const COLS = 10, CARD_W = 124, CARD_H = 181, GAP = 10, PAD = 30, HEAD_H = 150, SECTION_HEAD = 48, SECTION_GAP = 18;
const WIDTH = COLS * CARD_W + (COLS - 1) * GAP + PAD * 2;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const meta = JSON.parse(fs.readFileSync(path.join(WEB, 'content.json'), 'utf8'));
const cards = new Map([...meta.cards, ...meta.tokenCards].map(c => [Number(c.id), c]));
const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'card-aliases.json'), 'utf8'));
const canon = id => Number(aliases[id] ?? id);

function readYdk(file) {
  const deck = {main: [], extra: []};
  let zone = 'main';
  for (const raw of fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '#main' || line === '#extra') { zone = line.slice(1); continue; }
    if (line === '!side') { zone = null; continue; }
    if (zone && /^\d+$/.test(line)) deck[zone].push(Number(line));
  }
  return deck;
}
function cardImg(id) {
  for (const x of [id, canon(id)]) if (fs.existsSync(path.join(WEB, 'assets', 'cards', `${x}.jpg`))) return asset(`assets/cards/${x}.jpg`);
  return asset('assets/card-back.jpg');
}
const type = id => Number(cards.get(id)?.data?.type) || 0;
// Monsters, then spells, then traps; monsters by level; copies of a card side by side.
const kind = id => type(id) & 1 ? 0 : type(id) & 2 ? 1 : 2;
const sorted = ids => [...ids].sort((a, b) => kind(a) - kind(b) || (cards.get(b)?.level || 0) - (cards.get(a)?.level || 0) ||
  String(cards.get(a)?.name).localeCompare(String(cards.get(b)?.name)) || a - b);

export async function decklistImage(ydkFile, pngFile, title) {
  const deck = readYdk(ydkFile);
  const sections = [['Main Deck', sorted(deck.main)], ['Extra Deck', sorted(deck.extra)]].filter(([, ids]) => ids.length);
  const rows = sections.map(([, ids]) => Math.ceil(ids.length / COLS));
  const height = PAD + HEAD_H + sections.length * (SECTION_HEAD + SECTION_GAP) + rows.reduce((h, r) => h + r * CARD_H + (r - 1) * GAP, 0) + PAD;
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const counts = [count(deck.main.filter(id => kind(id) === 0).length, 'monster'), count(deck.main.filter(id => kind(id) === 1).length, 'spell'),
    count(deck.main.filter(id => kind(id) === 2).length, 'trap'), ...(deck.extra.length ? [`${deck.extra.length} Extra`] : [])].join(' · ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"YGO Display";src:url('${asset('assets/fonts/BebasNeue-Regular.ttf')}')}
    *{box-sizing:border-box} html,body{margin:0;width:${WIDTH}px;height:${height}px;overflow:hidden}
    body{font-family:Arial,sans-serif;color:#e8f3f1;background:radial-gradient(ellipse at 50% 0,#1d5360cc,#020911f2 70%),url('${asset('assets/character-select-background.png')}') center/cover;padding:${PAD}px}
    header{height:${HEAD_H}px;display:flex;align-items:center;gap:26px;border-bottom:2px solid #aa9b6088;margin-bottom:${SECTION_GAP}px}
    header img{height:110px}
    h1{font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:68px;letter-spacing:3px;margin:0;color:#efca79;line-height:1;text-shadow:0 3px 12px #000}
    header p{margin:8px 0 0;font-size:18px;opacity:.85}
    section{margin-bottom:${SECTION_GAP}px}
    h2{height:${SECTION_HEAD}px;margin:0;font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:36px;letter-spacing:2px;color:#efca79;display:flex;align-items:center;gap:12px}
    h2 small{font-family:Arial,sans-serif;font-size:16px;color:#cfe3e0;letter-spacing:0}
    .grid{display:grid;grid-template-columns:repeat(${COLS},${CARD_W}px);gap:${GAP}px}
    .card{width:${CARD_W}px;height:${CARD_H}px;position:relative;border-radius:5px;box-shadow:0 5px 14px #000c}
    .card img{width:100%;height:100%;object-fit:cover;border-radius:5px;display:block}
  </style></head><body>
    <header><img src="${asset('assets/rogue-duelist-logo.png')}">
      <div><h1>${esc(title)}</h1><p>${deck.main.length} cards · ${counts}</p></div></header>
    ${sections.map(([label, ids]) => `<section><h2>${label} <small>${ids.length} card${ids.length === 1 ? '' : 's'}</small></h2>
      <div class="grid">${ids.map(id => `<div class="card"><img src="${cardImg(id)}" title="${esc(cards.get(id)?.name)}"></div>`).join('')}</div></section>`).join('')}
  </body></html>`;
  const htmlFile = pngFile.replace(/\.png$/i, '.html');
  fs.writeFileSync(htmlFile, html);
  try { return await screenshot(htmlFile, pngFile, height, WIDTH); }
  finally { fs.rmSync(htmlFile, {force: true}); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [ydk, out, title] = process.argv.slice(2);
  if (!ydk) { console.error('Usage: decklist_image.mjs <deck.ydk> [out.png] [title]'); process.exit(1); }
  const file = path.resolve(ydk), png = path.resolve(out || file.replace(/\.ydk$/i, '.png'));
  decklistImage(file, png, title || path.basename(file, path.extname(file))).then(p => console.log(p)).catch(error => { console.error(error.message || error); process.exitCode = 1; });
}
