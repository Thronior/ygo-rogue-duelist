// Resolve only card names already present in the player-visible log text.
// Never consult hidden engine zones to enrich an entry.
const indexes=new WeakMap();
const escapePattern=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function logCards(text,cards){
 let index=indexes.get(cards);
 if(!index){const names=new Map();for(const card of cards)if(card.name&&!names.has(card.name))names.set(card.name,card.id);index={names,pattern:new RegExp('(^|[^\\p{L}\\p{N}])('+[...names.keys()].sort((a,b)=>b.length-a.length).map(escapePattern).join('|')+')(?=$|[^\\p{L}\\p{N}])','gu')};indexes.set(cards,index)}
 index.pattern.lastIndex=0;return [...new Set([...String(text).matchAll(index.pattern)].map(match=>index.names.get(match[2])))];
}
export function duelLogMarkup(logs,cards){
 return `<div class="duel-log"><p class="log-help">Tap a highlighted action to read the cards involved.</p>${logs.map(text=>{const ids=logCards(text,cards);return ids.length?`<button class="log-action" data-do="log-action" data-cards="${ids.join(',')}"><span>${esc(text)}</span><small>Card details ›</small></button>`:`<p class="log-event">${esc(text)}</p>`}).join('')||'<p>No actions yet.</p>'}</div>`;
}
