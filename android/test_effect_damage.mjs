import fs from 'node:fs';import assert from 'node:assert/strict';
import {MobileDuel, M, L} from './web/duel.js';
const meta = JSON.parse(fs.readFileSync(new URL('./web/content.json', import.meta.url)));
const mk = () => {
  const e = new MobileDuel(meta.cards);
  Object.assign(e, {data: {}, lp: [8000, 8000], player: 0, activeChain: [], events: [],
    visuals: [], peak: {}, chainDepth: 0, selectionHint: null, battleProtected: [false, false]});
  e.query = () => [];
  return e;
};
// battle damage: our attack, no chain, damage to opponent
let e = mk();
e.onMessage({type: M.ATTACK, card: 1});
e.onMessage({type: M.DAMAGE, player: 1, amount: 1500});
assert(e.events.some(x => x.kind === 'damage' && x.amount === 1500));
assert(!e.events.some(x => x.kind === 'effect_damage'), 'battle misclassified');
// effect damage in main phase, no attack open
e = mk();
e.onMessage({type: M.DAMAGE, player: 1, amount: 800});
assert(e.events.some(x => x.kind === 'effect_damage' && x.amount === 800));
// burn chained to our attack still counts as effect damage
e = mk();
e.onMessage({type: M.ATTACK, card: 1});
e.onMessage({type: M.CHAINING, chain_size: 1, code: 2});
e.onMessage({type: M.DAMAGE, player: 1, amount: 600});
assert(e.events.some(x => x.kind === 'effect_damage' && x.amount === 600));
// battle resumes after the chain ends
e.onMessage({type: M.CHAIN_END});
e.onMessage({type: M.DAMAGE, player: 1, amount: 1500});
assert(!e.events.filter(x => x.kind === 'effect_damage').some(x => x.amount === 1500));
// new phase closes the attack window
e = mk();
e.onMessage({type: M.ATTACK, card: 1});
e.onMessage({type: M.NEW_PHASE});
e.onMessage({type: M.DAMAGE, player: 1, amount: 300});
assert(e.events.some(x => x.kind === 'effect_damage' && x.amount === 300));
// damage we take is never effect credit
e = mk();
e.onMessage({type: M.DAMAGE, player: 0, amount: 500});
assert(!e.events.some(x => x.kind === 'effect_damage'));
console.log('PASS effect-damage classification');
