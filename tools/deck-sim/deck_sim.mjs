#!/usr/bin/env node
// Terminal front end for the deck balance simulator (the desktop shortcut opens deck_sim_ui.mjs).
// Usage: deck_sim.mjs            menu
//        deck_sim.mjs full       full round robin
//        deck_sim.mjs custom <file.ydk>
import readline from 'node:readline/promises';
import {SETTINGS_FILE, loadSettings, runFull, runCustom, fmtTime} from './sim_core.mjs';

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
  if (report.images) console.log(`Tier images:\n  ${report.images.join('\n  ')}`);
  if (report.imagesError) console.log(`Tier images failed: ${report.imagesError}`);
}

async function main() {
  const settings = loadSettings();
  const args = process.argv.slice(2);
  if (args[0] === 'full') return print(await runFull(settings, consoleHooks()));
  if (args[0] === 'custom' && args[1]) return print(await runCustom(settings, {file: args[1]}, consoleHooks()));
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
