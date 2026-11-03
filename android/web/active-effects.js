// What is changing a monster right now, for the inspection window: relic icons and card images with their amounts.
// Cards don't report which effects touch a monster, so a face-up card only counts when the monster's stats differ from
// what relics, curses and equips explain, and its own text says it changes this monster's stats.
const signed=n=>`${n>0?'+':'−'}${Math.abs(n)}`;
export const amountLabel=(atk=0,def=0)=>atk&&atk===def?`${signed(atk)} ATK/DEF`:[atk?`${signed(atk)} ATK`:'',def?`${signed(def)} DEF`:''].filter(Boolean).join(' ');

export function changesStats(desc,{race='',attribute=''}={}){
 const text=String(desc||'');
 if(!/\b(gain|gains|lose|loses|increase|increases|decrease|decreases)\b[^.]*\b(ATK|DEF)\b/i.test(text))return false;
 const words=[race,attribute].filter(Boolean).map(x=>x.replace(/[-/]/g,'.'));
 return new RegExp(`\\b(all|each|every|your|their|opponent's)\\b[^.]*monsters?\\b|monsters? (you|your opponent) controls?${words.length?'|'+words.join('|'):''}`,'i').test(text);
}

// sources: [{kind:'relic'|'curse'|'card',src,name,atk,def}]; amounts are left out where a card doesn't state one.
export function activeEffectsMarkup(sources,esc){
 if(!sources.length)return '';
 return `<div class="active-effects" role="list" aria-label="Active effects">${sources.map(s=>{const amount=amountLabel(s.atk,s.def);return `<span class="active-effect ${s.kind}" role="listitem" title="${esc(s.name)}"><img src="${esc(s.src)}" alt="${esc(s.name)}" loading="lazy">${amount?`<b>${amount}</b>`:''}</span>`}).join('')}</div>`;
}
