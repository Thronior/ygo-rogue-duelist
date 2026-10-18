import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deckCardMarkup, deckStats } from '../../android/web/feedback-ui.js';
import { smartContext } from '../../android/web/smart_policy.js';
import { L } from '../../android/web/engine.js';

const content = JSON.parse(fs.readFileSync(new URL('../../android/web/content.json', import.meta.url), 'utf8'));
const ox = content.cards.find(card => card.name === 'Battle Ox');
assert.ok(ox);

assert.deepEqual(deckStats(ox, { artifacts: [], challenge_level: 0 }, 0, content.artifactInfo), [ox.atk, ox.defense]);

const relicRun = { artifacts: ['sword_and_shield'], challenge_level: 0 };
assert.deepEqual(deckStats(ox, relicRun, 0, content.artifactInfo), [ox.defense, ox.atk]);
assert.deepEqual(deckStats(ox, { ...relicRun, challenge_level: -1 }, 0, content.artifactInfo), [ox.defense, ox.atk]);
const markup = deckCardMarkup('<button></button>', ox, { ...relicRun, pool: [ox.id], new_cards_from: 0 }, 0, content.artifactInfo);
assert.ok(markup.includes(`aria-label="ATK ${ox.defense}, DEF ${ox.atk}"`));

const candidateId = 99000001;
const candidateData = { attack: 800, defense: 2000, level: 4, race: 'Warrior', attribute: 'EARTH', type: 1 };
const candidate = { code: candidateId, location: L.HAND, controller: 1, attack: 800, defense: 2000, position: 0 };
function cpuContext(hasRelic) {
  return {
    turn: 1,
    player: 1,
    phase: 0,
    lp: [8000, 8000],
    aiModifiers: { activeRelics: [hasRelic ? ['sword_and_shield'] : [], []], statRelics: [[], []] },
    data: { [candidateId]: candidateData },
    cards: new Map([[candidateId, { name: 'High Defense Test Monster', desc: '' }]]),
    query: () => [],
    name: () => 'High Defense Test Monster',
    unknownDefense: () => 1000,
  };
}

const withoutRelic = smartContext(cpuContext(false), 1, L, { to_bp: false });
const withRelic = smartContext(cpuContext(true), 1, L, { to_bp: false });
assert.equal(withoutRelic.projectedAttack(candidate), 800);
assert.equal(withoutRelic.preferSet(candidate), true);
assert.equal(withRelic.projectedAttack(candidate), 2000);
assert.equal(withRelic.preferSet(candidate), false);

console.log('PASS Sword and Shield deck stats and CPU summon/set forecasts.');
