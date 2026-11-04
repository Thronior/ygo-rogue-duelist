// Plays CPU-vs-CPU duels in the real core for deck_sim.mjs. Same setup as the game's
// Watch CPU Duel (cpu-viewer.js): 8,000 LP, five-card hands, seeded CPU shuffle, no
// campaign passives. engine.auto() answers whichever seat the prompt belongs to, so
// both duelists use the game's CPU policy.
import fs from 'node:fs';
import path from 'node:path';
import {parentPort, workerData} from 'node:worker_threads';
import {MobileDuel} from '../../android/web/duel.js';
import {shuffleCPUDeck} from '../../android/web/cpu-deck-model.js';

const NEUTRAL_PASSIVES = '-- SHADOW_RUN_RNG 2\nif Duel.EnableRogueAntiStreak then Duel.EnableRogueAntiStreak() end';
const {root, decks, maxTurns, maxDecisions} = workerData;
const web = path.join(root, 'android', 'web');
const readJson = name => JSON.parse(fs.readFileSync(path.join(web, name), 'utf8'));
const meta = readJson('content.json');
// workerData.scripts holds the shared utility scripts and the card scripts these decks use
// (sim_core.mjs prunes them once), so a worker never parses the 33 MB scripts.json and more
// workers fit in RAM. Any other card script (a token, a card an effect creates) loads from
// scripts.json on first use, so duels play exactly as with the full set.
const engine = await new MobileDuel([...(meta.cards || []), ...(meta.tokenCards || [])]).init([readJson('engine-data.json'), workerData.scripts]);
let missing = null;
engine.scripts = new Proxy(engine.scripts, {get(target, name) {
  if (typeof name !== 'string' || name in target || !/^c\d+\.lua$/.test(name)) return target[name];
  missing ??= readJson('scripts.json');
  target[name] = missing[name];
  setTimeout(() => { missing = null; });
  return target[name];
}});

// Result is from deck A's point of view: 'win', 'loss', 'draw' (finished draw or turn cap) or 'failed'.
function playGame(a, b, seed, aSeat) {
  const seats = aSeat === 0 ? [decks[a], decks[b]] : [decks[b], decks[a]];
  let state, decisions = 0;
  try {
    state = engine.start(shuffleCPUDeck(seats[0].main, seed, 0), shuffleCPUDeck(seats[1].main, seed, 1), 8000, 8000, 5, seed,
      seats[0].extra || [], seats[1].extra || [], NEUTRAL_PASSIVES);
    while (!state.finished && decisions < maxDecisions && state.turn <= maxTurns) {
      state = engine.respond(engine.auto());
      decisions++;
    }
    if (!state.finished) return {result: 'draw', capped: true, turns: state.turn};
    const winner = state.finished.player;
    return {result: winner !== 0 && winner !== 1 ? 'draw' : winner === aSeat ? 'win' : 'loss', turns: state.turn};
  } catch (error) {
    return {result: 'failed', error: String(error?.message || error), turns: state?.turn ?? 0};
  } finally {
    try { engine.destroy(); } catch {}
  }
}

parentPort.on('message', job => {
  if (job === 'stop') { process.exit(0); }
  const games = [];
  for (let g = 0; g < job.games; g++) {
    const seed = (job.seed + Math.imul(g + 1, 0x9e3779b9)) >>> 0;
    games.push(playGame(job.a, job.b, seed, g % 2));
    parentPort.postMessage({progress: 1});
  }
  parentPort.postMessage({done: true, a: job.a, b: job.b, games});
});
parentPort.postMessage({ready: true});
