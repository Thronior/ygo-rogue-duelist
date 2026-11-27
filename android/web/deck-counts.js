// Monster / Spell / Trap counts in the deck editors' summary line (Septarium, Discord 2026-11-22; the user picked the
// summary line, with small card-frame icons instead of words). Shared by the solo, Tag and Draft deck editors.
import {attributeIconSrc,typeIconSrc} from './feedback-ui.js';
const KINDS=[['monster','Monsters'],['spell','Spells'],['trap','Traps']];
export const frameIcon=(kind,label)=>`<i class="deck-frame-icon ${kind}" aria-hidden="true"></i>`;
const chip=(kind,label,n)=>`<span class="deck-kind" title="${label}" aria-label="${n} ${label}">${frameIcon(kind)}<b>${n}</b></span>`;
// types: the Main Deck cards' type bits (data.type). Monsters are type & 1, Spells & 2, Traps & 4.
export function deckKindCounts(types){
 const n={monster:0,spell:0,trap:0};
 for(const t of types){if(t&1)n.monster++;else if(t&2)n.spell++;else if(t&4)n.trap++}
 return n;
}
export function deckKindsMarkup(types){const n=deckKindCounts(types);return `<span class="deck-kinds">${KINDS.map(([k,label])=>chip(k,label,n[k])).join('')}</span>`}
export const extraDeckMarkup=n=>`<span class="deck-kind" title="Extra Deck" aria-label="${n} Extra Deck">${frameIcon('extra')}<b>${n}</b></span> Extra Deck`;

// Attribute and Type counts of the Main Deck's monsters, most first (Septarium, Discord 2026-11-26). Only with Settings ›
// Display › "Deck Attribute and Type Counts", which is off by default (user).
export function deckTraitsMarkup(cards){
 const attrs=new Map(),races=new Map();
 for(const c of cards){if(!(c?.data?.type&1))continue;const a=String(c.attribute||'').split(/\s*\/\s*/)[0];if(a)attrs.set(a,(attrs.get(a)||0)+1);if(c.race)races.set(c.race,(races.get(c.race)||0)+1)}
 const chip=(src,label,n)=>`<span class="deck-kind deck-trait" title="${label}" aria-label="${n} ${label}"><img src="${src}" alt="" draggable="false"><b>${n}</b></span>`;
 const sorted=m=>[...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 return `<span class="deck-traits">${sorted(attrs).map(([a,n])=>chip(attributeIconSrc(a),a,n)).join('')}</span><span class="deck-traits">${sorted(races).map(([r,n])=>chip(typeIconSrc(r),r,n)).join('')}</span>`;
}
