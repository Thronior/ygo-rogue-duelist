// ★ and ? in the card search window (user, 2026-11-20): ★ keeps cards marked Yes in the deck editor's run, ? keeps
// randomized cards. Both count as active filters on the search button.
import assert from 'node:assert/strict';
const {searches,matchesSearch,searchMarks,searchButton,DECK_STATUS_OPTIONS}=await import('./web/card-search.js');
const card=(id,name='Card')=>({id,name,desc:'',race:'Dragon',attribute:'DARK',level:4,data:{type:17}});
const plain=card(89631139,'Blue-Eyes White Dragon'),rainbow=card(191000123,'Randomized card'),marked=card(46986414,'Dark Magician');
const run={card_marks:{[marked.id]:1,[plain.id]:-1}};
searchMarks('draft',()=>run);
searches.draft={effects:[],random:true};
assert.deepEqual([plain,rainbow,marked].filter(c=>matchesSearch(c,'draft')),[rainbow],'? keeps randomized cards only');
searches.draft={effects:[],marked:true};
assert.deepEqual([plain,rainbow,marked].filter(c=>matchesSearch(c,'draft')),[marked],'★ keeps Yes-marked cards only (not No)');
searches.draft={effects:[],marked:true,random:true};
assert.deepEqual([plain,rainbow,marked].filter(c=>matchesSearch(c,'draft')),[],'both together need both');
assert.match(searchButton('draft'),/2 filters active/,'the search button counts ★ and ?');
searches.other={effects:[],marked:true};
assert.equal(matchesSearch(marked,'other'),false,'★ without a run keeps nothing');
assert(!DECK_STATUS_OPTIONS.some(([v])=>v==='Random'),'Randomized only left the Deck status dropdown');
console.log('PASS search window ★ (marked Yes) and ? (randomized) filters');
