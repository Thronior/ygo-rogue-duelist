import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {cardPlace,trackEffectTargets} from './web/selection-feedback.js';import {OcgLocation as L} from './web/vendor/package/dist/index.js';import {flipPerspective} from './web/tag-duel.js';
const M={BECOME_TARGET:1,CARD_SELECTED:2,RANDOM_SELECTED:3,CHAIN_SOLVED:4,CHAIN_NEGATED:5,CHAIN_DISABLED:6,CHAIN_END:7,NEW_TURN:8,NEW_PHASE:9,MOVE:10,SHUFFLE_HAND:11};const e={activeChain:[{link:1}]},card={controller:1,location:4,sequence:2,code:123};trackEffectTargets(e,{type:1,cards:[card]},M);assert.equal(e.effectTargets.length,1);assert(!('code' in e.effectTargets[0]));trackEffectTargets(e,{type:1,cards:[card]},M);assert.equal(e.effectTargets.length,1);trackEffectTargets(e,{type:4,chain_size:2},M);assert.equal(e.effectTargets.length,1);trackEffectTargets(e,{type:10,from:card,to:{controller:1,location:16,sequence:0}},M);assert.equal(e.effectTargets.length,0);trackEffectTargets(e,{type:1,cards:[card]},M);trackEffectTargets(e,{type:4,chain_size:1},M);assert.equal(e.effectTargets.length,0);console.log('PASS target lifetime, link isolation, deduplication, movement invalidation and hidden identity protection');

for(const type of [12,13]){trackEffectTargets(e,{type:1,cards:[card]},M);trackEffectTargets(e,{type}, {...M,SWAP:12,SHUFFLE_SET_CARD:13});assert.equal(e.effectTargets.length,0)}

// Every location and side has its label; the field-or-X panel keeps its own process and never gets one.
const places=[[L.DECK,'Deck','Opp Deck'],[L.HAND,'Hand','Opp Hand'],[L.EXTRA,'Extra','Opp Extra'],[L.GRAVE,'Your GY','Opp GY'],[L.REMOVED,'Your Banished','Opp Banished'],[L.MZONE,'Your Field','Opp Field'],[L.SZONE,'Your Field','Opp Field'],[L.MZONE|L.OVERLAY,'Your Material','Opp Material']];
for(const [location,mine,theirs] of places){assert.deepEqual(cardPlace({controller:0,location},L),{own:true,text:mine});assert.deepEqual(cardPlace({controller:1,location},L),{own:false,text:theirs})}
assert.equal(cardPlace({controller:0,location:0},L),null);assert.equal(cardPlace(undefined,L),null);assert.equal(cardPlace(flipPerspective({controller:1,location:L.GRAVE}),L).text,'Your GY');
const client=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8').split(/\r?\n/);
assert(!client.find(line=>line.includes('field-selection-panel')).includes('placeBadge'));
assert.equal(client.filter(line=>line.includes('placeBadge(c)}<span>')).length,2);
console.log('PASS location labels for every zone and side, field-or-X panel unchanged');
