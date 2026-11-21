// Pack favourites per character (magna98, user 2026-11-21). Run: runtime/ai/node.exe android/test_pack_favourites_per_character.mjs
import assert from 'node:assert/strict';
import {packsFor,setPackFavourite,allFavouritePacks,favouriteCharacters,migrateFavouritePacks,characterSettings,setSavedMark,clearSavedMarks,characterPane} from './web/character-settings.js';

// The old device-wide list becomes every playable character's favourites, once.
const settings={favoritePacks:['EN-LOB','EN-MRD',7]};
assert.equal(migrateFavouritePacks(settings,[0,2,29]),true);
assert.deepEqual(settings.favoritePacks,[]);
for(const i of [0,2,29])assert.deepEqual(packsFor(settings,i),['EN-LOB','EN-MRD']);
assert.deepEqual(packsFor(settings,5),[]);
assert.equal(migrateFavouritePacks(settings,[0,2,29]),false,'runs once');

// Per character: starring for one leaves the others alone; unstarring every pack keeps a row only while marks remain.
setPackFavourite(settings,2,'EN-PSV',true);setPackFavourite(settings,0,'EN-LOB',false);
assert.deepEqual(packsFor(settings,2),['EN-LOB','EN-MRD','EN-PSV']);
assert.deepEqual(packsFor(settings,0),['EN-MRD']);
assert.deepEqual(new Set(allFavouritePacks(settings)),new Set(['EN-LOB','EN-MRD','EN-PSV']));
assert.deepEqual(favouriteCharacters(settings,'EN-LOB',[0,2,29]),[2,29]);
setPackFavourite(settings,0,'EN-MRD',false);
assert.equal(settings.characterSettings['0'],undefined,'empty row removed');
setSavedMark(settings,29,123,1);setPackFavourite(settings,29,'EN-LOB',false);setPackFavourite(settings,29,'EN-MRD',false);
assert.deepEqual(characterSettings(settings,29),{marks:{'123':1},keepRunMarks:false,packs:[]});
assert.equal('packs' in settings.characterSettings['29'],false);
// Clearing card marks keeps the packs.
clearSavedMarks(settings,2);assert.deepEqual(packsFor(settings,2),['EN-LOB','EN-MRD','EN-PSV']);
// The settings window lists them.
assert.match(characterPane(settings,2,'Joey',id=>'Pack '+id),/Favourite packs[\s\S]*assets\/packs\/EN-PSV\.jpg[\s\S]*Pack EN-PSV/);
assert.match(characterPane(settings,5,'Nobody'),/None yet\./);
console.log('PASS pack favourites per character: migration, per-character stars, union, settings pane');
