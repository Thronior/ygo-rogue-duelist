// Ultimate Collector deck editor on the shared solo editor (collector-deck.js, user 2026-11-21).
import assert from 'node:assert/strict';
import {zonesFor,deckFromZones,sectionView,toggleZone,nameCounts} from './web/collector-deck.js';
import {groupStacks,applyTaps} from './web/deck-stacks.js';

// Each copy gets one zone; copies beyond the deck stay free.
const pool=[1,1,2,3,3,3,9];
let zones=zonesFor(pool,{main:[1,3],side:[3],extra:[9]});
assert.deepEqual(zones,['main',null,null,'main','side',null,'extra']);
assert.deepEqual(deckFromZones(pool,zones),{main:[1,3],side:[3],extra:[9]});

// Deck shows everything not in the Side Deck; Side shows everything not in Main or Fusion.
assert.deepEqual(sectionView(zones,'deck',false),{visible:[0,1,2,3,5,6],selected:[0,3,5]});
assert.deepEqual(sectionView(zones,'side',false),{visible:[1,2,4,5],selected:[2]});
assert.deepEqual(sectionView(zones,'deck',true).visible.length,pool.length);

// Taps: the tapped copy changes (not the first free one), Fusion Monsters go to the Fusion Deck.
assert.equal(toggleZone(zones,1,'deck',false,false),'main');
assert.equal(toggleZone(zones,0,'deck',false,false),null);
assert.deepEqual(zones.slice(0,2),[null,'main']);
assert.equal(toggleZone(zones,2,'side',false,false),'side');
assert.equal(toggleZone(zones,2,'side',false,false),null);
assert.equal(toggleZone(zones,5,'deck',false,true),'extra');

// Siding moves between the Deck and the Side Deck; nothing is left out.
const side=zonesFor([5,5,7],{main:[5],side:[5],extra:[7]});
assert.equal(toggleZone(side,0,'deck',true,false),'side');
assert.equal(toggleZone(side,1,'deck',true,false),'main');
assert.equal(toggleZone(side,2,'deck',true,true),'side');
assert.equal(toggleZone(side,2,'deck',true,true),'extra');

// Limits count by name across every zone.
const names=nameCounts(pool,zonesFor(pool,{main:[1,1],side:[3]}),id=>id===1?'Pot':'Other');
assert.equal(names.get('Pot'),2);assert.equal(names.get('Other'),1);

// A function limit marks a stack full per card, so its next tap takes the copies out.
const run={pool:[4,4,6,6]},stacks=groupStacks([0,1,2,3],run,[0,2],id=>id===4);
assert.equal(stacks.stack(0).atLimit,true);assert.equal(stacks.stack(2).atLimit,false);
assert.equal(groupStacks([0,1],{pool:[4,4]},[0]).stack(0).atLimit,false,'numeric default unchanged');
assert.deepEqual(applyTaps(run,[0,2],[{op:'remove',index:1}]).selected,[2]);
console.log('PASS Ultimate Collector deck editor: zones per copy, sections, siding, limits by name, per-card stack limit');
