// Relic inspection (user request, 2026-11-11). One look for a single relic wherever it is opened (shop, duel,
// Collection, stats), and the Run relics window as a grid of icons beside one detail panel (the user's option B):
// every owned relic is visible at once and tapping an icon shows that relic.
import {relicImage,relicArtwork} from './ui-art.js';
import {cursedMarkup,curseIconFile} from './experience-ui.js';
import {levelText,levelBadge,levelDescription} from './challenge-level.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countBadge=count=>count>1?`<span class="relic-count" aria-label="${count} copies">×${count}</span>`:'';
// Shadow relics show their benefit and drawback apart, as on the shadow relic choice.
const relicKind=(content,id)=>/^cursed_/.test(id)||content.artifactInfo?.[id]?.parts?.length===2?'cursed':content.fusionMaterials?.[id]?'fused':'';
// Fusion hints (yunluo596-droid, itch.io; user 2026-11-22): a relic names every fused relic it is a piece of, with its icon
// and how many of its pieces this run owns. Undiscovered fusions (user 2026-11-23) show too, as a silhouette named "???",
// so the player knows a fusion exists and how close they are, but not what it is. The app sets the state getter:
// {found: profile.fused_relics, owned: the run's relics, or null outside a run}.
let fusionState=()=>null;
export function setFusionState(get){fusionState=get}
export function fusionHint(content,id){
 const state=fusionState()||{},found=state.found||[],owned=state.owned;
 return Object.entries(content.fusionMaterials||{}).map(([f,m])=>{if(!m?.pieces?.includes(id))return '';
  // A set with required pieces (Unstable DNA: DNA Rewrite + Kindred Bond + 1 Surgery) counts its other pieces only up
  // to the slots the required ones leave (Discord 2026-11-24: Kindred Bond + 2 Surgeries read "3 of 3" and never fused).
  const known=found.includes(f),need=m.needed||m.pieces.length,req=m.required||[],art=content.artifactInfo?.[f]?.art;
  const have=owned?req.filter(p=>owned.includes(p)).length+Math.min(need-req.length,m.pieces.filter(p=>!req.includes(p)&&owned.includes(p)).length):0;
  const line=!owned?'':owned.includes(f)?'<em>Fused this run</em>':`<em>${`You own {0} of {1}`.replace('{0}',have).replace('{1}',need)}</em>`;
  return `<div class="fusion-hint${known?'':' fusion-unknown'}">${art?`<img src="${relicImage(art)}" alt="" decoding="async">`:''}<span><small>Fusion Material for</small>${known?`<b>${esc(content.artifacts[f]?.[0]||f)}</b>`:'<b data-no-i18n>???</b>'}${line}</span></div>`}).join('');
}
// status: a short line under the name. price: markup for a price. extra: more markup under the text. action: a button.
export function relicCard(content,id,{count=1,status='',price='',extra='',action='',negated=false}={}){
 const [name,,text='']=content.artifacts[id]||[id],info=content.artifactInfo?.[id]||{},kind=relicKind(content,id);
 return `<article class="relic-card ${kind}${negated?' negated':''}" data-relic-card="${esc(id)}"><div class="relic-card-art">${relicArtwork(relicImage(info.art))}${countBadge(count)}</div><h3>${esc(name)}</h3>${status?`<b class="relic-card-status">${status}</b>`:''}${price?`<span class="relic-card-price">${price}</span>`:''}<div class="relic-card-text">${kind==='cursed'?cursedMarkup(id,text,info.parts):`<p>${esc(text)}</p>`}</div>${extra}${fusionHint(content,id)}${action}</article>`;
}
// Challenge Level 6 curses stay for the whole run, so the Relics window lists them after the relics between duels
// (user request, 2026-11-11), marked as curses so they are not taken for bought relics. In a duel the Curses window
// shows them instead. keys: run.persistent_curses, repeats counted. describe: key -> curse text.
export function permanentCurseEntries(content,keys,describe){
 const counts={};for(const key of keys||[])if(content.curses?.[key])counts[key]=(counts[key]||0)+1;
 return Object.entries(counts).map(([key,count])=>({key,count,name:content.curses[key][0]||key,text:describe(key)}));
}
const curseCard=c=>`<article class="relic-card permanent-curse" data-relic-card="curse:${esc(c.key)}"><div class="relic-card-art"><img class="relic-artwork curse-artwork" src="${esc(curseIconFile(c.key))}" alt="">${countBadge(c.count)}</div><h3>${esc(c.name)}</h3><b class="relic-card-status">PERMANENT CURSE</b><div class="relic-card-text"><p>${esc(c.text)}</p></div></article>`;
// The run's challenge level above the relics (2026-11-16), with the badges (in each level's colour) and texts of the
// level select. It folds to the badge and "Challenge level"; opened, it lists every modifier in effect, highest
// first. Open or folded is remembered on this device.
const LEVEL_OPEN_KEY='ygo-relic-level-open';
const levelOpen=()=>{try{return localStorage.getItem(LEVEL_OPEN_KEY)==='1'}catch{return false}};
export function challengeLevelStrip(level){
 level=Number(level);if(!Number.isInteger(level)||level<-1||level>=levelText.length)return '';
 const levels=level>0?Array.from({length:level},(_,i)=>level-i):[level];
 const rows=levels.map(n=>`<li${n===level?' class="current"':''}>${levelBadge(n,{colored:true})}<span>${esc(levelDescription(n))}</span></li>`).join('');
 return `<details class="run-challenge-level"${levelOpen()?' open':''}><summary>${levelBadge(level,{colored:true})}<b>Challenge level</b></summary><ul>${rows}</ul></details>`;
}
document.addEventListener('toggle',event=>{if(event.target.classList?.contains('run-challenge-level'))try{localStorage.setItem(LEVEL_OPEN_KEY,event.target.open?'1':'0')}catch{}},true);
// The icon picked last stays picked when the window is drawn again (after selling another relic).
let lastPick='';
// cards: id -> relicCard markup. counts: id -> copies owned. curses: permanentCurseEntries rows, listed after the relics.
// level: the run's challenge level, shown above the relics; omitted where the window has no run.
// pick: open on this relic (a tap on the duel relic bar, Deds 2026-11-21).
export function relicLedger(content,ids,{intro='',cards,counts=()=>1,negated=false,curses=[],level=null,pick:want=null}){
 if(want&&ids.includes(want))lastPick=want;
 const picks=[...ids,...curses.map(c=>'curse:'+c.key)],pick=picks.includes(lastPick)?lastPick:picks[0];
 const curseButtons=curses.length?`<h4 class="relic-grid-label">Permanent curses</h4>${curses.map(c=>`<button type="button" role="option" aria-selected="${'curse:'+c.key===pick}" data-relic-pick="curse:${esc(c.key)}" class="permanent-curse" aria-label="${esc(c.name)}"><img class="relic-artwork" src="${esc(curseIconFile(c.key))}" alt="" loading="lazy" decoding="async">${countBadge(c.count)}</button>`).join('')}`:'';
 const hide=(markup,id)=>markup.replace('<article ',id===pick?'<article ':'<article hidden ');
 return `<div class="relic-ledger">${intro?`<p>${intro}</p>`:''}${level==null?'':challengeLevelStrip(level)}<div class="relic-ledger-split"><div class="relic-icon-grid" role="listbox" aria-label="Run relics">${ids.map(id=>`<button type="button" role="option" aria-selected="${id===pick}" data-relic-pick="${esc(id)}" class="${relicKind(content,id)}${negated?' negated':''}" aria-label="${esc(content.artifacts[id]?.[0])}">${relicArtwork(relicImage(content.artifactInfo?.[id]?.art),'loading="lazy" decoding="async"')}${countBadge(counts(id))}</button>`).join('')}${curseButtons}</div><div class="relic-ledger-detail">${ids.map(id=>hide(cards(id),id)).join('')}${curses.map(c=>hide(curseCard(c),'curse:'+c.key)).join('')}</div></div></div>`;
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
