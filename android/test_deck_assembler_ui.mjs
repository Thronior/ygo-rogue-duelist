// Deck Assembler client rules: only the variant edits, and two decks sharing box art stay distinct prizes.
import assert from 'node:assert/strict';
globalThis.document??={hidden:false,addEventListener(){}};
const {fixedDeck,deckMinimum}=await import('./web/deck-minimum.js');
const {deckRewardMarkup}=await import('./web/engine-rewards.js');
const {deckPreviewCards}=await import('./web/deck-preview.js');

const engine={engine_deck:true},copycat={copycat:true},normal={};
assert.equal(fixedDeck({variant:0},engine),true);
assert.equal(fixedDeck({},engine),true,'an old save has no variant field');
assert.equal(fixedDeck({variant:1},engine),false);
assert.equal(fixedDeck({variant:1},copycat),true);
assert.equal(fixedDeck({variant:1},normal),false);
assert.equal(deckMinimum({round:6,variant:0},engine),20);
assert.equal(deckMinimum({round:6,variant:1},engine),40);

const esc=text=>String(text);
const yugi={id:'EX-Y',name:'EX Starter Box: Yugi',sprite:'decks/EX.jpg',main:[1],extra:[]};
const kaiba={id:'EX-K',name:'EX Starter Box: Kaiba',sprite:'decks/EX.jpg',main:[2],extra:[]};
const named=deckRewardMarkup({gold:0,lp:8000,reward_slots:{source:[yugi,kaiba],choices:[kaiba]}},{esc});
assert.match(named,/engine-rewards named-decks/);
assert.match(named,/View Deck/);
const standard=deckRewardMarkup({gold:0,lp:8000,reward_slots:{choices:[{opponent:3,sprite:'a.png',main:[1],extra:[],tier:1}]}},{esc});
assert.doesNotMatch(standard,/named-decks/,'opponent decks stay anonymous');
assert.deepEqual(deckPreviewCards({main:[5]},()=>({data:{type:1}})),[5],'a deck reward may have no extra list');
console.log('PASS Deck Assembler client rules: fixed-deck check, deck minimum, deck reward markup');
