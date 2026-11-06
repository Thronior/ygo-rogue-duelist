#!/usr/bin/env node
// Renders a custom-entry report as one PNG: the deck's overall stats on top, then its 8 best and
// 8 worst matchups in each tier as ranked rows with win-rate bars, each opponent shown by its
// character portrait. Rendered with Edge's headless screenshot, like the tier images.
// Usage: custom_image.mjs <deck-sim-custom-....json>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {asset, screenshot} from './tier_images.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', 'android', 'web');
const SHOW = 8, WIDTH = 1500, PAD = 30, HEAD_H = 214, TIER_H = 484;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const rateOf = x => x && x.w + x.l + x.d ? (x.w + x.d / 2) / (x.w + x.l + x.d) : null;
const pct = x => { const r = rateOf(x); return r === null ? '—' : `${(r * 100).toFixed(1)}%`; };
const pct0 = x => { const r = rateOf(x); return r === null ? '—' : `${Math.round(r * 100)}%`; };
// Same scale as the tier images: red under 40%, gold around 50%, green over 60%.
const color = x => { const r = rateOf(x); return r === null ? '#9fb3b8' : `hsl(${Math.max(0, Math.min(120, (r - .25) / .5 * 120))} 70% 62%)`; };

function lookups() {
  const meta = JSON.parse(fs.readFileSync(path.join(WEB, 'content.json'), 'utf8'));
  const byName = new Map(Object.entries(meta.characters || {}).map(([id, c]) => [c.name, id]));
  const cards = new Map((meta.cards || []).map(c => [c.id, c]));
  // Older reports have no characterId on opponent rows, so fall back to the character's name.
  const portrait = row => {
    const id = row.characterId ?? byName.get(row.character);
    const c = meta.characters?.[id] || {};
    const fallback = `character-backgrounds/${id}.jpg`;
    const background = c.background || (fs.existsSync(path.join(WEB, 'assets', fallback)) ? fallback : 'character-select-background.png');
    return {sprite: c.sprite ? asset(`assets/${c.sprite}`) : null, background: asset(`assets/${background}`)};
  };
  // The deck's face: its most-played monsters, then anything else, five distinct cards.
  const keyCards = main => {
    const count = new Map();
    for (const id of main) count.set(id, (count.get(id) || 0) + 1);
    const monster = id => (Number(cards.get(id)?.data?.type) & 1) === 1;
    return [...count.keys()].sort((a, b) => monster(b) - monster(a) || count.get(b) - count.get(a) || (cards.get(b)?.data?.attack ?? 0) - (cards.get(a)?.data?.attack ?? 0))
      .slice(0, 5).map(id => asset(`assets/cards/${id}.jpg`));
  };
  return {portrait, keyCards};
}

function page(report, look) {
  const r = report.record, when = new Date(report.createdAt || Date.now()).toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'});
  const games = report.settings?.customGamesPerMatchup ?? report.settings?.gamesPerMatchup;
  const stat = (label, x, big = false) => `<div class="stat${big ? ' big' : ''}"><span>${label}</span><b style="color:${color(x)}">${pct(x)}</b><small>${x.w}-${x.l}-${x.d}</small></div>`;
  // Tier rating: the tier whose win rate is closest to 50% (ties go to the higher tier); FAIL when none is within 40-60%.
  const rated = [3, 2, 1].map(t => ({t, rate: rateOf(r[t])})).filter(x => x.rate !== null).sort((a, b) => Math.abs(a.rate - .5) - Math.abs(b.rate - .5))[0];
  const tierOk = rated && rated.rate >= .4 && rated.rate <= .6;
  const rating = `<div class="stat big rating"><span>Tier rating</span><b style="color:${tierOk ? '#efca79' : '#f0705f'}">${tierOk ? `T${rated.t}` : 'FAIL'}</b><small>${tierOk ? `${pct(r[rated.t])} vs Tier ${rated.t}` : 'no tier within 40-60%'}</small></div>`;
  const row = (o, i) => {
    const p = look.portrait(o), rate = rateOf(o.record) ?? 0;
    return `<div class="line"><i>${i + 1}</i><div class="face" style="background-image:url('${p.background}')">${p.sprite ? `<img src="${p.sprite}">` : ''}</div>
      <span>${esc(o.character)}</span><div class="bar"><div style="width:${rate * 100}%;background:${color(o.record)}"></div><em></em></div><b style="color:${color(o.record)}">${pct0(o.record)}</b></div>`;
  };
  const tiers = [1, 2, 3].filter(t => report.opponents.some(o => o.tier === t)).map(tier => {
    const rows = report.opponents.filter(o => o.tier === tier).sort((a, b) => (rateOf(b.record) ?? -1) - (rateOf(a.record) ?? -1));
    const t = r[tier];
    return `<section class="tier">
      <h2>Tier ${tier} <small>· ${pct(t)} vs ${rows.length} decks (${t.w}-${t.l}-${t.d})</small></h2>
      <div class="two"><div><div class="label good">▲ Best ${Math.min(SHOW, rows.length)}</div>${rows.slice(0, SHOW).map(row).join('')}</div>
      <div><div class="label bad">▼ Worst ${Math.min(SHOW, rows.length)}</div>${rows.slice(-SHOW).reverse().map(row).join('')}</div></div></section>`;
  });
  const height = PAD * 2 + HEAD_H + tiers.length * TIER_H;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face{font-family:"YGO Display";src:url('${asset('assets/fonts/BebasNeue-Regular.ttf')}')}
    *{box-sizing:border-box}
    html,body{margin:0;width:${WIDTH}px;height:${height}px;overflow:hidden}
    body{font-family:Arial,sans-serif;color:#e8f3f1;background:radial-gradient(ellipse at 50% 0,#1d5360cc,#020911f2 70%),url('${asset('assets/character-select-background.png')}') center/cover;padding:${PAD}px}
    header{height:${HEAD_H - 22}px;display:flex;justify-content:space-between;align-items:center;gap:24px;margin-bottom:22px;border-bottom:2px solid #aa9b6088}
    .who{display:flex;align-items:center;gap:22px}
    .logo{height:104px}
    h1{font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:64px;letter-spacing:3px;margin:0;color:#efca79;text-shadow:0 3px 12px #000;line-height:1;max-width:520px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    header p{margin:4px 0 8px;font-size:15px;opacity:.8}
    .keys{display:flex;gap:6px}.keys img{height:74px;border-radius:3px;box-shadow:0 3px 8px #000}
    .stats{display:flex;gap:12px}
    .stat{width:132px;text-align:center;background:#0a1d26cc;border:2px solid #628994;border-radius:8px;padding:10px 6px}
    .stat.big{width:180px;border-color:#efca79}
    .stat span{display:block;font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.75}
    .stat b{display:block;font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:46px;line-height:1.1;text-shadow:0 2px 6px #000}
    .stat.big b{font-size:66px}
    .stat small{font-size:13px;opacity:.7}
    .tier{height:${TIER_H}px}
    h2{font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:38px;letter-spacing:2px;margin:0;color:#efca79}
    h2 small{color:#e8f3f1;opacity:.8;font-size:.6em;letter-spacing:1px}
    .label{font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin:10px 0 6px}
    .label.good{color:#8fe08f}.label.bad{color:#f08a7a}
    .two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
    .line{display:flex;align-items:center;gap:10px;height:46px;margin-bottom:4px;background:#0a1d26b3;border-radius:6px;padding:3px 12px 3px 6px}
    .line i{width:22px;text-align:right;font-style:normal;opacity:.6;font-size:13px}
    .face{width:40px;height:40px;border-radius:50%;border:2px solid #aa9b60;background-size:cover;background-position:center;position:relative;overflow:hidden;flex:none}
    .face img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 12%}
    .line span{width:190px;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bar{flex:1;height:14px;background:#ffffff14;border-radius:7px;position:relative;overflow:hidden}.bar div{height:100%;border-radius:7px}
    .bar em{position:absolute;left:50%;top:0;bottom:0;border-left:1px dashed #ffffff66}
    .line b{width:52px;text-align:right;font-family:"YGO Display",Georgia,serif;font-weight:normal;font-size:28px}
  </style></head><body>
    <header>
      <div class="who"><img class="logo" src="${asset('assets/rogue-duelist-logo.png')}">
        <div><h1>${esc(report.name || 'Custom deck')}</h1>
        <p>Custom entry · ${report.opponents.length} opponent decks · ${games} duels each · ${when}</p>
        <div class="keys">${look.keyCards(report.deck?.main || []).map(src => `<img src="${src}">`).join('')}</div></div></div>
      <div class="stats">${rating}${[1, 2, 3].map(t => stat(`vs Tier ${t}`, r[t])).join('')}</div>
    </header>
    ${tiers.join('')}
  </body></html>`;
  return {html, height};
}

// Writes <report base>-matchups.png next to the report and returns [its path].
export async function exportCustomImage(report, reportJsonPath) {
  if (report.mode !== 'custom') throw new Error('The matchup image needs a custom-entry report.');
  const {html, height} = page(report, lookups());
  const base = reportJsonPath.replace(/\.json$/i, '');
  const htmlFile = `${base}-matchups.html`, pngFile = `${base}-matchups.png`;
  fs.writeFileSync(htmlFile, html);
  try { return [await screenshot(htmlFile, pngFile, height, WIDTH)]; }
  finally { fs.rmSync(htmlFile, {force: true}); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: custom_image.mjs <deck-sim-custom-....json>'); process.exit(1); }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  exportCustomImage(report, path.resolve(file)).then(files => console.log(files.join('\n'))).catch(error => { console.error(error.message || error); process.exitCode = 1; });
}
