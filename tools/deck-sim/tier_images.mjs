#!/usr/bin/env node
// Renders a full-list report as three PNGs, one per tier. Each image ranks that tier's decks by
// win rate against the other decks of the same tier and shows each deck by its character
// portrait. Rendered with Edge's built-in headless screenshot, so it needs no extra packages.
// Usage: tier_images.mjs <deck-sim-full-....json>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const WEB = path.join(ROOT, 'android', 'web');
const COLUMNS = 6, CARD_W = 200, GAP = 18, CARD_H = 352, HEAD_H = 236, PAD = 34;
const WIDTH = COLUMNS * CARD_W + (COLUMNS - 1) * GAP + PAD * 2;

const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => fs.existsSync(p));
export const asset = rel => pathToFileURL(path.join(WEB, rel)).href;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const rateOf = x => x && x.w + x.l + x.d ? (x.w + x.d / 2) / (x.w + x.l + x.d) : null;
const pct = x => { const r = rateOf(x); return r === null ? '—' : `${(r * 100).toFixed(1)}%`; };
// Same scale as the simulator UI: red under 40%, gold around 50%, green over 60%.
const color = x => { const r = rateOf(x); return r === null ? '#9fb3b8' : `hsl(${Math.max(0, Math.min(120, (r - .25) / .5 * 120))} 70% 66%)`; };

function portraits() {
  const meta = JSON.parse(fs.readFileSync(path.join(WEB, 'content.json'), 'utf8'));
  return id => {
    const c = meta.characters?.[id] || {};
    const fallback = `character-backgrounds/${id}.jpg`;
    const background = c.background || (fs.existsSync(path.join(WEB, 'assets', fallback)) ? fallback : 'character-select-background.png');
    return {sprite: c.sprite ? asset(`assets/${c.sprite}`) : null, background: asset(`assets/${background}`)};
  };
}

function page(report, tier, look) {
  // Within-tier reports (the current full list) have one number per deck; older all-tier reports
  // also show the vs-T1/T2/T3 chips.
  const withinTier = report.scope === 'within-tier';
  const cardH = withinTier ? CARD_H - 34 : CARD_H;
  const decks = report.decks.filter(d => d.tier === tier).sort((a, b) => (rateOf(b.record.all) ?? -1) - (rateOf(a.record.all) ?? -1));
  const rows = Math.ceil(decks.length / COLUMNS);
  const height = HEAD_H + rows * cardH + (rows - 1) * GAP + PAD;
  const when = new Date(report.createdAt || Date.now()).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'});
  const games = report.settings?.gamesPerMatchup ?? 10;
  const cards = decks.map((d, i) => {
    const p = look(d.characterId), r = d.record;
    const chip = t => `<div class="chip"><span>vs T${t}</span><b style="color:${color(r[t])}">${pct(r[t])}</b></div>`;
    return `<div class="card">
      <div class="rank">${i + 1}</div>
      <div class="art" style="background-image:url('${p.background}')">${p.sprite ? `<img src="${p.sprite}">` : `<em>${esc(d.character)}</em>`}</div>
      <div class="overall" style="color:${color(r.all)}">${pct(r.all)}</div>
      ${withinTier ? '' : `<div class="chips">${[1, 2, 3].map(chip).join('')}</div>`}
      <div class="wld">${r.all.w}-${r.all.l}-${r.all.d}</div>
    </div>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"YGO Display";src:url('${asset('assets/fonts/BebasNeue-Regular.ttf')}')}
    *{box-sizing:border-box}
    html,body{margin:0;width:${WIDTH}px;height:${height}px;overflow:hidden}
    body{font-family:Arial,sans-serif;color:#e8f3f1;background:radial-gradient(ellipse at 50% 0,#1d5360cc,#020911f2 70%),url('${asset('assets/character-select-background.png')}') center/cover;padding:${PAD}px}
    header{height:${HEAD_H - PAD}px;display:flex;align-items:center;gap:28px}
    header img{height:120px}
    h1{font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:76px;letter-spacing:3px;margin:0;color:#efca79;text-shadow:0 3px 12px #000;line-height:1}
    h1 small{font-size:40px;color:#e8f3f1;letter-spacing:2px}
    header p{margin:8px 0 0;font-size:16px;opacity:.85;line-height:1.5}
    .grid{display:grid;grid-template-columns:repeat(${COLUMNS},${CARD_W}px);gap:${GAP}px}
    .card{height:${cardH}px;position:relative;border:6px solid #aa9b60;border-radius:6px;background:linear-gradient(160deg,#173845,#0b1c24);box-shadow:0 6px 18px #000c;padding:8px;display:flex;flex-direction:column;align-items:stretch}
    .rank{position:absolute;top:-4px;left:-4px;z-index:2;min-width:42px;height:42px;padding:0 6px;border-radius:0 0 12px 0;background:#efca79;color:#211907;font-family:"YGO Display",Georgia,serif;font-size:30px;display:grid;place-items:center}
    .art{height:186px;border:3px ridge #758990;background-size:cover;background-position:center;position:relative;overflow:hidden;display:grid;place-items:center}
    .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%}
    .art em{font-style:normal;font-weight:bold;text-align:center;padding:6px;text-shadow:0 2px 4px #000}
    .overall{font-family:"YGO Display",Georgia,serif;font-size:58px;line-height:1;text-align:center;margin:10px 0 6px;text-shadow:0 2px 6px #000}
    .chips{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
    .chip{background:#0a1d26;border:1px solid #628994;border-radius:4px;text-align:center;padding:4px 0}
    .chip span{display:block;font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.75}
    .chip b{font-size:14px}
    .wld{text-align:center;font-size:12px;opacity:.7;margin-top:6px}
  </style></head><body>
    <header><img src="${asset('assets/rogue-duelist-logo.png')}">
      <div>${withinTier
        ? `<h1>Tier ${tier} decks <small>· win rate vs Tier ${tier}</small></h1>
      <p>${decks.length} decks ranked by win rate against the other Tier ${tier} decks (${when}). ${games} duel${games === 1 ? '' : 's'} per pairing, both sides played by the game CPU.<br>
      Win rate = (wins + draws/2) / duels · W-L-D below.</p>`
        : `<h1>Tier ${tier} decks <small>· overall win rate</small></h1>
      <p>${decks.length} decks ranked by win rate against every T1–T3 deck (${when}). ${games} duels per pairing, both sides played by the game CPU.<br>
      Big number = overall · chips = vs each tier · win rate = (wins + draws/2) / duels · W-L-D below.</p>`}</div>
    </header>
    <div class="grid">${cards}</div>
  </body></html>`;
  return {html, height};
}

// Shared with deck_diff_images.mjs.
export function screenshot(htmlFile, pngFile, height, width = WIDTH) {
  if (!EDGE) return Promise.reject(new Error('Microsoft Edge was not found, so images could not be rendered.'));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-sim-edge-'));
  return new Promise((resolve, reject) => {
    execFile(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', `--user-data-dir=${profile}`,
      '--virtual-time-budget=4000', `--window-size=${width},${height}`, `--screenshot=${pngFile}`, pathToFileURL(htmlFile).href], {timeout: 60000}, error => {
      fs.rmSync(profile, {recursive: true, force: true});
      if (error || !fs.existsSync(pngFile)) reject(error || new Error(`Edge did not write ${pngFile}`)); else resolve(pngFile);
    });
  });
}

// Writes <report base>-tier1.png, -tier2.png and -tier3.png next to the report and returns their paths.
export async function exportTierImages(report, reportJsonPath) {
  if (report.mode !== 'full') throw new Error('Tier images need a full-list report.');
  const look = portraits();
  const base = reportJsonPath.replace(/\.json$/i, '');
  const files = [];
  for (const tier of [1, 2, 3]) {
    const {html, height} = page(report, tier, look);
    const htmlFile = `${base}-tier${tier}.html`, pngFile = `${base}-tier${tier}.png`;
    fs.writeFileSync(htmlFile, html);
    try { files.push(await screenshot(htmlFile, pngFile, height)); }
    finally { fs.rmSync(htmlFile, {force: true}); }
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: tier_images.mjs <deck-sim-full-....json>'); process.exit(1); }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  exportTierImages(report, path.resolve(file)).then(files => console.log(files.join('\n'))).catch(error => { console.error(error.message || error); process.exitCode = 1; });
}
