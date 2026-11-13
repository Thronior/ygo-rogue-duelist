// Shop relic locks (user, 2026-11-13): a lock on the top left of a relic's art keeps it through rerolls and into the next
// shop. Shared by the solo shop (data-do="relic-lock") and the Tag shop (data-tag="relic-lock").
const icon=on=>`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2.2" fill="currentColor"/><path d="${on?'M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7':'M8.2 10.5V7.8a3.8 3.8 0 0 1 7.3-1.5'}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
export const relicLocked=(r,x)=>x.kind==='artifact'&&!x.sold&&(r.relic_locks||[]).includes(x.id);
export const relicLockClass=(r,x)=>x.kind==='artifact'&&!x.sold?` has-relic-lock${relicLocked(r,x)?' relic-locked':''}`:'';
export function relicLockButton(r,x,i,trigger='data-do="relic-lock"'){
 if(x.kind!=='artifact'||x.sold)return '';const on=relicLocked(r,x);
 return `<button type="button" class="relic-lock" ${trigger} data-index="${i}" aria-pressed="${on}" aria-label="${on?'Unlock relic':'Lock relic'}" title="${on?'Locked: stays after rerolls and in the next shop':'Lock: keep this relic after rerolls and in the next shop'}">${icon(on)}</button>`;
}
