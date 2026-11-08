// Icon choices for every Type or Attribute picker: DNA Rewrite's run Type and the duel's
// "declare a Type/Attribute" prompts. Only Types and Attributes some card in the game has are
// offered; duel prompts also keep to what the engine allows.
import {TYPES} from './card-genres.js';
import {monsterTypes,attributes} from './feedback-ui.js';

// Both lists are in the engine's bit order: Warrior is bit 0, EARTH is bit 0.
export const ATTRIBUTE_NAMES=Object.values(attributes);
// The Attribute Orb relics, shrunk to icons (tools/make_attribute_orb_icons.py). DIVINE has no Orb, so it gets a matching gold one.
export const attributeOrbSrc=a=>`assets/icons/attribute-orbs/${String(a).toLowerCase()}.png`;
export const typeIconSrc=race=>{const file=TYPES[String(race).replace(/[^a-z]/gi,'')];return file?`assets/icons/yugipedia/${file}`:''};

let seen=null;
// Type and Attribute bits carried by at least one monster in the card list, worked out once per list.
export function cardlistBits(cards){
 if(seen?.cards===cards)return seen;
 let races=0n,attrs=0;
 for(const c of cards||[])if(c.data?.type&1){races|=BigInt(c.data.race||0);attrs|=Number(c.data.attribute)||0}
 return seen={cards,races,attributes:attrs};
}

// kind is 'race' or 'attribute'. allowed is the engine's mask (every choice when omitted).
// If hiding unused choices would leave fewer than need, every allowed choice stays so a prompt can always be answered.
export function iconChoices(kind,cards,allowed=null,need=1){
 const race=kind==='race',names=race?monsterTypes:ATTRIBUTE_NAMES,have=BigInt(cardlistBits(cards)[race?'races':'attributes']);
 const all=[];
 names.forEach((name,bit)=>{if(allowed==null||BigInt(allowed)>>BigInt(bit)&1n)all.push({bit,name,icon:race?typeIconSrc(name):attributeOrbSrc(name)})});
 const used=all.filter(x=>have>>BigInt(x.bit)&1n);
 return used.length>=need?used:all;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// One button per choice with its icon over its name. extra(choice) adds the button's data attributes.
export function iconChoiceGrid(choices,kind,extra){
 return `<div class="type-choice-grid ${kind==='race'?'race-choice':'attribute-choice'}">${choices.map(x=>`<button type="button" class="icon-choice" title="${esc(x.name)}" ${extra(x)}><img class="${kind==='race'?'genre-icon':'attribute-orb'}" src="${x.icon}" alt="" decoding="async"><span>${esc(x.name)}</span></button>`).join('')}</div>`;
}
