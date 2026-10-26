#!/usr/bin/env node
// Run an input deck against every packaged T1-T3 CPU deck and export native replays.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MobileDuel, M, R, I, B} from '../android/web/duel.js';
import {shuffleCPUDeck} from '../android/web/cpu-deck-model.js';
import {replayVersion} from '../android/web/replay-version.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT_ROOT = path.join(ROOT, 'simulations', 'deck-matchups');
const MAX_DECISIONS_DEFAULT = 3000;
const NEUTRAL_PASSIVES = '-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';

function usage() {
  return `Deck matchup simulator\n\nUsage:\n  node tools/simulate_deck_matchups.mjs --deck <file> [options]\n\nInput formats: .ydk, JSON ({"main":[...],"extra":[...]}), or a text deck list\nwith card names/IDs, optionally prefixed with counts (for example, 3x Card Name [12345678]).\n\nOptions:\n  --deck <file>            Input deck file (required)\n  --games <number>         Duels per matchup (default: 10)\n  --seed <number>          Base random seed (default: generated)\n  --out <directory>        Exact output directory (default: a new folder under ${DEFAULT_OUT_ROOT})\n  --limit-matchups <n>     Run only the first n matchups (for smoke tests)\n  --opponent <text>        Filter matchups by character name or deck ID\n  --tier <1|2|3>           Only play the CPU decks of one tier\n  --trace-decisions        Save AI decision details to decisions.jsonl\n  --max-decisions <n>      Safety cap per duel (default: ${MAX_DECISIONS_DEFAULT})\n  --help                   Show this help\n\nEach run saves native replay JSON files, results.jsonl, overview.json, overview.md,\nand matchups.csv. Aggregate win rate counts each draw as half a win.`;
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    const [rawKey, inlineValue] = token.slice(2).split(/=(.*)/s, 2);
    const key = rawKey.replaceAll('-', '_');
    if (key === 'help') { options.help = true; continue; }
    if (key === 'trace_decisions') { options.trace_decisions = true; continue; }
    const value = inlineValue ?? argv[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for --${rawKey}`);
    options[key] = value;
  }
  return options;
}

const normalizeName = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck';
const replayStringify = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? {$bigint: String(item)} : item, 2);

function describeCard(engine, card) {
  if (!card?.code) return null;
  return {name: engine.name(card.code), code: Number(card.code), controller: card.controller, location: card.location, sequence: card.sequence, position: card.position};
}

function describeDecision(engine, message, response) {
  const enumName = (values, value) => Object.entries(values).find(([, code]) => code === value)?.[0] ?? value;
  const buckets = ['activates', 'chains', 'selects', 'summons', 'special_summons', 'monster_sets', 'spell_sets', 'pos_changes', 'attacks', 'tributes'];
  const options = Object.fromEntries(buckets.filter(key => Array.isArray(message[key]) && message[key].length)
    .map(key => [key, message[key].map(card => describeCard(engine, card)).filter(Boolean)]));
  let selected = [];
  if (message.type === M.SELECT_IDLECMD) {
    const actionBuckets = {[I.SELECT_ACTIVATE]: 'activates', [I.SELECT_SUMMON]: 'summons', [I.SELECT_SPECIAL_SUMMON]: 'special_summons', [I.SELECT_MONSTER_SET]: 'monster_sets', [I.SELECT_SPELL_SET]: 'spell_sets', [I.SELECT_POS_CHANGE]: 'pos_changes'};
    const bucket = actionBuckets[response.action];
    if (bucket && Number.isInteger(response.index)) selected = [options[bucket]?.[response.index]].filter(Boolean);
  } else if ([M.SELECT_BATTLECMD, M.SELECT_CHAIN].includes(message.type)) {
    if (Number.isInteger(response.index)) selected = [describeCard(engine, (message.type === M.SELECT_CHAIN ? (message.chains || message.selects) : response.action === B.SELECT_BATTLE ? message.attacks : message.chains)?.[response.index])].filter(Boolean);
  } else if (Array.isArray(response.indicies)) selected = response.indicies.map(index => describeCard(engine, message.selects?.[index])).filter(Boolean);
  else if (Number.isInteger(response.index)) selected = [describeCard(engine, message.selects?.[response.index])].filter(Boolean);
  const effectCode = engine.effect?.code || 0;
  return {turn: engine.turn, phase: engine.phase, player: message.player, prompt: enumName(M, message.type), effect: effectCode ? engine.name(effectCode) : null,
    code: message.code ? engine.name(message.code) : null, options, response: {...response, type: enumName(R, response.type), action: response.action === undefined ? undefined : enumName(message.type === M.SELECT_BATTLECMD ? B : I, response.action)}, selected};
}

function makeCardLookup(cards) {
  const byId = new Map();
  const byName = new Map();
  for (const card of cards) {
    if (!Number.isInteger(Number(card.id))) continue;
    const id = Number(card.id);
    byId.set(id, card);
    const key = normalizeName(card.name);
    if (key && !byName.has(key)) byName.set(key, card);
  }
  return {byId, byName};
}

function resolveCard(value, lookup, sourceLine) {
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const id = Number(text);
    if (!lookup.byId.has(id)) throw new Error(`Unknown card ID ${id} in ${sourceLine}`);
    return id;
  }
  const idMatch = text.match(/\[(\d+)\]\s*$/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    if (!lookup.byId.has(id)) throw new Error(`Unknown card ID ${id} (${text})`);
    return id;
  }
  const card = lookup.byName.get(normalizeName(text));
  if (!card) throw new Error(`Unknown card name "${text}" in ${sourceLine}`);
  return Number(card.id);
}

function parseEntry(raw, zone, lookup, sourceLine) {
  if (Number.isInteger(raw)) return [resolveCard(raw, lookup, sourceLine)];
  if (raw && typeof raw === 'object') {
    const count = Number(raw.count ?? raw.quantity ?? 1);
    const value = raw.id ?? raw.code ?? raw.name;
    if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error(`Invalid card count in ${sourceLine}`);
    return Array.from({length: count}, () => resolveCard(value, lookup, sourceLine));
  }
  if (typeof raw !== 'string') throw new Error(`Invalid card entry in ${sourceLine}`);
  let text = raw.trim();
  let count = 1;
  const prefix = text.match(/^\+?(\d+)\s*(?:x|×|\*)\s*/i) || text.match(/^\+?(\d+)\s+(?=[^\d])/);
  if (prefix) {
    count = Number(prefix[1]);
    text = text.slice(prefix[0].length).trim();
  }
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error(`Invalid card count in ${sourceLine}`);
  const id = resolveCard(text, lookup, sourceLine);
  return Array.from({length: count}, () => id);
}

function parseTextDeck(text, lookup) {
  const deck = {main: [], extra: []};
  let zone = 'main';
  for (const [index, original] of text.split(/\r?\n/).entries()) {
    let line = original.trim().replace(/^(?:[-*•]\s*)/, '');
    if (!line || line.startsWith('//')) continue;
    const marker = line.toLowerCase();
    if (marker === '#main' || marker === '#extra') { zone = marker.slice(1); continue; }
    if (marker === '!side' || marker === '#side') { zone = null; continue; }
    if (line.startsWith('#')) continue;
    const heading = marker.match(/^(main|extra|side)(?:\s+deck)?(?:\s*\(\d+(?:\s+cards?)?\))?\s*:?$/);
    if (heading) { zone = heading[1] === 'side' ? null : heading[1]; continue; }
    if (/^(?:decklist|deck list|cards?)\s*:?$/i.test(line)) continue;
    if (!zone) continue;
    const suffix = line.match(/\s+\((main|extra|side)\)\s*$/i);
    const targetZone = suffix ? suffix[1].toLowerCase() : zone;
    if (suffix) line = line.slice(0, suffix.index).trim();
    if (targetZone === 'side') continue;
    deck[targetZone].push(...parseEntry(line, targetZone, lookup, `line ${index + 1}`));
  }
  return deck;
}

function parseJsonDeck(text, lookup) {
  let input;
  try { input = JSON.parse(text); } catch (error) { throw new Error(`Invalid JSON deck: ${error.message}`); }
  if (!input || typeof input !== 'object') throw new Error('JSON deck must be an object with main and optional extra arrays.');
  const deck = {main: [], extra: []};
  for (const zone of ['main', 'extra']) {
    const entries = input[zone] ?? input[`${zone}Deck`] ?? [];
    if (!Array.isArray(entries)) throw new Error(`JSON field "${zone}" must be an array.`);
    for (const [index, entry] of entries.entries()) deck[zone].push(...parseEntry(entry, zone, lookup, `${zone}[${index}]`));
  }
  return deck;
}

function readInputDeck(file, lookup) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (path.extname(file).toLowerCase() === '.json') return parseJsonDeck(text, lookup);
  return parseTextDeck(text, lookup);
}

function validateDeck(deck, lookup) {
  if (!deck.main.length) throw new Error('The input deck has no cards in its Main Deck.');
  for (const zone of ['main', 'extra']) {
    for (const id of deck[zone]) {
      const card = lookup.byId.get(id);
      if (!card) throw new Error(`Unknown card ID ${id}.`);
      const isExtra = !!(Number(card.data?.type) & 64);
      if (isExtra !== (zone === 'extra')) {
        throw new Error(`${card.name} (${id}) belongs in the ${isExtra ? 'Extra' : 'Main'} Deck, but is listed in ${zone}.`);
      }
    }
  }
}

function currentMatchups(meta) {
  const all = [];
  // cpuWatchDecks is the full catalog exposed by Watch CPU Duel, including
  // standalone character opponents that are absent from the campaign cpuDecks map.
  const catalog = meta.cpuWatchDecks || meta.cpuDecks || {};
  for (const [characterId, decks] of Object.entries(catalog)) {
    for (const deck of decks || []) {
      const labelTier = String(deck?.label || '').match(/^Tier\s*([1-3])$/i)?.[1];
      const tier = Number(deck?.tier ?? labelTier);
      if (![1, 2, 3].includes(tier) || !Array.isArray(deck.main) || !deck.main.length) continue;
      const character = meta.cpuWatchOpponents?.[characterId]?.name || deck.name || meta.characters?.[Number(characterId)]?.name || `Character ${characterId}`;
      const campaignDeck = (meta.cpuDecks?.[characterId] || []).find(item => Number(item.tier) === tier);
      const deckId = deck.deck || campaignDeck?.deck || `${slug(character)}-tier-${tier}`;
      all.push({characterId: Number(characterId), character, tier, deckId, main: deck.main, extra: deck.extra || []});
    }
  }
  all.sort((a, b) => a.tier - b.tier || a.character.localeCompare(b.character) || a.characterId - b.characterId);
  if (!all.length) throw new Error('No T1, T2, or T3 CPU decks were found in android/web/content.json.');
  return all;
}

function cardCounts(ids, byId) {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].map(([id, count]) => ({id, name: byId.get(id)?.name || `Card ${id}`, count}));
}

function safeWrite(file, text) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, text);
  fs.renameSync(temp, file);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function summarize(matchups, records, plannedPerMatchup) {
  const rows = matchups.map(matchup => {
    const games = records.filter(record => record.tier === matchup.tier && record.characterId === matchup.characterId && record.deckId === matchup.deckId);
    const wins = games.filter(game => game.status === 'completed' && game.winner === 'input').length;
    const losses = games.filter(game => game.status === 'completed' && game.winner === 'opponent').length;
    const draws = games.filter(game => game.status === 'completed' && game.winner === 'draw').length;
    const failed = games.filter(game => game.status === 'failed').length;
    const unfinished = games.filter(game => game.status === 'unfinished').length;
    const completed = wins + losses + draws;
    return {...matchup, planned: plannedPerMatchup,
      completed, wins, losses, draws, failed, unfinished, winRate: completed ? (wins + draws / 2) / completed : null,
      replayDirectory: path.join('replays', `tier-${matchup.tier}`, slug(`${matchup.character}-${matchup.characterId}-${matchup.deckId}`)).split(path.sep).join('/')};
  });
  const tiers = [1, 2, 3].map(tier => {
    const matches = rows.filter(row => row.tier === tier);
    const wins = matches.reduce((sum, row) => sum + row.wins, 0);
    const losses = matches.reduce((sum, row) => sum + row.losses, 0);
    const draws = matches.reduce((sum, row) => sum + row.draws, 0);
    const completed = wins + losses + draws;
    return {tier, matchups: matches.length, completed, wins, losses, draws,
      failed: matches.reduce((sum, row) => sum + row.failed, 0),
      unfinished: matches.reduce((sum, row) => sum + row.unfinished, 0),
      winRate: completed ? (wins + draws / 2) / completed : null};
  });
  return {matchups: rows, tiers};
}

function makeMarkdown({manifest, deck, cardLookup, summary}) {
  const percent = value => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
  const lines = [
    '# Deck Matchup Simulation', '',
    `- Input deck: **${manifest.deckName}** (${deck.main.length} Main / ${deck.extra.length} Extra)`,
    `- Games per matchup: **${manifest.gamesPerMatchup}**`,
    `- Opponent decks: **${manifest.matchups.length}** (${manifest.matchups.length * manifest.gamesPerMatchup} planned duels)`,
    `- Seed: **${manifest.seed}**`,
    `- Game CPU build: **${manifest.gameBuild}**`,
    '- Rules: 8,000 LP each, five-card starting hands, no run relics/curses; both sides use the game CPU.',
    '- Win rate counts draws as half a win; failed and unfinished duels are excluded from the rate.', '',
    '## Tier results', '',
    '| Tier | Matchups | Completed | Wins | Losses | Draws | Failed / unfinished | Win rate |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const tier of summary.tiers) lines.push(`| T${tier.tier} | ${tier.matchups} | ${tier.completed} | ${tier.wins} | ${tier.losses} | ${tier.draws} | ${tier.failed} / ${tier.unfinished} | ${percent(tier.winRate)} |`);
  for (const tier of [1, 2, 3]) {
    lines.push('', `## T${tier} matchups`, '', '| Opponent | Completed | Wins | Losses | Draws | Failed / unfinished | Win rate | Replays |', '|---|---:|---:|---:|---:|---:|---:|---|');
    for (const row of summary.matchups.filter(item => item.tier === tier)) {
      lines.push(`| ${row.character} (${row.deckId}) | ${row.completed} | ${row.wins} | ${row.losses} | ${row.draws} | ${row.failed} / ${row.unfinished} | ${percent(row.winRate)} | \`${row.replayDirectory}\` |`);
    }
  }
  lines.push('', '## Input deck', '');
  for (const zone of ['main', 'extra']) {
    lines.push(`### ${zone === 'main' ? 'Main' : 'Extra'} Deck (${deck[zone].length})`, '');
    for (const item of cardCounts(deck[zone], cardLookup)) lines.push(`- ${item.count}× ${item.name} [${item.id}]`);
    if (!deck[zone].length) lines.push('- (empty)');
    lines.push('');
  }
  return lines.join('\n');
}

function writeReports(outDir, manifest, deck, lookup, matchups, records) {
  const summary = summarize(matchups, records, manifest.gamesPerMatchup);
  const report = {schemaVersion: 1, generatedAt: new Date().toISOString(), run: manifest,
    inputDeck: {main: cardCounts(deck.main, lookup.byId), extra: cardCounts(deck.extra, lookup.byId)},
    tierSummary: summary.tiers, matchups: summary.matchups};
  safeWrite(path.join(outDir, 'overview.json'), `${JSON.stringify(report, null, 2)}\n`);
  safeWrite(path.join(outDir, 'overview.md'), makeMarkdown({manifest, deck, cardLookup: lookup.byId, summary}) + '\n');
  const columns = ['tier', 'character', 'character_id', 'deck_id', 'planned', 'completed', 'wins', 'losses', 'draws', 'failed', 'unfinished', 'win_rate_percent', 'replay_directory'];
  const csv = [columns.join(','), ...summary.matchups.map(row => [row.tier, row.character, row.characterId, row.deckId, manifest.gamesPerMatchup, row.completed, row.wins, row.losses, row.draws, row.failed, row.unfinished, row.winRate === null ? '' : (row.winRate * 100).toFixed(1), row.replayDirectory].map(csvCell).join(','))].join('\r\n');
  safeWrite(path.join(outDir, 'matchups.csv'), csv + '\r\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(usage()); return; }
  if (!args.deck) throw new Error(`--deck is required.\n\n${usage()}`);
  const inputPath = path.resolve(args.deck);
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) throw new Error(`Deck file not found: ${inputPath}`);
  const games = Number(args.games ?? 10);
  const maxDecisions = Number(args.max_decisions ?? MAX_DECISIONS_DEFAULT);
  if (!Number.isInteger(games) || games < 1 || games > 1000) throw new Error('--games must be an integer from 1 to 1000.');
  if (!Number.isInteger(maxDecisions) || maxDecisions < 1) throw new Error('--max-decisions must be a positive integer.');
  if (args.seed !== undefined && !Number.isInteger(Number(args.seed))) throw new Error('--seed must be an integer.');
  const seed = args.seed === undefined ? (Date.now() >>> 0) : Number(args.seed) >>> 0;
  const contentPath = path.join(ROOT, 'android', 'web', 'content.json');
  const meta = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  const allCards = [...(meta.cards || []), ...(meta.tokenCards || [])];
  const lookup = makeCardLookup(allCards);
  const deck = readInputDeck(inputPath, lookup);
  validateDeck(deck, lookup);
  let matchups = currentMatchups(meta);
  if (args.tier !== undefined) {
    const tier = Number(args.tier);
    if (![1, 2, 3].includes(tier)) throw new Error('--tier must be 1, 2 or 3.');
    matchups = matchups.filter(item => item.tier === tier);
  }
  if (args.opponent) {
    const query = normalizeName(args.opponent);
    matchups = matchups.filter(item => normalizeName(item.character).includes(query) || normalizeName(item.deckId).includes(query));
    if (!matchups.length) throw new Error(`No T1-T3 matchup matched --opponent ${args.opponent}.`);
  }
  if (args.limit_matchups !== undefined) {
    const limit = Number(args.limit_matchups);
    if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit-matchups must be a positive integer.');
    matchups = matchups.slice(0, limit);
  }
  for (const matchup of matchups) for (const id of [...matchup.main, ...matchup.extra]) {
    if (!lookup.byId.has(Number(id))) throw new Error(`${matchup.character} T${matchup.tier} (${matchup.deckId}) contains unknown card ID ${id}. Rebuild android/web/content.json before simulating.`);
  }
  const deckName = path.basename(inputPath, path.extname(inputPath));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(args.out || path.join(DEFAULT_OUT_ROOT, `${slug(deckName)}-${timestamp}`));
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length) throw new Error(`Output directory is not empty: ${outDir}\nChoose another path with --out.`);
  fs.mkdirSync(outDir, {recursive: true});
  const manifest = {schemaVersion: 1, createdAt: new Date().toISOString(), deckName, inputFile: inputPath, opponentCatalog: meta.cpuWatchDecks ? 'Watch CPU Duel catalog' : 'campaign CPU catalog',
    gamesPerMatchup: games, seed, gameBuild: replayVersion,
    rules: {startingLP: 8000, startingHand: 5, campaignModifiers: 'none', rng: 'seeded Shadow Run RNG with anti-streak enabled'},
    opponentDeckCount: matchups.length, plannedDuels: matchups.length * games,
    matchups: matchups.map(({characterId, character, tier, deckId}) => ({characterId, character, tier, deckId}))};
  safeWrite(path.join(outDir, 'run.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  const resultFile = path.join(outDir, 'results.jsonl');
  const traceFile = args.trace_decisions ? path.join(outDir, 'decisions.jsonl') : null;
  const resources = [
    JSON.parse(fs.readFileSync(path.join(ROOT, 'android', 'web', 'engine-data.json'), 'utf8')),
    JSON.parse(fs.readFileSync(path.join(ROOT, 'android', 'web', 'scripts.json'), 'utf8'))
  ];
  const engine = await new MobileDuel(allCards).init(resources);
  let completedAttempts = 0;
  const total = matchups.length * games;
  let matchupIndex = 0;
  const records = [];
  console.log(`Running ${games} duels against ${matchups.length} T1-T3 decks (${total} total).`);
  console.log(`Output: ${outDir}`);
  try {
    for (const matchup of matchups) {
      matchupIndex++;
      const replayDir = path.join(outDir, 'replays', `tier-${matchup.tier}`, slug(`${matchup.character}-${matchup.characterId}-${matchup.deckId}`));
      fs.mkdirSync(replayDir, {recursive: true});
      const gameResults = [];
      for (let gameNumber = 1; gameNumber <= games; gameNumber++) {
        const globalIndex = (matchupIndex - 1) * games + (gameNumber - 1);
        const gameSeed = (seed + Math.imul(globalIndex + 1, 0x9e3779b9)) >>> 0;
        const inputSeat = (gameNumber - 1) % 2;
        const opponent = {main: matchup.main, extra: matchup.extra};
        const seats = inputSeat === 0 ? [deck, opponent] : [opponent, deck];
        const main0 = shuffleCPUDeck(seats[0].main, gameSeed, 0);
        const main1 = shuffleCPUDeck(seats[1].main, gameSeed, 1);
        let status = 'failed';
        let winner = null;
        let finishReason = null;
        let turns = 0;
        let decisions = 0;
        let errors = [];
        let state = null;
        let failure = null;
        const decisionTrace = [];
        const replayFile = path.join(replayDir, `game-${String(gameNumber).padStart(2, '0')}.json`);
        const record = {game: gameNumber, tier: matchup.tier, character: matchup.character, characterId: matchup.characterId, deckId: matchup.deckId,
          seed: gameSeed, inputSeat, status, winner, finishReason, turns, decisions, errors, replay: path.relative(outDir, replayFile).split(path.sep).join('/')};
        try {
          state = engine.start(main0, main1, 8000, 8000, 5, gameSeed, seats[0].extra || [], seats[1].extra || [], NEUTRAL_PASSIVES);
          while (!state.finished && decisions < maxDecisions) {
            const prompt = engine.pending;
            const response = engine.auto();
            if (traceFile && prompt && [M.SELECT_IDLECMD, M.SELECT_BATTLECMD, M.SELECT_CHAIN, M.SELECT_EFFECTYN, M.SELECT_YESNO, M.SELECT_CARD, M.SELECT_SUM, M.SELECT_TRIBUTE, M.SELECT_OPTION, M.SELECT_POSITION, M.SELECT_PLACE, M.SELECT_UNSELECT_CARD].includes(prompt.type)) {
              decisionTrace.push(describeDecision(engine, prompt, response));
            }
            state = engine.respond(response);
            decisions++;
          }
          turns = state.turn;
          errors = [...engine.errors];
          if (state.finished) {
            status = 'completed';
            finishReason = state.finished.reason ?? null;
            if (state.finished.player !== 0 && state.finished.player !== 1) winner = 'draw';
            else winner = state.finished.player === inputSeat ? 'input' : 'opponent';
          } else {
            status = 'unfinished';
          }
        } catch (error) {
          failure = String(error?.stack || error);
          errors = [...engine.errors, `EXCEPTION: ${String(error?.message || error)}`];
        } finally {
          if (state?.finished && engine.replayRecord) engine.replayRecord.ended = true;
          const nativeReplay = engine.replayRecord ? JSON.parse(replayStringify(engine.replayRecord)) : null;
          if (nativeReplay) safeWrite(replayFile, `${JSON.stringify(nativeReplay)}\n`);
          try { engine.destroy(); } catch {}
        }
        Object.assign(record, {status, winner, finishReason, turns, decisions, errors, failure});
        if (traceFile && decisionTrace.length) fs.appendFileSync(traceFile,
          decisionTrace.map(item => JSON.stringify({...record, ...item})).join('\n') + '\n');
        fs.appendFileSync(resultFile, `${JSON.stringify(record)}\n`);
        records.push(record);
        gameResults.push(record);
        completedAttempts++;
        process.stdout.write(`\rT${matchup.tier} ${matchup.character} · ${completedAttempts}/${total} duels`);
      }
      const wins = gameResults.filter(game => game.status === 'completed' && game.winner === 'input').length;
      const losses = gameResults.filter(game => game.status === 'completed' && game.winner === 'opponent').length;
      const draws = gameResults.filter(game => game.status === 'completed' && game.winner === 'draw').length;
      const failed = gameResults.filter(game => game.status !== 'completed').length;
      const rate = wins + losses + draws ? ((wins + draws / 2) / (wins + losses + draws) * 100).toFixed(1) : 'n/a';
      console.log(`\nT${matchup.tier} ${matchup.character} (${matchup.deckId}): ${wins}-${losses}-${draws}, ${rate}%${failed ? `, ${failed} incomplete/failed` : ''}`);
    }
  } finally {
    try { engine.destroy(); } catch {}
  }
  writeReports(outDir, manifest, deck, lookup, matchups, records);
  console.log(`\nReports: ${path.join(outDir, 'overview.md')} · ${path.join(outDir, 'overview.json')} · ${path.join(outDir, 'matchups.csv')}`);
  console.log(`Native replays: ${path.join(outDir, 'replays')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`\nSimulation failed: ${error.message || error}`); process.exitCode = 1; });
}
