// Randomized card texts are never partly translated (Discord 2026-11-22, German: "…declares an attack: Eig. opponent
// shuffles…": the "Name: text" fallback and the "Your {0}" pattern translated one word of an English effect).
// For every language: a registered randomized text comes back whole (unchanged English), and the same text without
// registering shows the old problem is still reachable, so the check is not empty. UI words still translate.
//   runtime/ai/node.exe tools/test_i18n_random_text.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const WEB = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'android', 'web');
globalThis.document = {documentElement: {lang: 'en'}, querySelectorAll: () => [], body: null};
globalThis.localStorage = {getItem: () => null, setItem() {}};
globalThis.MutationObserver = class { observe() {} disconnect() {} };
globalThis.fetch = async url => ({ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(WEB, url), 'utf8'))});
const i18n = await import(pathToFileURL(path.join(WEB, 'i18n.js')).href);

const texts = [
  'When a Tribute Summoned monster your opponent controls declares an attack: Your opponent shuffles their hand into the Deck, then draws the same number of cards.',
  '2 Warrior monsters + 1 EARTH monster\nOnce per turn: You can target 1 face-up monster on the field; it loses 500 DEF until the End Phase.',
  'Your opponent cannot activate Trap Cards during the Battle Phase.',
];
let failed = 0, partlyBefore = 0;
for (const [code] of i18n.LANGUAGES) {
  if (code === 'en') continue;
  await i18n.setLanguage(code, {remember: false});
  for (const text of texts) {
    const unregistered = i18n.t(text);
    if (unregistered !== text) partlyBefore++;
    i18n.keepEnglish(text);
    for (const run of [text, ...text.split('\n')]) {
      const shown = i18n.t(run);
      if (shown !== run) { failed++; console.log(`FAIL ${code}: "${run.slice(0, 60)}…" became "${shown.slice(0, 80)}…"`); }
    }
  }
  if (i18n.t('Close') === 'Close') { failed++; console.log(`FAIL ${code}: UI words stopped translating`); }
}
if (failed) { console.log(`${failed} problems`); process.exit(1); }
console.log(`PASS: randomized texts stay whole in ${i18n.LANGUAGES.length - 1} languages (${partlyBefore} would have been partly translated without it); UI still translates`);
