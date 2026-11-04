// Run progress between duels (Discord request, 2026-11-03): the run card's VICTORIES row on the opponent and shop screens,
// solo and Tag. One marker per duel of the current loop from runDuels(), so it always matches the card: won duels filled,
// bosses as diamonds, the next duel ringed in gold, on a track filled up to the next duel.
import {runDuels,bossDuel} from './run-card.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function runProgress(r,{content}){
 const round=r.round||0,{duels}=runDuels(r,{content,loop:(r.loop||0)+1,played:round});
 return duels.map((d,i)=>({n:i+1,boss:bossDuel(i+1),state:d?(d.won===false?'lost':'won'):i===round?'next':'ahead',name:d?.name||'',lp:d?.lp??null}));
}
const tip=x=>[`Duel ${x.n}`,x.name,{won:'Win',lost:'Loss',next:'Next duel'}[x.state],x.name&&x.lp!=null?`${x.lp.toLocaleString('en-US')} LP`:'',x.boss?'Boss':''].filter(Boolean).join(' · ');

export function runProgressMarkup(r,deps,{compact=false}={}){
 const list=runProgress(r,deps),wins=list.filter(x=>x.state==='won').length,at=list.findIndex(x=>x.state!=='won'),next=list[at]?.state==='next'?`, Duel ${at+1} next`:'';
 return `<div class="run-strip${compact?' compact':''}" role="img" aria-label="Run progress: ${wins} of ${list.length} victories${next}"><span class="run-strip-label">VICTORIES</span><span class="run-strip-track" style="--n:${list.length};--done:${at<0?list.length-1:at}">${list.map(x=>`<i class="${x.state}${x.boss?' boss':''}" title="${esc(tip(x))}"></i>`).join('')}</span><b class="run-strip-count">${wins} / ${list.length}</b></div>`;
}

// Adds the strip to a rendered page: a band under the header on the opponent screen. The shop has no room for a band,
// so a small one goes at the end of its first heading, and portrait screens show a second one in the header instead,
// where the longest headings would not leave room (mobile.css).
export function mountRunProgress(page,r,deps,{shop=false}={}){
 const header=page?.querySelector(':scope>header');if(!r||!header)return;
 if(!shop){header.insertAdjacentHTML('afterend',runProgressMarkup(r,deps));return}
 const markup=runProgressMarkup(r,deps,{compact:true}),heading=page.querySelector('.shop-stock>h3,.shop-layout aside>h3');
 if(heading){const label=document.createElement('span');label.className='run-strip-heading';label.append(...heading.childNodes);heading.replaceChildren(label);heading.classList.add('with-run-strip');heading.insertAdjacentHTML('beforeend',markup)}
 header.insertAdjacentHTML('afterbegin',markup);
}
