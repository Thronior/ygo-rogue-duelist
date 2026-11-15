// Run progress between duels (Discord request, 2026-11-03): the run card's VICTORIES row on the opponent and shop screens,
// solo and Tag. One marker per duel of the current loop from runDuels(), so it always matches the card: won duels filled,
// bosses as diamonds, the next duel ringed in gold, on a track filled up to the next duel.
import {runDuels,bossDuel} from './run-card.js';
import {curseDescription,curseIconFile} from './experience-ui.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function runProgress(r,{content}){
 const round=r.round||0,{duels}=runDuels(r,{content,loop:(r.loop||0)+1,played:round});
 return duels.map((d,i)=>({n:i+1,boss:bossDuel(i+1),state:d?(d.won===false?'lost':'won'):i===round?'next':'ahead',name:d?.name||'',lp:d?.lp??null}));
}
const tip=x=>[`Duel ${x.n}`,x.name,{won:'Win',lost:'Loss',next:'Next duel'}[x.state],x.name&&x.lp!=null?`${x.lp.toLocaleString('en-US')} LP`:'',x.boss?'Boss':''].filter(Boolean).join(' · ');

export function runProgressMarkup(r,deps,{compact=false}={}){
 const list=runProgress(r,deps),wins=list.filter(x=>x.state==='won').length,at=list.findIndex(x=>x.state!=='won'),next=list[at]?.state==='next'?`, Duel ${at+1} next`:'';
 // With a dialog to open, the strip is the button for the next boss preview (bossPreview below).
 const preview=deps.dialog&&nextBoss(r)?` role="button" tabindex="0" data-boss-preview title="Next boss"`:` role="img"`;
 return `<div class="run-strip${compact?' compact':''}${preview.includes('button')?' has-boss-preview':''}"${preview} aria-label="Run progress: ${wins} of ${list.length} victories${next}"><span class="run-strip-label">VICTORIES</span><span class="run-strip-track" style="--n:${list.length};--done:${at<0?list.length-1:at}">${list.map(x=>`<i class="${x.state}${x.boss?' boss':''}" title="${esc(tip(x))}"></i>`).join('')}</span><b class="run-strip-count">${wins} / ${list.length}</b></div>`;
}

// Adds the strip to a rendered page: a band under the header on the opponent screen. The shop has no room for a band,
// so a small one goes at the end of its first heading, and portrait screens show a second one in the header instead,
// where the longest headings would not leave room (mobile.css).
export function mountRunProgress(page,r,deps,{shop=false}={}){
 const header=page?.querySelector(':scope>header');if(!r||!header)return;
 if(!shop){header.insertAdjacentHTML('afterend',runProgressMarkup(r,deps));bindBossPreview(page,r,deps);return}
 const markup=runProgressMarkup(r,deps,{compact:true}),heading=page.querySelector('.shop-stock>h3,.shop-layout aside>h3');
 if(heading){const label=document.createElement('span');label.className='run-strip-heading';label.append(...heading.childNodes);heading.replaceChildren(label);heading.classList.add('with-run-strip');heading.insertAdjacentHTML('beforeend',markup)}
 header.insertAdjacentHTML('afterbegin',markup);bindBossPreview(page,r,deps);
}

// Next boss preview (Kzulu on Discord, 2026-11-15): tapping the strip shows the boss of the current stretch and its
// curses, rolled when the stretch began (boss_preview.py keeps it in run.next_boss). Solo only: Tag passes no dialog.
export function nextBoss(r){
 const plan=r?.next_boss,round=r?.round||0;
 if(!plan||r.history_mode==='tag'||r.encore_active||round>=9||plan.loop!==(r.loop||0)||plan.round!==round-round%3+2)return null;
 // LVL 6: the first boss's curse depends on the curse taken in Duel 1, so it follows the chosen opponent's.
 const pending=plan.curses==null,curses=pending?plan.variants?.[(r.route_curses?.[r.opponent]||[]).join(',')]:plan.curses;
 return Array.isArray(curses)?{opponent:plan.opponent,duel:plan.round+1,curses,pending}:null;
}
export function bossPreviewMarkup(r,{content}){
 const boss=nextBoss(r),c=boss&&content.characters[boss.opponent];if(!c)return '';
 // Later loops stack many copies of a curse: each is listed once with its count.
 const counts=new Map();for(const key of boss.curses)counts.set(key,(counts.get(key)||0)+1);
 const curses=[...counts].map(([key,n])=>`<li><img src="${curseIconFile(key)}" alt=""><div><b>${esc(content.curses[key]?.[0]||key)}${n>1?` ×${n}`:''}</b><p>${esc(curseDescription(content,key,r.challenge_level))}</p></div></li>`).join('');
 return `<div class="boss-preview"><div class="boss-preview-hero" style="background-image:url('assets/${esc(c.background||`character-backgrounds/${boss.opponent}.jpg`)}')"><img src="assets/${esc(c.sprite)}" alt=""><div><small>Duel ${boss.duel}</small><h3>${esc(c.name)}</h3></div></div>${curses?`<ul class="boss-preview-curses" aria-label="Boss curses">${curses}</ul>`:'<p class="muted">No curses.</p>'}${boss.pending?'<p class="muted">Depends on the curse you take in Duel 1.</p>':''}</div>`;
}
export function bossPreview(r,deps){const body=bossPreviewMarkup(r,deps);if(body)deps.dialog('Next boss',body)}
function bindBossPreview(page,r,deps){
 if(!deps.dialog)return;
 for(const strip of page.querySelectorAll('.run-strip[data-boss-preview]')){
  strip.addEventListener('click',e=>{e.stopPropagation();bossPreview(r,deps)});
  strip.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();bossPreview(r,deps)}});
 }
}
