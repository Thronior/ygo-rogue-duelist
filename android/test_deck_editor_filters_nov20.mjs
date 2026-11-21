// Deck editor items from Discord (Nori, 2026-11-20):
// - Boss curses in the deck stats: when the next duel is a boss with known curses (run.next_boss), its ATK/DEF and relic
//   curses count in the shown stats, with a note; never in Tag, mid-duel, or on an ordinary duel.
// - Windowed grids (deck-paging.js): the markup side; android/test_deck_paging_window.cjs drives it in Chrome.
// Run from android/: ../runtime/ai/node.exe test_deck_editor_filters_nov20.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {deckStats,bossStatCurses,bossCurseNote,STAT_CURSES}=await import('./web/feedback-ui.js');
const {pagedGrid,PAGE}=await import('./web/deck-paging.js');

const card={id:1,name:'Test Monster',atk:1800,defense:1200,level:4,race:'Warrior',attribute:'EARTH',data:{type:0x21,setcodes:[]}};
const info={sword:{effect:'atk',amount:300,filter:''}};
// Duel 6 (round 5) is a boss; boss_preview.py records it in next_boss with the curses the boss screen shows.
const run=(extra={})=>({round:5,loop:0,stage:'shop',challenge_level:0,artifacts:[],card_mods:{},pool:[1],next_boss:{loop:0,round:5,opponent:3,curses:['frailty','hunger','tax']},...extra});

assert.deepEqual(bossStatCurses(run()),['frailty','hunger'],'only the curses that change ATK/DEF or relics');
assert.deepEqual(deckStats(card,run(),0,info),[1600,900],'Frailty −200 ATK, Hunger −300 DEF below LVL 2');
assert.deepEqual(deckStats(card,run({challenge_level:2}),0,info),[1400,600],'doubled from LVL 2, as in passives.py');
assert.deepEqual(deckStats(card,run({artifacts:['sword']}),0,info),[1900,900],'relics still count');
assert.deepEqual(deckStats(card,run({artifacts:['sword'],next_boss:{loop:0,round:5,curses:['relic_seal']}}),0,info),[1800,1200],'Relic Seal: no relic bonus');
assert.deepEqual(deckStats(card,run({next_boss:{loop:0,round:5,curses:['mirror_stats']}}),0,info),[1200,1800],'Mirror Stats swaps ATK and DEF');
assert.deepEqual(deckStats(card,run({next_boss:{loop:0,round:5,curses:['brittle','brittle']}}),0,info),[1600,800],'stacked copies each count');
// Not counted: an ordinary next duel, a plan from another loop, unknown curses, Tag, mid-duel, Relicless.
for(const [label,extra] of [['ordinary duel',{round:4}],['other loop',{loop:1}],['plan for another round',{next_boss:{loop:0,round:8,curses:['frailty']}}],['curses not rolled',{next_boss:{loop:0,round:5,curses:null}}],['Tag',{history_mode:'tag'}],['in the duel',{stage:'duel'}],['Relicless',{challenge_level:-1}]]){
 assert.deepEqual(bossStatCurses(run(extra)),[],label);
}
assert.deepEqual(deckStats(card,run({round:4}),0,info),[1800,1200],'no boss next: plain stats');
// LVL 6: the permanent curses and the boss's new one both count.
assert.deepEqual(deckStats(card,run({challenge_level:6,persistent_curses:['frailty'],next_boss:{loop:0,round:5,curses:['hunger']}}),0,info),[1400,600]);
assert.deepEqual(deckStats(card,run({challenge_level:6,persistent_curses:['frailty'],stage:'duel'}),0,info),[1400,1200],'mid-duel LVL 6 counts only the permanent list (the boss curse is in it then)');
// The note.
const note=bossCurseNote(run(),k=>`icons/${k}.png`);
assert.match(note,/class="deck-boss-curses"/);assert.match(note,/icons\/frailty\.png/);assert.match(note,/icons\/hunger\.png/);assert.doesNotMatch(note,/tax/);
assert.match(note,/>Card stats include the next boss's curses\.<\/p>$/,'the note text is its own text node (translated by i18n.js)');
assert.equal(bossCurseNote(run({round:4}),k=>k),'','no note without boss stat curses');
assert.ok(STAT_CURSES.includes('relic_seal'));

const mobile=readFileSync(new URL('./web/mobile.js',import.meta.url),'utf8');
assert.match(mobile,/Drag to scroll<\/p>\$\{bossCurseNote\(r,curseIconFile\)\}/,'solo editor shows the note under the deck count');
assert.match(mobile,/cardMarkVersion\(r\),bossStatCurses\(r\)\.join\(\)\]\)/,'ATK/DEF sorts refresh when the boss curses change (a boss reroll)');
const terms=readFileSync(new URL('../tools/i18n/add_nov20_deck_editor_terms.py',import.meta.url),'utf8');
assert.ok(terms.includes(`"Card stats include the next boss's curses."`),'the note is translated');

// Windowed grids: small grids stay plain; big ones end with the marker the pass finds them by; a new order starts over.
const markup=i=>`<button data-i="${i}"></button>`;
const small=pagedGrid('nov20-small','a',[...Array(40).keys()],markup);
assert.doesNotMatch(small,/deck-more|deck-gap/);assert.equal((small.match(/data-i=/g)||[]).length,40);
const big=pagedGrid('nov20-big','a',[...Array(1000).keys()],markup);
assert.equal((big.match(/data-i=/g)||[]).length,PAGE);assert.match(big,/data-deck-more="nov20-big" aria-hidden="true">\+700</);assert.doesNotMatch(big,/deck-gap/);
const all=pagedGrid('nov20-all','a',[...Array(PAGE+1).keys()],markup);assert.match(pagedGrid('nov20-all','a',[...Array(PAGE+1).keys()],markup),/data-deck-more="nov20-all"/);assert.ok(all.includes('+1'));
console.log('PASS deck editor Nov 20: next boss curses in deck stats (LVL scaling, Relic Seal, Mirror Stats, LVL 6, not Tag/duel/ordinary), note, windowed grid markup');
