// Related cards tab in the card details window (YungHotPockets on Discord, 2026-11-14; Thronior agreed).
// Two groups: cards whose text names this card, and the cards this card's text names. A quoted name that is no
// card's name but is an archetype's ("Archfiend", "Blue-Eyes") stands for every card of that archetype.
// The index is built once, on the first inspect, in one pass over the card texts (a few ms on a low-end phone).
// In a deck editor each related card the player owns gets − / + to take a copy out of or put one into the deck.

const QUOTED=/["“”]([^"“”]{2,60})["“”]/g;
const key=s=>String(s).trim().toLowerCase();
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// EDOPro IsSetCard: the base archetype (low 12 bits) must match, and any sub-archetype bits must be present.
const inSet=(set,code)=>(code&0xfff)===(set&0xfff)&&(code&set)===set;

let cached=null;
export function relatedIndex(cards,archetypes=[]){
 if(cached?.cards===cards)return cached;
 const byName=new Map();
 for(const c of cards){const k=key(c.name);if(!byName.has(k))byName.set(k,c.id)}
 const sets=new Map((archetypes||[]).map(a=>[key(a.name),a.setcode]));
 const members=new Map(),archetypeMembers=set=>{
  if(!members.has(set))members.set(set,cards.filter(c=>(c.data?.setcodes||[]).some(code=>inSet(set,code))).map(c=>c.id));
  return members.get(set);
 };
 const names=new Map(),namedBy=new Map(),link=(from,to)=>{
  if(from===to)return;
  if(!names.has(from))names.set(from,new Set());names.get(from).add(to);
  if(!namedBy.has(to))namedBy.set(to,new Set());namedBy.get(to).add(from);
 };
 const cardsById=new Map(cards.map(c=>[c.id,c])),canonical=id=>byName.get(key(cardsById.get(id)?.name))??id;
 for(const c of cards){
  const from=canonical(c.id);
  for(const [,quoted] of String(c.desc||'').matchAll(QUOTED)){
   const k=key(quoted);
   if(byName.has(k))link(from,byName.get(k));
   else if(sets.has(k))for(const id of archetypeMembers(sets.get(k)))link(from,canonical(id));
  }
 }
 cached={cards,names,namedBy,canonical,byName};
 return cached;
}

// Ids by card name, so alternate arts count as one card.
export function relatedCards(index,id){
 const own=index.canonical(Number(id)),order=ids=>[...(ids||[])].filter(x=>x!==own);
 return {mentionsThis:order(index.namedBy.get(own)),mentionedByThis:order(index.names.get(own))};
}
export const relatedCount=groups=>new Set([...groups.mentionsThis,...groups.mentionedByThis]).size;

// Copies by name in a run: pool indexes owned, in the deck, and owned but out of the deck.
function counts(run,card,id){
 if(!run)return null;const target=key(card(id)?.name),selected=new Set(run.selected||[]),owned=[],inDeck=[];
 (run.pool||[]).forEach((code,i)=>{if(key(card(code)?.name)===target){owned.push(i);if(selected.has(i))inDeck.push(i)}});
 return {owned,inDeck,spare:owned.filter(i=>!selected.has(i))};
}

function tile(id,{card,image,deck}){
 const c=card(id);if(!c)return '';const n=counts(deck?.run,card,id);
 const step=n&&deck.editable&&n.owned.length?`<span class="related-step"><button type="button" class="related-remove" data-related-remove="${id}" aria-label="Remove ${html(c.name)} from deck" title="Remove from deck" ${n.inDeck.length?'':'disabled'}>−</button><b aria-label="${n.inDeck.length} in deck">${n.inDeck.length}/${n.owned.length}</b><button type="button" class="related-add" data-related-add="${id}" aria-label="Add ${html(c.name)} to deck" title="Add to deck" ${n.spare.length?'':'disabled'}>+</button></span>`:'';
 const status=n&&!step?`<small class="related-status">${n.owned.length?`${n.owned.length} owned · ${n.inDeck.length} in deck`:'Not owned'}</small>`:'';
 return `<div class="related-card${n?.inDeck.length?' in-deck':''}${n&&!n.owned.length?' not-owned':''}" data-related-card="${id}"><button type="button" class="related-art" data-related-inspect="${id}" aria-label="${html(c.name)}"><img loading="lazy" decoding="async" src="${html(image(id))}" alt=""></button><span class="related-name">${html(c.name)}</span>${step||status}</div>`;
}

export function relatedMarkup(groups,opts){
 const section=(title,ids)=>`<h4>${title} <span class="related-total">${ids.length}</span></h4>${ids.length?`<div class="related-grid">${ids.map(id=>tile(id,opts)).join('')}</div>`:'<p class="muted">None</p>'}`;
 if(!relatedCount(groups))return '<p class="related-empty muted">No other card names this card, and its text names no other card.</p>';
 return `${section('Mentions this card',groups.mentionsThis)}${section('Mentioned by this card',groups.mentionedByThis)}`;
}

// Fills the panel and keeps it in step with the deck. opts: {cards, archetypes, card, image, inspect, deck():{run,editable,toggle}|null}
export function mountRelated(panel,id,opts){
 const index=relatedIndex(opts.cards,opts.archetypes),groups=relatedCards(index,id);
 const draw=()=>{if(!panel.isConnected)return;const scroll=panel.scrollTop;panel.innerHTML=relatedMarkup(groups,{card:opts.card,image:opts.image,deck:opts.deck()});panel.scrollTop=scroll};
 panel.relatedState={opts,draw};draw();
 if(panel.dataset.relatedBound)return;panel.dataset.relatedBound='1';
 panel.addEventListener('click',async e=>{
  const {opts,draw}=panel.relatedState;
  const el=e.target.closest('[data-related-inspect],[data-related-add],[data-related-remove]');if(!el||!panel.contains(el))return;
  e.stopPropagation();e.preventDefault();
  if(el.dataset.relatedInspect){opts.inspect(Number(el.dataset.relatedInspect));return}
  const deck=opts.deck();if(!deck?.editable||el.disabled)return;
  const n=counts(deck.run,opts.card,Number(el.dataset.relatedAdd||el.dataset.relatedRemove));if(!n)return;
  const pick=el.dataset.relatedAdd?n.spare[0]:n.inDeck[n.inDeck.length-1];if(pick===undefined)return;
  el.disabled=true;
  try{await deck.toggle(pick)}catch(error){opts.error?.(error)}
  draw();
 });
}
