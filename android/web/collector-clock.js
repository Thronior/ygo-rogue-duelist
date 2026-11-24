// Ultimate Collector turn clock, pauses and the prize screen's deck view (CITYDRIVER, user 2026-11-24). The rooms
// Worker runs the clock (multiplayer/cloudflare/hub.mjs): plays add time, a timeout loses only that duel, and a pause the
// opponent accepted freezes the clock. These helpers only draw it, so they stay cheap: no timers or DOM of their own.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The timer turns red at a minute left.
export const LOW_TIME=60000;
// Mirrors PAUSE_RETRY in hub.mjs: how long a declined asker waits before asking again.
export const PAUSE_RETRY=60000;
export const clockText=ms=>{const sec=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
export const isLow=ms=>Math.ceil(ms/1000)*1000<=LOW_TIME;
// The pause as one player sees it, or null when the server has no pauses (older Worker, Draft rooms).
export function pauseInfo(p,now,seat){
 if(!p||!Array.isArray(p.left))return null;
 const paused=p.until!=null&&p.until>now,ask=p.ask&&p.ask.until>now?p.ask:null,left=p.left[seat]??0;
 const retry=p.retryAt?.[seat]||0,declined=!paused&&!ask&&retry>now&&retry-now>PAUSE_RETRY-5000;
 return {paused,mine:paused&&p.by===seat,remaining:paused?p.until-now:0,asking:!!ask&&ask.seat===seat,asked:!!ask&&ask.seat!==seat,askLeft:ask?ask.until-now:0,left,declined,
  canAsk:!paused&&!ask&&left>0&&(p.asks?.[seat]??1)>0&&now>=retry,time:p.time||180000};
}
// Allowance an away opponent has used, leaving out time inside an accepted pause (the hub never charges it).
export function awayCharged(now,chargeFrom,p){
 let away=Math.max(0,now-chargeFrom);
 if(p?.from!=null&&p.until!=null){const a=Math.max(p.from,chargeFrom),b=Math.min(now,p.until);if(b>a)away-=b-a}
 return away;
}
// The bar at the top of the duel: an ask to answer, the asker waiting, or the running pause. `key` changes only when
// the buttons change, so the caller redraws the bar then and only updates the countdown every second.
export function pauseBar(info){
 if(!info)return null;
 if(info.asked)return {key:'asked',text:'Your opponent asks for a pause of up to 3 minutes.',buttons:[['Accept','pause-accept'],['Decline','pause-decline']]};
 if(info.asking)return {key:'asking',text:'Pause requested. Waiting for your opponent…',buttons:[]};
 if(info.paused)return {key:info.mine?'mine':'theirs',text:'Duel paused',clock:clockText(info.remaining),buttons:info.mine?[['Resume','pause-resume']]:[]};
 if(info.declined)return {key:'declined',text:'Your opponent declined the pause.',buttons:[]};
 return null;
}
export function pauseBarMarkup(bar){
 return `<span class="collector-pause-text">${esc(bar.text)}</span>${bar.clock?` <b class="collector-pause-clock">${bar.clock}</b>`:''}${bar.buttons.map(([label,action])=>`<button type="button" data-collector="${action}">${esc(label)}</button>`).join('')}`;
}
// Your own deck on the prize screen, so you pick cards that fit it: one tile per card with its copies, Monsters,
// then Spells, then Traps, each by name. Tapping a tile opens the card (data-collector="inspect").
export function ownDeckMarkup(deck,lookup,image){
 const kind=c=>c?.data?.type&1?0:c?.data?.type&2?1:2;
 const section=(title,ids)=>{
  const counts=new Map();for(const id of ids||[])counts.set(id,(counts.get(id)||0)+1);
  const rows=[...counts].map(([id,n])=>({id,n,c:lookup(id)})).sort((a,b)=>kind(a.c)-kind(b.c)||String(a.c?.name||'').localeCompare(String(b.c?.name||'')));
  return `<h3>${esc(title)} <span>${(ids||[]).length}</span></h3>${rows.length?`<div class="cardgrid collector-own-grid">${rows.map(({id,n,c})=>`<button class="cardbtn" data-collector="inspect" data-id="${id}"><img src="${image(id)}" loading="lazy" draggable="false" alt=""><span>${esc(c?.name||'')}</span>${n>1?`<b class="collector-own-count">×${n}</b>`:''}</button>`).join('')}</div>`:''}`;
 };
 return `<section class="collector-own-deck" aria-label="Your deck">${section('Main Deck',deck?.main)}${deck?.side?.length?section('Side Deck',deck.side):''}${deck?.extra?.length?section('Fusion Deck',deck.extra):''}</section>`;
}
