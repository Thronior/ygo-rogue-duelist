// Shop relic locks (user, 2026-11-13): a lock on the top left of a relic's art keeps it through rerolls and into the next
// shop. Shared by the solo shop (data-do="relic-lock") and the Tag shop (data-tag="relic-lock").
const icon=on=>`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.2" fill="currentColor"/><path d="${on?'M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7':'M8.2 10.5V7.8a3.8 3.8 0 0 1 7.3-1.5'}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
export const relicLocked=(r,x)=>x.kind==='artifact'&&!x.sold&&(r.relic_locks||[]).includes(x.id);
export const relicLockClass=(r,x)=>x.kind==='artifact'&&!x.sold?` has-relic-lock${relicLocked(r,x)?' relic-locked':''}`:'';
export function relicLockButton(r,x,i,trigger='data-do="relic-lock"'){
 if(x.kind!=='artifact'||x.sold)return '';const on=relicLocked(r,x);
 return `<button type="button" class="relic-lock" ${trigger} data-index="${i}" aria-pressed="${on}" aria-label="${on?'Unlock relic':'Lock relic'}" title="${on?'Locked: stays after rerolls and in the next shop':'Lock: keep this relic after rerolls and in the next shop'}">${icon(on)}</button>`;
}

// Shop relic banish (Discord suggestion, user 2026-11-24): a cross on the top right of a relic's art. The first tap arms it
// and shows a "Banish" confirm button over the art; that button pays and the shop never offers the relic again this run.
// Solo (data-do) and Tag (data-tag) shops. price = the price markup (coins, or LP with Blood Toll).
export function relicBanishButton(x,i,armed,price,affordable,attr='data-do'){
 if(x.kind!=='artifact'||x.sold)return '';
 const cross=`<button type="button" class="relic-banish${armed?' armed':''}" ${attr}="relic-banish-arm" data-index="${i}" aria-pressed="${armed}" aria-label="${armed?'Keep relic':'Banish relic'}" title="${armed?'Keep this relic':'Banish: never offer this relic again this run'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>`;
 return cross+(armed?`<button type="button" class="relic-banish-confirm${affordable?'':' fx-cant-afford'}" ${attr}="relic-banish" data-index="${i}"><b>Banish</b><span class="relic-banish-price">${price}</span></button>`:'');
}
