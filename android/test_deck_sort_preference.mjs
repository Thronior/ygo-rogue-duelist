// Deck editor Sort and Deck status are remembered per device between duels (2026-11-10).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const store=new Map();
globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))};
const SOLO=['Newest','Default','Name','Type','Attribute','ATK','DEF','Level','Oldest'];
const TAG=['Newest','Default','Name','Attribute','ATK','DEF','Level'];
const load=async n=>import(`./web/deck-sort-preference.js?${n}`);

let m=await load(1);
assert.equal(m.savedDeckSort(SOLO),'Newest','default sort');
assert.equal(m.savedDeckStatus(),'First','default status');
m.rememberDeckSort({sort:'Type'});
m.rememberDeckSort({status:'Any'});

m=await load(2); // a fresh page load reads it back
assert.equal(m.savedDeckSort(SOLO),'Type');
assert.equal(m.savedDeckStatus(),'Any');
assert.equal(m.savedDeckSort(TAG),'Newest','Tag has no Type sort');
m.rememberDeckSort({status:'In'}); // a Tag status change keeps the solo sort
m=await load(3);
assert.equal(m.savedDeckSort(SOLO),'Type');
assert.equal(m.savedDeckStatus(),'In');

store.set('ygo-deck-sort','{broken');
m=await load(4);
assert.equal(m.savedDeckSort(SOLO),'Newest','bad JSON falls back');
store.set('ygo-deck-sort','{"sort":"Bogus","status":"Nope"}');
m=await load(5);
assert.equal(m.savedDeckSort(SOLO),'Newest');
assert.equal(m.savedDeckStatus(),'First');
globalThis.localStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
m=await load(6);
assert.equal(m.savedDeckSort(SOLO),'Newest','blocked storage');
m.rememberDeckSort({sort:'ATK'});
assert.equal(m.savedDeckSort(SOLO),'ATK','kept for the session when storage is blocked');

// Wiring: after a duel only the tab and search reset; changes are saved; the reset button restores defaults.
const solo=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8'),tag=readFileSync(new URL('./web/tag-ui.js',import.meta.url),'utf8');
assert.match(solo,/statsRequest\.action==='finish'\)resetDraftFilters\(false\)/);
assert.match(solo,/draftSort=savedDeckSort\(DRAFT_SORTS\),draftDeck=savedDeckStatus\(\)/);
assert.match(solo,/draftSort=e\.target\.value;rememberDeckSort\(\{sort:draftSort\}\)/);
assert.match(solo,/draftDeck=e\.target\.value;rememberDeckSort\(\{status:draftDeck\}\)/);
assert.match(tag,/view\.phase!=='duel'\)this\.resetDeckFilters\(false\)/);
assert.match(tag,/this\.deckSort=savedDeckSort\(TAG_DECK_SORTS\);this\.deckStatus=savedDeckStatus\(\)/);
assert.match(tag,/this\.deckSort=sort\.value;rememberDeckSort\(\{sort:this\.deckSort\}\)/);
assert.match(tag,/this\.deckStatus=status\.value;rememberDeckSort\(\{status:this\.deckStatus\}\)/);
console.log('deck sort preference: ok');
