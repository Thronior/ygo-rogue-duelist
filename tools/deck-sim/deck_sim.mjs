#!/usr/bin/env node
// Terminal front end for the deck balance simulator (the desktop shortcut opens deck_sim_ui.mjs).
// Usage: deck_sim.mjs            menu
//        deck_sim.mjs focus [report.json] [perTier | decks.json]   bottom (or listed) decks vs their tier
//        deck_sim.mjs full       full round robin
//        deck_sim.mjs custom <file.ydk>
import fs from 'node:fs';
import readline from 'node:readline/promises';
import {SETTINGS_FILE, loadSettings, runFull, runCustom, runFocus, listReports, fmtTime} from './sim_core.mjs';

function consoleHooks() {
  let last = 0;
  return {
    onInfo: text => console.log(`\n${text}`),
    onStart: ({total, workers}) => console.log(`Starting ${workers} worker thread${workers === 1 ? '' : 's'} for ${total.toLocaleString()} duels...`),
    onProgress: ({done, total, elapsed}) => {
      const now = Date.now();
      if (now - last < 500 && done < total) return;
      last = now;
      process.stdout.write(`\r  ${done.toLocaleString()}/${total.toLocaleString()} duels (${(done / total * 100).toFixed(1)}%)  elapsed ${fmtTime(elapsed)}  ETA ${fmtTime(elapsed / done * (total - done))}     `);
    }
  };
}

function print(report) {
  console.log(`\n\n${report.text}\n\nSaved: ${report.files.txt} (+ .csv, .json)`);
  if (report.images) console.log(`Images:\n  ${report.images.join('\n  ')}`);
  if (report.imagesError) console.log(`Images failed: ${report.imagesError}`);
}

async function main() {
  const settings = loadSettings();
  const args = process.argv.slice(2);
  if (args[0] === 'full') return print(await runFull(settings, consoleHooks()));
  if (args[0] === 'custom' && args[1]) return print(await runCustom(settings, {file: args[1]}, consoleHooks()));
  // deck_sim.mjs focus [report.json] [perTier]: bottom decks of the newest (or given) full list vs their tier.
  if (args[0] === 'focus') {
    const report = args[1] || listReports(settings).find(r => /deck-sim-full-/.test(r.file))?.file;
    if (!report) throw new Error('No full-list report to pick the bottom decks from.');
    // A third argument ending in .json lists the decks to test ([{tier, characterId}]) instead of a bottom-N count.
    const only = /\.json$/i.test(args[2] || '') ? JSON.parse(fs.readFileSync(args[2], 'utf8')) : null;
    return print(await runFocus(settings, {reportFile: report, perTier: only ? 0 : Number(args[2] || 5), only}, consoleHooks()));
  }
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  try {
    console.log('YGO Rogue Duelist — deck balance simulator (CPU vs CPU, real duel core)');
    console.log(`Decks: ${settings.useActiveGameDecks ? 'active game decks (live)' : 'packaged content.json'} · full list ${settings.gamesPerMatchup} duels per pairing, custom ${settings.customGamesPerMatchup} per opponent · T4 excluded`);
    console.log(`Settings: ${SETTINGS_FILE}\n\n  1: Full list\n  2: Custom entry\n`);
    const choice = (await rl.question('Choose 1 or 2: ')).trim();
    if (choice === '1') print(await runFull(settings, consoleHooks()));
    else if (choice === '2') {
      const file = (await rl.question('Path to a .ydk file: ')).trim();
      if (file) print(await runCustom(settings, {file}, consoleHooks()));
    } else console.log('Nothing chosen.');
  } finally {
    rl.close();
  }
}

main().catch(error => { console.error(`\nDeck simulation failed: ${error.message || error}`); process.exitCode = 1; });
