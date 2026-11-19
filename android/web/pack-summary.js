// What a booster's summary names (experience-ui.js packSummary) and which of the pack's cards each named term stands for.
// CITYDRIVER on Discord, 2026-11-19: in the pack details window the summary's Types, Attributes, archetypes and Support
// themes are links that show only the pack's cards of that term. The summary and the filter share the rules below, so
// a term the summary names always finds the cards that made it name the term.
import {inSet} from './related-cards.js';

// Archetypes by name and text. 'Spirit' and 'Toon' also come from the card type, some from their setcode.
export const PACK_SERIES=[
 ['Chaos',/\bChaos\b/i],['Amazoness',/\bAmazoness\b/i],['Archfiend',/\bArchfiend\b/i],['Blue-Eyes',/Blue-Eyes/i],['Buster Blader',/Buster Blader/i],
 ['Dark Magician',/Dark Magician/i],['Dark Scorpion',/Dark Scorpion/i],['Destiny Board',/Destiny Board|Spirit Message/i],['Exodia',/Exodia|Forbidden One/i],
 ['Gravekeeper',/Gravekeeper|Necrovalley/i],['Harpie',/Harpie/i],['Horus LV',/Horus.*LV|LV[0-9]/i],['Magnet Warrior',/Magnet Warrior/i],
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

// Support themes: `has` decides whether the summary names it (at least `min` cards), `match` which cards the link shows.
// The Fusion and Ritual links also show the Spells that summon them.
const removal=c=>/destroy|banish|return.*hand/i.test(c.desc),recovery=c=>/gain.*LP|increase.*Life Points/i.test(c.desc);
export const PACK_THEMES=[
 {name:'Ritual Summoning',min:1,has:c=>c.data.type&128,match:c=>c.data.type&128||/Ritual Summon/i.test(c.desc||'')},
 {name:'Fusion Summoning',min:1,has:c=>c.data.type&64,match:c=>c.data.type&64||/Fusion Summon|Polymerization/i.test(c.desc||'')||c.name==='Polymerization'},
 {name:'removal and control',min:6,has:removal,match:removal},
 {name:'LP recovery',min:4,has:recovery,match:recovery},
];

export function packSummaryParts(content,pid){
 const p=content.packs.find(p=>p.id===pid);if(!p)return null;
 const ids=new Set([...(p.common||[]),...(p.rare||[])]),cards=content.cards.filter(c=>ids.has(c.id)),counts={};
 for(const c of cards)if(c.data.type&1)counts[c.race]=(counts[c.race]||0)+1;
 const types=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name])=>name);
 const themes=PACK_THEMES.filter(x=>cards.filter(x.has).length>=x.min).map(x=>x.name);
 const present=new Set();for(const c of cards)for(const s of cardSeries(c))present.add(s);
 const dartz=pid==='DRAFT-DARTZ';
 return {types:dartz?[]:types,attributes:dartz?['LIGHT','DARK']:[],series:dartz?['Chaos']:PACK_SERIES.map(([name])=>name).filter(name=>present.has(name)),themes,count:ids.size};
}

// Which cards a summary term stands for. Built on a click, never while the window opens.
// Archetypes: the summary's own rule, or membership by setcode in content.archetypes (data/archetypes.json), the
// list Related Cards and the relic odds read, so cards "treated as" an archetype count too.
export function packTermMatcher(content,kind,value){
 if(kind==='race')return c=>!!(c?.data?.type&1)&&c.race===value;
 if(kind==='attribute')return c=>!!(c?.data?.type&1)&&c.attribute===value;
 if(kind==='theme'){const theme=PACK_THEMES.find(x=>x.name===value);return c=>!!c&&!!theme?.match(c)}
 if(kind==='series'){
  const set=(content.archetypes||[]).find(a=>a.name.toLowerCase()===value.toLowerCase())?.setcode;
  return c=>!!c&&(cardSeries(c).has(value)||set!=null&&(c.data?.setcodes||[]).some(code=>inSet(set,Number(code))));
 }
 return ()=>false;
}
