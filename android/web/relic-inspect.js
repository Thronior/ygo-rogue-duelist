// Relic inspection (user request, 2026-11-11). One look for a single relic wherever it is opened (shop, duel,
// Collection, stats), and the Run relics window as a grid of icons beside one detail panel (the user's option B):
// every owned relic is visible at once and tapping an icon shows that relic.
import {relicImage,relicArtwork} from './ui-art.js';
import {cursedMarkup,curseIconFile} from './experience-ui.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countBadge=count=>count>1?`<span class="relic-count" aria-label="${count} copies">×${count}</span>`:'';
// Cursed relics show their benefit and drawback apart, as on the cursed relic choice.
const relicKind=(content,id)=>/^cursed_/.test(id)||content.artifactInfo?.[id]?.parts?.length===2?'cursed':content.fusionMaterials?.[id]?'fused':'';
// status: a short line under the name. price: markup for a price. extra: more markup under the text. action: a button.
export function relicCard(content,id,{count=1,status='',price='',extra='',action='',negated=false}={}){
 const [name,,text='']=content.artifacts[id]||[id],info=content.artifactInfo?.[id]||{},kind=relicKind(content,id);
 return `<article class="relic-card ${kind}${negated?' negated':''}" data-relic-card="${esc(id)}"><div class="relic-card-art">${relicArtwork(relicImage(info.art))}${countBadge(count)}</div><h3>${esc(name)}</h3>${status?`<b class="relic-card-status">${status}</b>`:''}${price?`<span class="relic-card-price">${price}</span>`:''}<div class="relic-card-text">${kind==='cursed'?cursedMarkup(id,text,info.parts):`<p>${esc(text)}</p>`}</div>${extra}${action}</article>`;
}
// Challenge Level 6 curses stay for the whole run, so the Relics window lists them after the relics between duels
// (user request, 2026-11-11), marked as curses so they are not taken for bought relics. In a duel the Curses window
// shows them instead. keys: run.persistent_curses, repeats counted. describe: key -> curse text.
export function permanentCurseEntries(content,keys,describe){
 const counts={};for(const key of keys||[])if(content.curses?.[key])counts[key]=(counts[key]||0)+1;
 return Object.entries(counts).map(([key,count])=>({key,count,name:content.curses[key][0]||key,text:describe(key)}));
}
const curseCard=c=>`<article class="relic-card permanent-curse" data-relic-card="curse:${esc(c.key)}"><div class="relic-card-art"><img class="relic-artwork curse-artwork" src="${esc(curseIconFile(c.key))}" alt="">${countBadge(c.count)}</div><h3>${esc(c.name)}</h3><b class="relic-card-status">PERMANENT CURSE</b><div class="relic-card-text"><p>${esc(c.text)}</p></div></article>`;
// The icon picked last stays picked when the window is drawn again (after selling another relic).
let lastPick='';
// cards: id -> relicCard markup. counts: id -> copies owned. curses: permanentCurseEntries rows, listed after the relics.
export function relicLedger(content,ids,{intro='',cards,counts=()=>1,negated=false,curses=[]}){
 const picks=[...ids,...curses.map(c=>'curse:'+c.key)],pick=picks.includes(lastPick)?lastPick:picks[0];
 const curseButtons=curses.length?`<h4 class="relic-grid-label">Permanent curses</h4>${curses.map(c=>`<button type="button" role="option" aria-selected="${'curse:'+c.key===pick}" data-relic-pick="curse:${esc(c.key)}" class="permanent-curse" aria-label="${esc(c.name)}"><img class="relic-artwork" src="${esc(curseIconFile(c.key))}" alt="" loading="lazy" decoding="async">${countBadge(c.count)}</button>`).join('')}`:'';
 const hide=(markup,id)=>markup.replace('<article ',id===pick?'<article ':'<article hidden ');
 return `<div class="relic-ledger">${intro?`<p>${intro}</p>`:''}<div class="relic-ledger-split"><div class="relic-icon-grid" role="listbox" aria-label="Run relics">${ids.map(id=>`<button type="button" role="option" aria-selected="${id===pick}" data-relic-pick="${esc(id)}" class="${relicKind(content,id)}${negated?' negated':''}" aria-label="${esc(content.artifacts[id]?.[0])}">${relicArtwork(relicImage(content.artifactInfo?.[id]?.art),'loading="lazy" decoding="async"')}${countBadge(counts(id))}</button>`).join('')}${curseButtons}</div><div class="relic-ledger-detail">${ids.map(id=>hide(cards(id),id)).join('')}${curses.map(c=>hide(curseCard(c),'curse:'+c.key)).join('')}</div></div></div>`;
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-relic-pick]');if(!button)return;
 const ledger=button.closest('.relic-ledger');if(!ledger)return;
 lastPick=button.dataset.relicPick;
 for(const other of ledger.querySelectorAll('[data-relic-pick]'))other.setAttribute('aria-selected',String(other===button));
 let shown=null;for(const card of ledger.querySelectorAll('[data-relic-card]')){card.hidden=card.dataset.relicCard!==lastPick;if(!card.hidden)shown=card}
 // On a phone the panel sits under the icons: bring it into view.
 shown?.scrollIntoView({block:'nearest'});
});
