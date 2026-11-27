// What a booster's summary names (experience-ui.js packSummary) and which of the pack's cards each named term stands for.
// CITYDRIVER on Discord, 2026-11-19: in the pack details window the summary's Types, Attributes, archetypes and Support
// themes are links that show only the pack's cards of that term. The summary and the filter share the rules below, so
// a term the summary names always finds the cards that made it name the term.
import {inSet} from './related-cards.js';
import {GENRES,CARD_GENRES} from './card-genres.js';

// Archetypes by name and text. 'Spirit' and 'Toon' also come from the card type, some from their setcode.
// The custom Moth LV line (2026-11-23) is not Horus LV: its LV numbers used to label seven packs "Horus LV".
export const PACK_SERIES=[
 ['Chaos',/\bChaos\b/i],['Amazoness',/\bAmazoness\b/i],['Archfiend',/\bArchfiend\b/i],['Blue-Eyes',/Blue-Eyes/i],['Buster Blader',/Buster Blader/i],
 ['Dark Magician',/Dark Magician/i],['Dark Scorpion',/Dark Scorpion/i],['Destiny Board',/Destiny Board|Spirit Message/i],['Exodia',/Exodia|Forbidden One/i],
 ['Gravekeeper',/Gravekeeper|Necrovalley/i],['Harpie',/Harpie/i],['Horus LV',/Horus.*LV|^(?![^]*Moth)[^]*LV[0-9]/i],['Magnet Warrior',/Magnet Warrior/i],
 ['Ninja',/Ninja|Ninjitsu/i],['Ojama',/Ojama/i],['Red-Eyes',/Red-Eyes/i],['Relinquished',/Relinquished|Black Illusion Ritual/i],['Spirit',null],['Toon',/Toon/i],
 ['Union',/\bUnion\b|X-Head Cannon|XY-Dragon|XYZ-Dragon|XZ-Tank|YZ-Tank/i],['Umi',/\bUmi\b|Legendary Fisherman/i]
];
const SERIES_SETCODES={4:'Amazoness',15:'Ojama',26:'Dark Scorpion',46:'Gravekeeper',65:'LV',69:'Archfiend',100:'Harpie'};

// The archetype names one card adds to a pack summary.
export function cardSeries(c){
 const present=new Set(),text=`${c.name} ${c.desc||''}`;
 for(const [name,re] of PACK_SERIES)if(re?.test(text))present.add(name);
 if(c.data?.type&0x200)present.add('Spirit');if(c.data?.type&0x400000)present.add('Toon');
 for(const code of c.data?.setcodes||[]){const series=SERIES_SETCODES[Number(code)&0xfff];if(series)present.add(series)}
 return present;
}

// Type support (user, 2026-11-24): a pack's Type tags and the Type filters count that Type's monsters plus the cards
// whose text names the Type as a group of monsters ("all Machine monsters", "a Warrior or Spellcaster monster",
// "Zombie-Type monsters"), e.g. Limiter Removal for Machine. A Type inside a quoted card name doesn't count.
export const MONSTER_TYPES=['Aqua','Beast','Beast-Warrior','Cyberse','Dinosaur','Divine-Beast','Dragon','Fairy','Fiend','Fish','Illusion','Insect','Machine','Plant','Psychic','Pyro','Reptile','Rock','Sea Serpent','Spellcaster','Thunder','Warrior','Winged Beast','Wyrm','Zombie'];
const TYPE_NAME=`(?:${MONSTER_TYPES.map(r=>r.replace('-','[- ]')).sort((a,b)=>b.length-a.length).join('|')})`,ONE_TYPE=`${TYPE_NAME}(?:-Type)?`;
const TYPE_GROUP=new RegExp(`(?<![\\w"-])${ONE_TYPE}(?:,? (?:or|and) ${ONE_TYPE}|, ${ONE_TYPE})*(?: (?:Normal|Effect|Tuner|Fusion|Ritual|Toon|Union|Spirit|Flip))? [Mm]onsters?\\b`,'g'),TYPE_WORD=new RegExp(TYPE_NAME,'g');
const typeKey=s=>s.replace('-',' '),TYPE_BY_KEY=new Map(MONSTER_TYPES.map(r=>[typeKey(r),r]));
const supportMemo=new WeakMap(),NO_TYPES=new Set();
// The Types a card's text supports, read once per card.
export function supportedTypes(c){
 if(!c?.desc)return NO_TYPES;let out=supportMemo.get(c);if(out)return out;
 out=NO_TYPES;
 for(const m of c.desc.matchAll(TYPE_GROUP))for(const [w] of m[0].matchAll(TYPE_WORD)){if(out===NO_TYPES)out=new Set();out.add(TYPE_BY_KEY.get(typeKey(w)))}
 supportMemo.set(c,out);return out;
}
// A monster of the Type, or a card that supports it.
export const typeCard=(c,race)=>!!c&&(!!(c.data?.type&1)&&c.race===race||supportedTypes(c).has(race));

// Draw cards: the deck editor's "Draw cards" category (card-search.js genres: the hand list, else the text). Normal
// Monsters have no effect. Equip Spells (CITYDRIVER, 2026-11-24, for a Joey Warrior Equip deck) by their type bits.
const DRAW_RE=new RegExp(GENRES.find(g=>g.id==='increase-draw').pattern,'i');
export const drawCard=c=>{const t=c?.data?.type|0;if(!c||(t&17)===17)return false;const ids=CARD_GENRES[c.id];return ids?ids.includes('increase-draw'):DRAW_RE.test(c.desc||'')};
export const equipSpell=c=>((c?.data?.type|0)&0x40002)===0x40002;
// Staples (CITYDRIVER and Voda, 2026-11-26: they open packs looking for these): a hand-picked list of cards that fit
// almost any deck. The link and the Collection › Packs filter show the pack's copies of them.
export const STAPLES=new Set(['Pot of Greed','Graceful Charity','Raigeki',"Harpie's Feather Duster",'Heavy Storm','Mystical Space Typhoon','Monster Reborn','Change of Heart','Snatch Steal','Mirror Force','Torrential Tribute','Book of Moon','Sangan']);
export const stapleCard=c=>!!c&&STAPLES.has(c.name);

// Support themes: `has` decides whether the summary names it (at least `min` cards), `match` which cards the link shows.
// The Fusion and Ritual links also show the Spells that summon them.
const removal=c=>/destroy|banish|return.*hand/i.test(c.desc),recovery=c=>/gain.*LP|increase.*Life Points/i.test(c.desc);
export const PACK_THEMES=[
 {name:'Ritual Summoning',min:1,has:c=>c.data.type&128,match:c=>c.data.type&128||/Ritual Summon/i.test(c.desc||'')},
 {name:'Fusion Summoning',min:1,has:c=>c.data.type&64,match:c=>c.data.type&64||/Fusion Summon|Polymerization/i.test(c.desc||'')||c.name==='Polymerization'},
 {name:'removal and control',min:6,has:removal,match:removal},
 {name:'LP recovery',min:4,has:recovery,match:recovery},
 {name:'card draw',min:1,has:drawCard,match:drawCard},
 {name:'Equip Spells',min:1,has:equipSpell,match:equipSpell},
 {name:'Staples',min:1,has:stapleCard,match:stapleCard},
];

export function packSummaryParts(content,pid){
 const p=content.packs.find(p=>p.id===pid);if(!p)return null;
 const ids=new Set([...(p.common||[]),...(p.rare||[])]),cards=content.cards.filter(c=>ids.has(c.id)),counts={};
 // Each card counts once per Type: as a monster of it, or as support for it.
 for(const c of cards){const own=c.data.type&1?c.race:null;if(own)counts[own]=(counts[own]||0)+1;for(const r of supportedTypes(c))if(r!==own)counts[r]=(counts[r]||0)+1}
 const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name])=>name),types=ranked.slice(0,3);
 // Every other Type the pack has, as filter links after the summary (CITYDRIVER, 2026-11-26: Machine was missing when it
 // wasn't in a pack's top 3).
 const otherTypes=ranked.slice(3);
 const themes=PACK_THEMES.filter(x=>cards.filter(x.has).length>=x.min).map(x=>x.name);
 const present=new Set();for(const c of cards)for(const s of cardSeries(c))present.add(s);
 const dartz=pid==='DRAFT-DARTZ';
 return {types:dartz?[]:types,otherTypes:dartz?[]:otherTypes,attributes:dartz?['LIGHT','DARK']:[],series:dartz?['Chaos']:PACK_SERIES.map(([name])=>name).filter(name=>present.has(name)),themes,count:ids.size};
}

// Which cards a summary term stands for. Built on a click, never while the window opens.
// Archetypes: the summary's own rule, or membership by setcode in content.archetypes (data/archetypes.json), the
// list Related Cards and the relic odds read, so cards "treated as" an archetype count too.
export function packTermMatcher(content,kind,value){
 if(kind==='race')return c=>typeCard(c,value);
 if(kind==='attribute')return c=>!!(c?.data?.type&1)&&c.attribute===value;
 if(kind==='theme'){const theme=PACK_THEMES.find(x=>x.name===value);return c=>!!c&&!!theme?.match(c)}
 if(kind==='series'){
  const set=(content.archetypes||[]).find(a=>a.name.toLowerCase()===value.toLowerCase())?.setcode;
  return c=>!!c&&(cardSeries(c).has(value)||set!=null&&(c.data?.setcodes||[]).some(code=>inSet(set,Number(code))));
 }
 return ()=>false;
}

// Collection › Packs "Cards" filter (CITYDRIVER, 2026-11-24: he opened every booster to find its Equip Spells): packs
// holding cards of a Support theme or a Type (monsters + support), most matching cards first. Values are "theme:<name>"
// or "race:<Type>", the pack window's own terms, so opening a pack from the list shows those cards straight away.
const filterOptions=new WeakMap();
export function packFilterOptions(content){
 let o=filterOptions.get(content);if(o)return o;
 const races=new Set();for(const c of content.cards)if(c.data?.type&1&&MONSTER_TYPES.includes(c.race))races.add(c.race);
 o={themes:PACK_THEMES.map(x=>x.name),types:MONSTER_TYPES.filter(r=>races.has(r))};filterOptions.set(content,o);return o;
}
export function parsePackFilter(value){const at=String(value||'').indexOf(':');return at>0?{kind:String(value).slice(0,at),value:String(value).slice(at+1)}:null}
// Matching cards per pack, counted once per filter and content (86 packs; a few thousand checks, then a lookup).
const filterCounts=new WeakMap();
export function packFilterCount(content,pid,filter){
 const term=parsePackFilter(filter);if(!term)return 0;
 let memo=filterCounts.get(content);if(!memo)filterCounts.set(content,memo=new Map());
 let counts=memo.get(filter);
 if(!counts){
  counts=new Map();const match=packTermMatcher(content,term.kind,term.value),byId=new Map(content.cards.map(c=>[c.id,c]));
  for(const p of content.packs){let n=0;for(const id of new Set([...(p.common||[]),...(p.rare||[])]))if(match(byId.get(id)))n++;counts.set(p.id,n)}
  memo.set(filter,counts);
 }
 return counts.get(pid)||0;
}
