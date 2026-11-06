// Shared core for the deck balance simulator: deck loading, worker pool, tallies and saved reports.
// Used by deck_sim.mjs (terminal) and deck_sim_ui.mjs (local web UI). Dev tool only.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {exportTierImages} from './tier_images.mjs';
import {exportCustomImage} from './custom_image.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const SETTINGS_FILE = path.join(HERE, 'settings.json');
export const DEFAULT_SETTINGS = {
  // true: read the campaign's active opponent decks (Python content + data/decks/*.ydk) on every run.
  // false: use the packaged catalog in android/web/content.json (what the last build shipped).
  useActiveGameDecks: true,
  // Full list: duels per pairing within a tier. Custom entry: duels against each opponent deck.
  gamesPerMatchup: 50,
  customGamesPerMatchup: 10,
  // A duel still running after this many turns is scored as a draw.
  maxTurns: 80,
  maxDecisionsPerDuel: 10000,
  // 0 = automatic (CPU threads - 1, limited by free memory).
  workers: 0,
  outputFolder: 'exports/deck-sim'
};

export function loadSettings() {
  let saved = {};
  if (fs.existsSync(SETTINGS_FILE)) saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  else fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n');
  return {...DEFAULT_SETTINGS, ...saved};
}

export function saveSettings(changes) {
  const next = {...loadSettings()};
  for (const key of Object.keys(DEFAULT_SETTINGS)) if (key in changes) {
    const value = changes[key];
    if (typeof DEFAULT_SETTINGS[key] === 'boolean') next[key] = !!value;
    else if (typeof DEFAULT_SETTINGS[key] === 'number') {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n) || n < (key === 'workers' ? 0 : 1)) throw new Error(`${key} must be a whole number${key === 'workers' ? ' (0 = automatic)' : ' of 1 or more'}.`);
      next[key] = n;
    }
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2) + '\n');
  return next;
}

function pythonExe() {
  const bundled = path.join(ROOT, 'python', 'python.exe');
  return fs.existsSync(bundled) ? bundled : 'python';
}

export function loadOpponentDecks(settings) {
  if (settings.useActiveGameDecks) {
    const out = execFileSync(pythonExe(), [path.join(HERE, 'list_active_decks.py')], {cwd: ROOT, maxBuffer: 64 << 20, encoding: 'utf8'});
    return {source: 'active campaign decks (content.py + data/decks/*.ydk)', decks: JSON.parse(out).decks};
  }
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'android', 'web', 'content.json'), 'utf8'));
  const decks = [];
  for (const [id, rows] of Object.entries(meta.cpuWatchDecks || {})) for (const row of rows || []) {
    const tier = Number(String(row.label || '').match(/Tier\s*([1-3])/i)?.[1]);
    if (!tier) continue;
    const character = meta.cpuWatchOpponents?.[id]?.name || meta.characters?.[Number(id)]?.name || `Character ${id}`;
    const campaign = (meta.cpuDecks?.[id] || []).find(item => Number(item.tier) === tier);
    decks.push({characterId: Number(id), character, tier, deckId: campaign?.deck || `${character} T${tier}`, main: row.main, extra: row.extra || []});
  }
  return {source: 'packaged catalog (android/web/content.json)', decks};
}

export function cardCatalog() {
  const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'android', 'web', 'content.json'), 'utf8'));
  return new Map([...(meta.cards || []), ...(meta.tokenCards || [])].map(card => [Number(card.id), card]));
}

export function parseYdk(text, label, catalog) {
  const aliases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'card-aliases.json'), 'utf8'));
  const deck = {main: [], extra: []};
  let zone = 'main';
  for (const raw of String(text).replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '#main' || line === '#extra') { zone = line.slice(1); continue; }
    if (line === '!side') { zone = null; continue; }
    if (!line || line.startsWith('#') || line.startsWith('!') || !zone) continue;
    if (!/^\d+$/.test(line)) throw new Error(`Invalid card ID in ${label}: ${line}`);
    const id = Number(aliases[line] ?? line);
    const card = catalog.get(id);
    if (!card) throw new Error(`${label}: card ID ${line} is not in the game's card pool.`);
    // Extra Deck monsters (Fusion) go to the Extra Deck whichever section they were listed in.
    deck[(Number(card.data?.type) & 0x40) ? 'extra' : zone].push(id);
  }
  if (deck.main.length < 20) throw new Error(`${label} has ${deck.main.length} Main Deck cards; the game needs at least 20.`);
  return deck;
}

// A pasted decklist ("3x Summoned Skull [70781052]", one card per line) becomes .ydk text.
// Each line's card ID is the number in [brackets], or else its longest number of 5+ digits;
// a leading "3x" / "3 x" / "x3" sets the copies. Lines without an ID (headings) are skipped.
// Returns null when the text is already a .ydk (section markers or bare ID lines only).
export function decklistToYdk(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.some(l => /^(#main|#extra|!side)$/.test(l)) || lines.every(l => /^\d+$/.test(l) || l.startsWith('#') || l.startsWith('!'))) return null;
  const ids = [];
  for (const line of lines) {
    const id = line.match(/\[(\d+)\]/)?.[1] ?? (line.match(/\d{5,}/g) || []).sort((a, b) => b.length - a.length)[0];
    if (!id) continue;
    const copies = Number(line.match(/^(\d{1,2})\s*x\b/i)?.[1] ?? line.match(/^x\s*(\d{1,2})\b/i)?.[1] ?? 1);
    for (let i = 0; i < copies; i++) ids.push(id);
  }
  if (!ids.length) throw new Error('No card IDs found in the pasted list.');
  return `#created by YGO Rogue Duelist deck sim\n#main\n${ids.join('\n')}\n#extra\n!side\n`;
}

function checkDecks(decks, catalog) {
  for (const deck of decks) for (const id of [...deck.main, ...deck.extra]) {
    if (!catalog.has(Number(id))) throw new Error(`${deck.character} T${deck.tier} (${deck.deckId}) has card ${id}, which android/web/content.json does not know. Rebuild content.json first.`);
  }
}

// A worker's live heap is ~20 MB with pruned scripts, but V8 lets garbage pile up to its heap
// limit before collecting. Capping the old generation at 320 MB keeps a busy worker near
// 160-200 MB (measured) without slowing it; 250 MB is budgeted per worker and RESERVE_BYTES
// stays free for the rest of the PC.
const WORKER_LIMITS = {maxOldGenerationSizeMb: 320, maxYoungGenerationSizeMb: 16};
const WORKER_BYTES = 250e6;
const RESERVE_BYTES = 1e9;
const roomForWorkers = () => Math.floor((os.freemem() - RESERVE_BYTES) / WORKER_BYTES);

// Shared utility scripts plus the card scripts the decks use. Workers load anything else on demand.
function scriptsFor(decks) {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'android', 'web', 'scripts.json'), 'utf8'));
  const needed = new Set(decks.flatMap(deck => [...deck.main, ...deck.extra]).map(id => `c${id}.lua`));
  const kept = {};
  for (const [name, text] of Object.entries(all)) if (!/^c\d+\.lua$/.test(name) || needed.has(name)) kept[name] = text;
  return kept;
}

export const rateOf = x => x.w + x.l + x.d ? (x.w + x.d / 2) / (x.w + x.l + x.d) : null;
export const pct = x => { const r = rateOf(x); return r === null ? '—' : `${(r * 100).toFixed(1)}%`; };
export const fmtTime = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m` : s >= 60 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.round(s)}s`;

// hooks: onStart({total, workers}), onProgress({done, total, elapsed, workers}), signal (AbortSignal) stops early.
// With workers = 0 the pool starts with what free RAM allows and keeps adding workers, up to CPU
// threads - 1, whenever RAM frees up during the run.
async function runJobs(decks, jobs, settings, hooks = {}) {
  const total = jobs.reduce((sum, job) => sum + job.games, 0);
  const fixed = settings.workers > 0;
  const limit = Math.max(1, Math.min(fixed ? settings.workers : os.availableParallelism() - 1, jobs.length));
  const workerData = {root: ROOT, decks, scripts: scriptsFor(decks), maxTurns: settings.maxTurns, maxDecisions: settings.maxDecisionsPerDuel};
  const started = Date.now();
  const results = [];
  const workers = [];
  let done = 0, next = 0, alive = 0, peak = 0, growTimer = null;
  const report = () => hooks.onProgress?.({done, total, elapsed: (Date.now() - started) / 1000, workers: alive});
  await new Promise((resolve, reject) => {
    const stopAll = () => { clearInterval(growTimer); for (const w of workers) w.terminate(); };
    hooks.signal?.addEventListener('abort', stopAll, {once: true});
    const retry = [];
    const spawn = () => {
      // execArgv: [] keeps launch flags (e.g. --input-type) from breaking the worker.
      const worker = new Worker(path.join(HERE, 'deck_sim_worker.mjs'), {workerData, resourceLimits: WORKER_LIMITS, execArgv: []});
      workers.push(worker);
      alive++;
      peak = Math.max(peak, alive);
      let current = null, played = 0;
      const feed = () => {
        current = hooks.signal?.aborted ? null : retry.shift() || (next < jobs.length ? jobs[next++] : null);
        played = 0;
        worker.postMessage(current || 'stop');
      };
      worker.on('message', msg => {
        if (msg.ready) feed();
        else if (msg.progress) { done += msg.progress; played += msg.progress; report(); }
        else if (msg.done) { results.push(msg); feed(); }
      });
      // A crashed worker (out of memory, engine fault) loses only its current pairing: run it once
      // more on a fresh worker, and count it as failed games if that crashes too.
      worker.on('error', error => {
        if (hooks.signal?.aborted) return;
        // Failing before its first pairing means the worker cannot start at all: stop with the error.
        if (!current) { stopAll(); reject(error); return; }
        done -= played;
        if (current.retried) {
          results.push({a: current.a, b: current.b, games: Array.from({length: current.games}, () => ({result: 'failed', error: String(error?.message || error)}))});
          done += current.games;
        } else retry.push({...current, retried: true});
        current = null;
        spawn();
      });
      worker.on('exit', () => { if (--alive === 0 && ((next >= jobs.length && !retry.length) || hooks.signal?.aborted)) { clearInterval(growTimer); resolve(); } });
    };
    const first = fixed ? limit : Math.max(1, Math.min(limit, roomForWorkers()));
    for (let w = 0; w < first; w++) spawn();
    hooks.onStart?.({total, workers: first});
    // One worker at a time, so each free-RAM reading includes the worker added before it.
    if (!fixed) growTimer = setInterval(() => {
      if (alive < limit && next < jobs.length && roomForWorkers() >= 1 && !hooks.signal?.aborted) { spawn(); report(); }
    }, 5000);
  });
  if (hooks.signal?.aborted) throw new Error('Simulation cancelled.');
  return {results, seconds: (Date.now() - started) / 1000, workers: peak, total};
}

const emptyRecord = () => ({1: {w: 0, l: 0, d: 0}, 2: {w: 0, l: 0, d: 0}, 3: {w: 0, l: 0, d: 0}, all: {w: 0, l: 0, d: 0}, failed: 0, capped: 0});
const short = {win: 'w', loss: 'l', draw: 'd'};

// Each deck's record against every tier from pair results (each result is A's view).
function tally(decks, results, onlyDeck = null) {
  const rows = decks.map(emptyRecord);
  const add = (row, tier, result) => { for (const key of [tier, 'all']) row[key][short[result]]++; };
  for (const {a, b, games} of results) for (const game of games) {
    if (game.result === 'failed') { rows[a].failed++; rows[b].failed++; continue; }
    if (game.capped) { rows[a].capped++; rows[b].capped++; }
    add(rows[a], decks[b].tier, game.result);
    if (onlyDeck === null) add(rows[b], decks[a].tier, {win: 'loss', loss: 'win', draw: 'draw'}[game.result]);
  }
  return rows;
}

// Full list: each deck only plays its own tier, so a deck has one win rate (record.all).
function textTable(rows) {
  const label = row => `T${row.tier} ${row.character}`;
  const width = Math.max(10, ...rows.map(row => label(row).length));
  const head = `${'Deck'.padEnd(width)}  ${'Win rate'.padStart(8)}  ${'W-L-D'.padStart(11)}  Notes`;
  const lines = [head, '-'.repeat(head.length + 10)];
  for (const row of rows) {
    const r = row.record;
    const notes = [r.capped ? `${r.capped} turn-cap draws` : '', r.failed ? `${r.failed} failed` : ''].filter(Boolean).join(', ');
    lines.push(`${label(row).padEnd(width)}  ${pct(r.all).padStart(8)}  ${`${r.all.w}-${r.all.l}-${r.all.d}`.padStart(11)}  ${notes}`);
  }
  return lines.join('\n');
}

const csvCell = v => /[",\r\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
const csvRate = x => { const r = rateOf(x); return r === null ? '' : (r * 100).toFixed(1); };

function save(settings, kind, header, body, csvText, json) {
  const dir = path.resolve(ROOT, settings.outputFolder);
  fs.mkdirSync(dir, {recursive: true});
  const now = new Date(), two = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}_${two(now.getHours())}-${two(now.getMinutes())}-${two(now.getSeconds())}`;
  // Each run gets its own folder (report, CSV, JSON and tier images) named like its files.
  const name = `deck-sim-${kind}-${stamp}`;
  fs.mkdirSync(path.join(dir, name), {recursive: true});
  const base = path.join(dir, name, name);
  json.files = {txt: `${base}.txt`, csv: `${base}.csv`, json: `${base}.json`};
  fs.writeFileSync(`${base}.txt`, `${header}\n\n${body}\n`);
  fs.writeFileSync(`${base}.csv`, csvText);
  fs.writeFileSync(`${base}.json`, JSON.stringify(json, null, 1) + '\n');
  return json;
}

const seedFor = (base, pair) => (base + Math.imul(pair + 1, 0x85ebca6b)) >>> 0;
const tierCounts = decks => [1, 2, 3].map(t => decks.filter(d => d.tier === t).length);

// Every active T1-T3 deck plays every other deck. Returns the saved report object.
export async function runFull(settings, hooks = {}) {
  const {source, decks} = loadOpponentDecks(settings);
  checkDecks(decks, cardCatalog());
  const games = settings.gamesPerMatchup;
  const seed = Date.now() >>> 0;
  const jobs = [];
  // Decks only meet the other decks of their own tier.
  for (let a = 0; a < decks.length; a++) for (let b = a + 1; b < decks.length; b++) if (decks[a].tier === decks[b].tier) jobs.push({a, b, games, seed: seedFor(seed, jobs.length)});
  const counts = tierCounts(decks);
  hooks.onInfo?.(`Full list: ${decks.length} decks (T1 ${counts[0]}, T2 ${counts[1]}, T3 ${counts[2]}) from ${source}. Each deck plays every other deck in its own tier ${games} times, alternating who goes first: ${jobs.length.toLocaleString()} pairings.`);
  const run = await runJobs(decks, jobs, settings, hooks);
  const records = tally(decks, run.results);
  const rows = decks.map(({main, extra, ...deck}, i) => ({...deck, record: records[i]}))
    .sort((x, y) => x.tier - y.tier || (rateOf(y.record.all) ?? -1) - (rateOf(x.record.all) ?? -1));
  const header = [`Deck balance simulation — full list (${new Date().toLocaleString()})`,
    `Decks: ${decks.length} (T1 ${counts[0]}, T2 ${counts[1]}, T3 ${counts[2]}; T4 excluded) from ${source}`,
    `Each deck plays only the other decks of its own tier, ${games} duels per pairing, ${run.total} duels total, seed ${seed}. Both sides use the game CPU; 8,000 LP, 5-card hands, no relics or curses.`,
    `Win rate = (wins + draws/2) / finished duels against its own tier. Duels past turn ${settings.maxTurns} count as draws. Run time ${fmtTime(run.seconds)} on ${run.workers} workers.`].join('\n');
  const body = textTable(rows);
  const csvText = [['tier', 'character', 'deck_id', 'win_rate_pct', 'wins', 'losses', 'draws', 'turn_cap_draws', 'failed'].join(','),
    ...rows.map(({tier, character, deckId, record: r}) => [tier, character, deckId, csvRate(r.all), r.all.w, r.all.l, r.all.d, r.capped, r.failed].map(csvCell).join(','))].join('\r\n') + '\r\n';
  const pairings = run.results.map(({a, b, games}) => ({tier: decks[a].tier, a: decks[a].deckId, aCharacter: decks[a].character, b: decks[b].deckId, bCharacter: decks[b].character, aWins: games.filter(g => g.result === 'win').length, bWins: games.filter(g => g.result === 'loss').length, draws: games.filter(g => g.result === 'draw').length, failed: games.filter(g => g.result === 'failed').length}));
  const report = save(settings, 'full', header, body, csvText, {mode: 'full', scope: 'within-tier', createdAt: new Date().toISOString(), source, seed, settings, seconds: run.seconds, workers: run.workers, totalDuels: run.total, decks: rows, pairings});
  hooks.onInfo?.('Rendering tier images…');
  await addImages(report, report.files.json);
  return {...report, text: `${header}\n\n${body}`};
}

// Renders a report's PNGs next to it (three tier images for a full list, the matchup image for a
// custom entry) and records them (or the error) in its JSON.
export async function addImages(report, jsonFile) {
  try { report.images = await (report.mode === 'custom' ? exportCustomImage : exportTierImages)(report, jsonFile); delete report.imagesError; }
  catch (error) { report.imagesError = String(error?.message || error); }
  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 1) + '\n');
  return report;
}

// Quick re-test: only the bottom `perTier` decks of each tier in a previous full-list report play, each against
// every deck in its own tier. Only those decks get win rates; the others play fewer games and are not reported.
// `only` ([{tier, characterId}]) tests exactly those decks instead of the bottom ones.
export async function runFocus(settings, {reportFile, perTier = 5, only = null}, hooks = {}) {
  const previous = readReport(settings, reportFile);
  // Picking the bottom decks needs a full list; a chosen list can take its "before" rates from a focus report too.
  if (previous.mode !== 'full' && !(only && previous.mode === 'focus')) throw new Error('Focus mode needs a full-list report to pick the bottom decks from.');
  const {source, decks} = loadOpponentDecks(settings);
  checkDecks(decks, cardCatalog());
  const before = new Map(previous.decks.map(d => [`${d.tier}:${d.characterId}`, rateOf(d.record.all)]));
  const focus = new Set();
  if (only) decks.forEach((d, i) => { if (only.some(o => o.tier === d.tier && o.characterId === d.characterId)) focus.add(i); });
  else for (const tier of [1, 2, 3]) {
    decks.map((d, i) => ({i, rate: before.get(`${tier}:${d.characterId}`)})).filter(({i, rate}) => decks[i].tier === tier && rate !== undefined && rate !== null)
      .sort((x, y) => x.rate - y.rate).slice(0, perTier).forEach(({i}) => focus.add(i));
  }
  const games = settings.gamesPerMatchup;
  const seed = Date.now() >>> 0;
  const jobs = [];
  for (let a = 0; a < decks.length; a++) for (let b = a + 1; b < decks.length; b++) {
    if (decks[a].tier === decks[b].tier && (focus.has(a) || focus.has(b))) jobs.push({a, b, games, seed: seedFor(seed, jobs.length)});
  }
  hooks.onInfo?.(`Focus test: ${only ? `${focus.size} chosen decks` : `the bottom ${perTier} decks of each tier`} from ${path.basename(path.dirname(exportPath(settings, reportFile)))} each play every deck in their own tier ${games} times: ${jobs.length.toLocaleString()} pairings.`);
  const run = await runJobs(decks, jobs, settings, hooks);
  const records = tally(decks, run.results);
  const rows = [...focus].map(i => ({...(({main, extra, ...d}) => d)(decks[i]), record: records[i], before: before.get(`${decks[i].tier}:${decks[i].characterId}`)}))
    .sort((x, y) => x.tier - y.tier || (rateOf(y.record.all) ?? -1) - (rateOf(x.record.all) ?? -1));
  const header = [`Deck balance simulation — focus test (${new Date().toLocaleString()})`,
    `${only ? `${focus.size} chosen decks` : `Bottom ${perTier} decks per tier`} (before = ${reportFile}), each against every deck in its own tier, ${games} duels per pairing, ${run.total} duels total, seed ${seed}.`,
    `Both sides use the game CPU; 8,000 LP, 5-card hands, no relics or curses. Duels past turn ${settings.maxTurns} count as draws. Run time ${fmtTime(run.seconds)} on ${run.workers} workers.`].join('\n');
  const width = Math.max(10, ...rows.map(r => `T${r.tier} ${r.character}`.length));
  const body = [`${'Deck'.padEnd(width)}  ${'Before'.padStart(7)}  ${'Now'.padStart(7)}  ${'W-L-D'.padStart(11)}`, '-'.repeat(width + 34),
    ...rows.map(r => `${`T${r.tier} ${r.character}`.padEnd(width)}  ${(r.before === null || r.before === undefined ? '—' : `${(r.before * 100).toFixed(1)}%`).padStart(7)}  ${pct(r.record.all).padStart(7)}  ${`${r.record.all.w}-${r.record.all.l}-${r.record.all.d}`.padStart(11)}`)].join('\n');
  const csvText = ['tier,character,deck_id,before_pct,win_rate_pct,wins,losses,draws', ...rows.map(r => [r.tier, r.character, r.deckId, r.before == null ? '' : (r.before * 100).toFixed(1), csvRate(r.record.all), r.record.all.w, r.record.all.l, r.record.all.d].map(csvCell).join(','))].join('\r\n') + '\r\n';
  const report = save(settings, 'focus', header, body, csvText, {mode: 'focus', scope: 'within-tier', createdAt: new Date().toISOString(), source, seed, settings, seconds: run.seconds, workers: run.workers, totalDuels: run.total, basedOn: reportFile, perTier, decks: rows});
  return {...report, text: `${header}\n\n${body}`};
}

// One .ydk (path or pasted/uploaded text) against every active T1-T3 deck.
export async function runCustom(settings, {file, text, name}, hooks = {}) {
  const catalog = cardCatalog();
  if (file) {
    file = path.resolve(String(file).replace(/^["']|["']$/g, '').trim());
    if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
    text = fs.readFileSync(file, 'utf8');
    name = path.basename(file, path.extname(file));
  }
  name = name || 'Custom deck';
  // A pasted decklist is converted and saved under exports/decks so the deck can be reused.
  const converted = file ? null : decklistToYdk(text);
  if (converted) {
    text = converted;
    parseYdk(text, name, catalog);
    file = path.join(ROOT, 'exports', 'decks', `${name.replace(/[<>:"/\\|?*]+/g, '_')}.ydk`);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, text);
    hooks.onInfo?.(`Saved the pasted list as ${file}`);
  }
  const custom = parseYdk(text, name, catalog);
  const {source, decks: opponents} = loadOpponentDecks(settings);
  checkDecks(opponents, catalog);
  const decks = [{characterId: -1, character: name, tier: 0, deckId: file || name, ...custom}, ...opponents];
  const games = settings.customGamesPerMatchup;
  const seed = Date.now() >>> 0;
  const jobs = opponents.map((_, i) => ({a: 0, b: i + 1, games, seed: seedFor(seed, i)}));
  hooks.onInfo?.(`Custom entry: ${name} (${custom.main.length} Main / ${custom.extra.length} Extra) vs ${opponents.length} T1-T3 decks from ${source}, ${games} duels each.`);
  const run = await runJobs(decks, jobs, settings, hooks);
  const r = tally(decks, run.results, 0)[0];
  const opponentRows = run.results.map(({b, games}) => {
    const record = {w: 0, l: 0, d: 0};
    for (const g of games) if (short[g.result]) record[short[g.result]]++;
    return {tier: decks[b].tier, characterId: decks[b].characterId, character: decks[b].character, deckId: decks[b].deckId, record, failed: games.filter(g => g.result === 'failed').length, capped: games.filter(g => g.capped).length};
  }).sort((x, y) => x.tier - y.tier || x.character.localeCompare(y.character));
  const header = [`Deck balance simulation — custom entry (${new Date().toLocaleString()})`, `Deck: ${file || name}`,
    `${opponents.length} opponent decks (T4 excluded) from ${source}; ${games} duels each, ${run.total} total, seed ${seed}.`,
    `Both sides use the game CPU; 8,000 LP, 5-card hands, no relics or curses. Win rate counts draws as half; duels past turn ${settings.maxTurns} count as draws. Run time ${fmtTime(run.seconds)}.`].join('\n');
  const summary = [1, 2, 3].map(t => `vs T${t}: ${pct(r[t])}  (${r[t].w}-${r[t].l}-${r[t].d})`).join('\n') +
    `\nOverall: ${pct(r.all)}  (${r.all.w}-${r.all.l}-${r.all.d})${r.capped ? `, ${r.capped} turn-cap draws` : ''}${r.failed ? `, ${r.failed} failed` : ''}`;
  const body = `${summary}\n\nPer opponent:\n${opponentRows.map(o => `  T${o.tier} ${o.character.padEnd(28)} ${pct(o.record).padStart(7)}  ${o.record.w}-${o.record.l}-${o.record.d}`).join('\n')}`;
  const csvText = ['tier,opponent,deck_id,win_rate_pct,wins,losses,draws,failed', ...opponentRows.map(o => [o.tier, o.character, o.deckId, csvRate(o.record), o.record.w, o.record.l, o.record.d, o.failed].map(csvCell).join(','))].join('\r\n') + '\r\n';
  const report = save(settings, `custom-${name.replace(/[^\w-]+/g, '_')}`, header, body, csvText,
    {mode: 'custom', createdAt: new Date().toISOString(), name, deck: {file: file || null, ...custom}, source, seed, settings, seconds: run.seconds, workers: run.workers, totalDuels: run.total, record: r, opponents: opponentRows});
  hooks.onInfo?.('Rendering the matchup image…');
  await addImages(report, report.files.json);
  return {...report, text: `${header}\n\n${body}`};
}

// Saved reports, newest first: one per run folder (plus any loose reports from before run folders).
// `file` is the report's path relative to the output folder, with forward slashes.
export function listReports(settings) {
  const dir = path.resolve(ROOT, settings.outputFolder);
  if (!fs.existsSync(dir)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.isFile() && /^deck-sim-.*\.json$/.test(entry.name)) found.push(entry.name);
    else if (entry.isDirectory()) for (const f of fs.readdirSync(path.join(dir, entry.name))) if (/^deck-sim-.*\.json$/.test(f)) found.push(`${entry.name}/${f}`);
  }
  // Newest run first, by the timestamp in the name (reports get rewritten, e.g. when images are added).
  const stamp = file => file.match(/(\d{4}-\d\d-\d\d_\d\d-\d\d-\d\d)\.json$/)?.[1] || '';
  return found.map(file => ({file, mtime: fs.statSync(path.join(dir, file)).mtimeMs})).sort((a, b) => stamp(b.file).localeCompare(stamp(a.file)) || b.mtime - a.mtime);
}

// Resolves a path relative to the output folder, refusing anything outside it or of another kind.
export function exportPath(settings, file, pattern = /^deck-sim-.*\.json$/) {
  const dir = path.resolve(ROOT, settings.outputFolder);
  const target = path.resolve(dir, String(file));
  if (!target.startsWith(dir + path.sep) || !pattern.test(path.basename(target))) throw new Error('Not a deck-sim export.');
  return target;
}

export function readReport(settings, file) {
  return JSON.parse(fs.readFileSync(exportPath(settings, file), 'utf8'));
}
