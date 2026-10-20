import assert from 'node:assert/strict';
import {cpuMatchDecks,shuffleCPUMainDecks} from './web/cpu-deck-model.js';

const cpuDecks={10:[{main:[1],extra:[]}],20:[{main:[2],extra:[]}]};
const edited={main:[3,4],extra:[5]};
assert.deepEqual(cpuMatchDecks([10,20],[0,0],cpuDecks,{side:0,deck:edited}),[edited,cpuDecks[20][0]]);
const blankEdited={main:[],extra:[]};
assert.deepEqual(cpuMatchDecks([10,20],[0,0],cpuDecks,{side:0,deck:blankEdited}),[blankEdited,cpuDecks[20][0]],'blank edited deck is still used for the test duel');
assert.deepEqual(cpuMatchDecks([10,20],[0,0],cpuDecks,{side:1,deck:edited}),[cpuDecks[10][0],edited]);
assert.deepEqual(cpuMatchDecks([10,20],[0,0],cpuDecks),[cpuDecks[10][0],cpuDecks[20][0]]);
const longMain=Array.from({length:36},(_,i)=>10000+i);
const decksWithTest=cpuMatchDecks([10,20],[0,0],{10:[{main:longMain,extra:[]}],20:[{main:longMain.slice().reverse(),extra:[]}]},{side:0,deck:{main:longMain.slice(),extra:[]}});
const shuffled=shuffleCPUMainDecks(decksWithTest,987654321);
assert.notDeepEqual(shuffled[0],decksWithTest[0].main,'edited deck is shuffled before duel');
assert.notDeepEqual(shuffled[1],decksWithTest[1].main,'opponent deck is shuffled before duel');
assert.deepEqual(shuffleCPUMainDecks(decksWithTest,987654321),shuffled,'replay seed keeps its shuffle reproducible');
assert.deepEqual([...decksWithTest[0].main],longMain,'shuffle does not mutate the saved edited deck');
console.log('PASS Watch CPU test duel applies a seeded shuffle to both the edited and opposing decks.');
