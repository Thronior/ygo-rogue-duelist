// Monster / Spell / Trap counts in the deck editors' summary line (Septarium, Discord 2026-11-22; the user picked the
// summary line, with small card-frame icons instead of words). Shared by the solo, Tag and Draft deck editors.
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
