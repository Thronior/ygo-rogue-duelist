// Bug report (2026-11-25): Tag couldn't sort by Type. Tag, online Draft and the Collector editor share deck-editor-view.js;
// they now offer solo's sorts, Type and Oldest included, and Type orders cards as solo does. Run: node android/test_tag_type_sort_nov25.mjs
import assert from 'node:assert/strict';import fs from 'node:fs';
globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
const {deckOrder}=await import('./web/deck-editor-view.js');
const cards={1:{name:'Trap Hole',race:'Normal',data:{type:4}},2:{name:'Mystical Elf',race:'Spellcaster',data:{type:1}},3:{name:'Pot of Greed',race:'Normal',data:{type:2}},
 4:{name:'Celtic Guardian',race:'Warrior',data:{type:1}},5:{name:'Dark Magician',race:'Spellcaster',data:{type:1}},6:{name:'Mystical Space Typhoon',race:'Quick-Play',data:{type:2}}};
const pool=[1,2,3,4,5,6],order=sort=>deckOrder({deckFilter:'All',deckSort:sort,deckStatus:'Any'},{pool,selected:[],lookup:id=>cards[id],run:{},info:{},searchKey:'t'}).map(i=>cards[pool[i]].name);
assert.deepEqual(order('Type'),['Dark Magician','Mystical Elf','Celtic Guardian','Pot of Greed','Mystical Space Typhoon','Trap Hole'],'Monsters by Type then name, then Spells by kind, then Traps');
assert.deepEqual(order('Oldest'),pool.map(id=>cards[id].name),'Oldest keeps the order cards were added');
assert.deepEqual(order('Newest'),[...pool].reverse().map(id=>cards[id].name));
const solo=fs.readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8').match(/const DRAFT_SORTS=(\[[^\]]+\])/)[1];
for(const [file,name] of [['tag-ui.js','TAG_DECK_SORTS'],['draft-ui.js','DRAFT_DECK_SORTS'],['collector-ui.js','COLLECTOR_DECK_SORTS']]){
 const list=fs.readFileSync(new URL('./web/'+file,import.meta.url),'utf8').match(new RegExp('const '+name+'=(\\[[^\\]]+\\])'))[1];
 assert.deepEqual(JSON.parse(list.replace(/'/g,'"')),JSON.parse(solo),file+' offers the same sorts as solo');
}
console.log('PASS Tag/Draft/Collector deck sorts match solo: Type and Oldest added, Type orders Monsters, Spells, Traps by Type and name');
