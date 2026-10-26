import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const mobile=read('../../android/web/mobile.js');
const css=read('../../android/web/mobile.css');
const content=JSON.parse(read('../../android/web/content.json'));
const reward=mobile.slice(mobile.indexOf('function renderCursedRelics(){'));
assert.match(reward,/class="cursed-reward-topbar"/,'cursed relic choice has a top bar');
assert.match(reward,/btn\('View deck','draft'\)/,'top bar opens the current deck editor');
assert.match(reward,/btn\('Relics','relic-ledger'\)/,'top bar opens the run relic ledger');
assert.match(css,/\.cursed-reward-topbar\{[^}]*position:sticky;top:0/,'top bar stays at the top while choices scroll');
assert.match(mobile,/if\(a==='relic-ledger'\)\{if\(modal\.open&&modal\.querySelector\('\.reward-screen'\)\)/,'reward overlay only replaces content in an open reward dialog');
const razor=content.artifacts.razor[2];
assert.match(razor,/minimum number of cards in your Main Deck for this run/i,'Razor Ledger explains its dynamic deck-size minimum');
console.log('PASS cursed-reward top-bar tools, relic-overlay guard and Razor Ledger wording');
